from flask import Flask, render_template, request, jsonify
from api_client import BirdeyeAPIClient
from data_processor import process_token_list
import logging
from apscheduler.schedulers.background import BackgroundScheduler

# Configuration du logging plus détaillée
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration
api_key = "77e7ad01541f415d99238b246b59294f"
client = BirdeyeAPIClient(api_key)
token_data = []

# Options de tri disponibles pour l'API
SORT_OPTIONS = {
	'volume': 'Volume 24h',
	'liquidity': 'Liquidité',
	'mcap': 'Market Cap'
}

def fetch_token_data(sort_by='volume', force_refresh=False):
    logger.info(f"Début de fetch_token_data avec sort_by={sort_by}, force_refresh={force_refresh}")
    try:
        # Récupération des tokens
        tokens = client.get_all_tokens(
            total_desired=500,
            use_cache=not force_refresh
        )
        
        if not tokens:
            logger.error("Aucun token récupéré de l'API")
            return
        
        logger.info(f"Tokens bruts récupérés: {len(tokens)}")
        
        # Traitement des données
        df = process_token_list(tokens)
        logger.info(f"DataFrame après process_token_list: {len(df)} lignes")
        
        # Conversion en dictionnaire
        global token_data
        token_data = df.to_dict('records')
        logger.info(f"Données converties en dictionnaire: {len(token_data)} tokens")
        
        # Afficher un exemple de token pour debug
        if token_data:
            logger.info(f"Exemple de token: {token_data[0]}")
        
        # Dans la fonction fetch_token_data, après avoir récupéré les tokens
        logger.info(f"Premier token brut: {tokens[0] if tokens else 'Aucun token'}")
        
    except Exception as e:
        logger.exception("Erreur dans fetch_token_data:")
        raise

@app.route('/')
def index():
    logger.info(f"Accès à la route '/' - Nombre de tokens disponibles: {len(token_data)}")
    sort_by = request.args.get('sort', 'performance')
    sort_order = request.args.get('order', 'desc')
    api_sort = request.args.get('api_sort', 'volume')
    
    # Si le tri API a changé, rafraîchir les données
    if api_sort != getattr(app, 'current_api_sort', None):
        logger.info(f"Changement de tri API: {getattr(app, 'current_api_sort', None)} -> {api_sort}")
        app.current_api_sort = api_sort
        fetch_token_data(api_sort)
    
    sorted_data = sorted(token_data, 
                        key=lambda x: float(x.get(sort_by, 0) or 0),
                        reverse=(sort_order == 'desc'))
    
    logger.info(f"Données triées envoyées au template: {len(sorted_data)} tokens")
    
    return render_template('index.html', 
                         tokens=sorted_data, 
                         sort_by=sort_by, 
                         sort_order=sort_order,
                         api_sort=api_sort,
                         sort_options=SORT_OPTIONS)


@app.route('/traders')
def traders_view():
    """Affiche la page des traders sans données"""
    return render_template('traders.html', traders=None)

@app.route('/api/traders')
def get_traders_data():
    """API endpoint pour récupérer les données des traders"""
    sort_by = request.args.get('sort_by', 'PnL')
    sort_type = request.args.get('sort_type', 'desc')
    time_range = request.args.get('type', '1W')
    
    try:
        traders_data = client.get_traders_data(
            sort_by=sort_by,
            sort_type=sort_type,
            time_range=time_range,
            total_desired=100  # Nombre total de traders souhaité
        )
        return jsonify({
            'success': True,
            'data': traders_data
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des traders: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/refresh-cache')
def refresh_cache():
    try:
        fetch_token_data(force_refresh=True)
        return jsonify({
            'success': True,
            'message': 'Cache rafraîchi avec succès'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/compare', methods=['POST'])
def compare_tokens():
	token_addresses = request.json['addresses']
	compared_tokens = [t for t in token_data if t['address'] in token_addresses]
	return jsonify(compared_tokens)

if __name__ == '__main__':
    # Initialiser les données une seule fois au démarrage
    logger.info("Démarrage de l'application")
    app.current_api_sort = 'volume'
    fetch_token_data(app.current_api_sort)
    
    # Configurer le scheduler
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        func=lambda: fetch_token_data(app.current_api_sort), 
        trigger="interval", 
        minutes=30
    )
    scheduler.start()
    
    # Démarrer Flask
    app.run(debug=False)