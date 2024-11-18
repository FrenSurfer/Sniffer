from flask import Flask, render_template, request, jsonify
from api_client import BirdeyeAPIClient
from data_processor import process_token_list
import logging
from apscheduler.schedulers.background import BackgroundScheduler

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration
api_key = "7817826158dc4340acbb4468ab7af7a4"
client = BirdeyeAPIClient(api_key)
token_data = []

# Options de tri disponibles pour l'API
SORT_OPTIONS = {
    'volume': 'Volume 24h',
    'liquidity': 'Liquidité',
    'mcap': 'Market Cap'
}

def fetch_token_data(sort_by='volume'):
    logger.info(f"Récupération des données des tokens (tri par {sort_by})...")
    try:
        tokens = client.get_all_tokens(total_desired=500)
        
        if not tokens:
            logger.error("Aucun token récupéré")
            return
        
        logger.info(f"Nombre total de tokens récupérés: {len(tokens)}")
        
        df = process_token_list(tokens)
        global token_data
        token_data = df.to_dict('records')
        logger.info(f"Données mises à jour. {len(token_data)} tokens affichés.")
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des données: {str(e)}")
        logger.exception(e)

@app.route('/')
def index():
    sort_by = request.args.get('sort', 'performance')
    sort_order = request.args.get('order', 'desc')
    api_sort = request.args.get('api_sort', 'volume')
    
    # Si le tri API a changé, rafraîchir les données
    if api_sort != getattr(app, 'current_api_sort', None):
        app.current_api_sort = api_sort
        fetch_token_data(api_sort)
    
    sorted_data = sorted(token_data, 
                        key=lambda x: float(x.get(sort_by, 0) or 0),
                        reverse=(sort_order == 'desc'))
    
    return render_template('index.html', 
                         tokens=sorted_data, 
                         sort_by=sort_by, 
                         sort_order=sort_order,
                         api_sort=api_sort,
                         sort_options=SORT_OPTIONS)

@app.route('/compare', methods=['POST'])
def compare_tokens():
    token_addresses = request.json['addresses']
    compared_tokens = [t for t in token_data if t['address'] in token_addresses]
    return jsonify(compared_tokens)

if __name__ == '__main__':
    # Initialiser les données une seule fois au démarrage
    app.current_api_sort = 'volume'
    fetch_token_data(app.current_api_sort)
    
    # Configurer le scheduler pour les mises à jour
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        func=lambda: fetch_token_data(app.current_api_sort), 
        trigger="interval", 
        minutes=10
    )
    scheduler.start()
    
    # Démarrer Flask sans le mode debug
    app.run(debug=False)