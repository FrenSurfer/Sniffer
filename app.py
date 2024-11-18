from flask import Flask, render_template, request
from api_client import BirdeyeAPIClient
from data_processor import process_token_list
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

api_key = "7817826158dc4340acbb4468ab7af7a4"
client = BirdeyeAPIClient(api_key)
token_data = []

def fetch_token_data():
    logger.info("Récupération des données des tokens...")
    try:
        tokens = client.get_all_tokens(total_desired=200)
        
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
    
    sorted_data = sorted(token_data, 
                        key=lambda x: float(x.get(sort_by, 0) or 0),
                        reverse=(sort_order == 'desc'))
    
    return render_template('index.html', 
                         tokens=sorted_data, 
                         sort_by=sort_by, 
                         sort_order=sort_order)

if __name__ == '__main__':
    fetch_token_data()
    app.run(debug=True)