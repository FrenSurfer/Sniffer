from flask import Flask, render_template, request, jsonify
from api_client import BirdeyeAPIClient
from data_processor import process_token_list
import logging
from apscheduler.schedulers.background import BackgroundScheduler

# Logging configuration
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Config
api_key = "77e7ad01541f415d99238b246b59294f"
client = BirdeyeAPIClient(api_key)
token_data = []

# API sort options
SORT_OPTIONS = {
	'volume': 'Volume 24h',
	'liquidity': 'Liquidity',
	'mcap': 'Market Cap'
}

def fetch_token_data(sort_by='volume', force_refresh=False):
    logger.info(f"fetch_token_data start sort_by={sort_by}, force_refresh={force_refresh}")
    try:
        tokens = client.get_all_tokens(
            total_desired=500,
            use_cache=not force_refresh
        )
        
        if not tokens:
            logger.error("No tokens from API")
            return
        
        logger.info(f"Raw tokens fetched: {len(tokens)}")
        
        df = process_token_list(tokens)
        logger.info(f"DataFrame after process_token_list: {len(df)} rows")
        
        global token_data
        token_data = df.to_dict('records')
        logger.info(f"Data converted to dict: {len(token_data)} tokens")
        
        if token_data:
            logger.info(f"Sample token: {token_data[0]}")
        
        logger.info(f"First raw token: {tokens[0] if tokens else 'None'}")
        
    except Exception as e:
        logger.exception("Error in fetch_token_data:")
        raise

@app.route('/')
def index():
    logger.info(f"Route '/' - tokens available: {len(token_data)}")
    sort_by = request.args.get('sort', 'volume')
    sort_order = request.args.get('order', 'desc')
    api_sort = request.args.get('api_sort', 'volume')
    
    if api_sort != getattr(app, 'current_api_sort', None):
        logger.info(f"API sort change: {getattr(app, 'current_api_sort', None)} -> {api_sort}")
        app.current_api_sort = api_sort
        fetch_token_data(api_sort)
    
    sorted_data = sorted(token_data, 
                        key=lambda x: float(x.get(sort_by, 0) or 0),
                        reverse=(sort_order == 'desc'))
    
    logger.info(f"Sorted data sent to template: {len(sorted_data)} tokens")
    
    return render_template('index.html', 
                         tokens=sorted_data, 
                         sort_by=sort_by, 
                         sort_order=sort_order,
                         api_sort=api_sort,
                         sort_options=SORT_OPTIONS)


@app.route('/refresh-cache')
def refresh_cache():
    try:
        fetch_token_data(force_refresh=True)
        return jsonify({
            'success': True,
            'message': 'Cache refreshed successfully'
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
    logger.info("Starting application")
    app.current_api_sort = 'volume'
    fetch_token_data(app.current_api_sort)
    
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        func=lambda: fetch_token_data(app.current_api_sort), 
        trigger="interval", 
        minutes=30
    )
    scheduler.start()
    
    app.run(debug=False)