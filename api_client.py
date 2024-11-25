import requests
from requests.exceptions import RequestException
import logging
import time
import pickle

logger = logging.getLogger(__name__)

def retry_request(func, retries=3, backoff_factor=0.3):
    for attempt in range(retries):
        try:
            return func()
        except RequestException as e:
            wait = backoff_factor * (2 ** attempt)
            logger.warning(f"Request failed: {e}. Retrying in {wait} seconds...")
            time.sleep(wait)
    logger.error("Max retries reached. Request failed.")
    return None

class BirdeyeAPIClient:
    def __init__(self, api_key):
        self.base_url = "https://public-api.birdeye.so"
        self.headers = {
            "accept": "application/json",
            "X-API-KEY": api_key
        }
        self.cache = {}
        self.rate_limit = 1000  # Nouvelle limite RPM
        self.min_request_interval = 0.06

    def get_token_list(self, offset=0, limit=50):
        cache_key = f"{offset}-{limit}"
        if cache_key in self.cache:
            logger.info("Returning cached data")
            return self.cache[cache_key]

        endpoint = f"{self.base_url}/defi/tokenlist"
        params = {
            "sort_by": "v24hUSD",
            "sort_type": "desc",
            "offset": str(offset),
            "limit": str(limit)
        }
        
        def request_func():
            response = requests.get(endpoint, headers=self.headers, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        
        response = retry_request(request_func)
        if response is None:
            return {"success": False, "error": "Failed after retries"}
        
        self.cache[cache_key] = response
        return response

    def get_all_tokens(self, total_desired=500, use_cache=True):
        if use_cache:
            cached_data = self.load_from_cache()
            if cached_data:
                logger.info("Loaded tokens from cache.")
                return cached_data

        all_tokens = []
        offset = 0
        limit = 50  # On garde 50 par requête pour la stabilité
        
        while len(all_tokens) < total_desired:
            logger.info(f"Récupération des tokens {offset} à {offset + limit}...")
            response = self.get_token_list(offset=offset, limit=limit)
            
            if not response.get('success'):
                logger.error(f"Erreur lors de la récupération des tokens: {response.get('error')}")
                break
                
            tokens = response.get('data', {}).get('tokens', [])
            if not tokens:  # Plus de tokens disponibles
                break
                
            all_tokens.extend(tokens)
            offset += limit
            
            time.sleep(self.min_request_interval)  # Pause minimale entre les requêtes
            
            if len(all_tokens) >= total_desired:
                all_tokens = all_tokens[:total_desired]
                break

        logger.info(f"Total des tokens récupérés: {len(all_tokens)}")
        self.save_to_cache(all_tokens)
        return all_tokens

    def save_to_cache(self, data, filename='__pycache__/token_cache.pkl'):
        cache_data = {
            'timestamp': time.time(),
            'data': data
        }
        with open(filename, 'wb') as f:
            pickle.dump(cache_data, f)
        logger.info("Data saved to cache.")

    def load_from_cache(self, filename='__pycache__/token_cache.pkl', max_age=60):  # Réduit à 60 secondes
        try:
            with open(filename, 'rb') as f:
                cache_data = pickle.load(f)
            current_time = time.time()
            cache_age = current_time - cache_data['timestamp']
            logger.info(f"Cache age: {cache_age} seconds")
            if cache_age < max_age:
                logger.info("Using cached data.")
                return cache_data['data']
            else:
                logger.info("Cache is too old.")
                return None
        except (FileNotFoundError, EOFError):
            logger.info("Cache file not found or empty.")
            return None