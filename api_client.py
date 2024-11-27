import requests
from requests.exceptions import RequestException
import logging
import time
import pandas as pd
from datetime import datetime, timedelta
import os

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
        self.rate_limit = 1000
        self.min_request_interval = 0.06
        self.cache_file = 'data/token_cache.csv'
        self.cache_duration = timedelta(minutes=30)
        self.request_count = 0
        self.last_reset = time.time()
        os.makedirs('data', exist_ok=True)

    def check_rate_limit(self):
        """Vérifie et gère la limite de taux"""
        current_time = time.time()
        if current_time - self.last_reset >= 60:
            self.request_count = 0
            self.last_reset = current_time
        
        if self.request_count >= self.rate_limit:
            wait_time = 60 - (current_time - self.last_reset)
            if wait_time > 0:
                logger.warning(f"Rate limit atteint, attente de {wait_time:.2f}s")
                time.sleep(wait_time)
                self.request_count = 0
                self.last_reset = time.time()

    def get_token_list(self, offset=0, limit=50):
        """Récupère la liste des tokens"""
        cache_key = f"{offset}-{limit}"
        if cache_key in self.cache:
            logger.info("Returning cached data")
            return self.cache[cache_key]

        self.check_rate_limit()
        self.request_count += 1

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

    def get_token_overview(self, address):
        """Récupère les données détaillées d'un token"""
        self.check_rate_limit()
        self.request_count += 1

        endpoint = f"{self.base_url}/defi/token_overview"
        params = {"address": address}
        
        def request_func():
            response = requests.get(
                endpoint, 
                headers=self.headers, 
                params=params,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        
        response = retry_request(request_func)
        if response and response.get('success'):
            data = response.get('data', {})
            logger.info(f"Données overview reçues pour {address}: {data}")  # AJOUTE CE LOG
       
            return {
                'holder_count': data.get('holder', 0),
                'unique_wallet_24h': data.get('uniqueWallet24h', 0),
                'unique_wallet_change': data.get('uniqueWallet24hChangePercent', 0),
                'priceChange24hPercent': data.get('priceChange24hPercent', 0)  # Ajout de la variation de prix
            }
        return None

    def get_all_tokens(self, total_desired=500, use_cache=True):
        """Récupère tous les tokens avec gestion du cache"""
        start_time = time.time()
        request_count = 0

        if use_cache:
            cached_data = self.load_from_cache()
            if cached_data:
                logger.info("Utilisation des données du cache")
                return cached_data

        all_tokens = []
        batch_size = min(50, self.rate_limit // 2)
        
        for offset in range(0, total_desired, batch_size):
            logger.info(f"Récupération des tokens {offset} à {offset + batch_size}...")
            response = self.get_token_list(offset=offset, limit=batch_size)
            request_count += 1
            
            if not response.get('success'):
                logger.error(f"Erreur lors de la récupération des tokens: {response.get('error')}")
                break
            
            tokens = response.get('data', {}).get('tokens', [])
            if not tokens:
                break

            # Traitement par batch pour les overviews
            for token in tokens:
                logger.info(f"Récupération des holders pour {token['symbol']}")
                overview_data = self.get_token_overview(token['address'])
                request_count += 1
                if overview_data:
                    token.update(overview_data)
                time.sleep(self.min_request_interval)
            
            all_tokens.extend(tokens)
            
            if len(all_tokens) >= total_desired:
                all_tokens = all_tokens[:total_desired]
                break

            time.sleep(self.min_request_interval)

        # Statistiques finales
        end_time = time.time()
        duration = end_time - start_time
        rpm = (request_count / duration) * 60
        
        logger.info(f"""
        Statistiques de récupération:
        - Temps total: {duration:.2f}s
        - Requêtes totales: {request_count}
        - RPM effectif: {rpm:.2f}
        - Tokens récupérés: {len(all_tokens)}
        """)

        # Sauvegarder dans le cache
        if all_tokens:
            self.save_to_cache(all_tokens)
        
        return all_tokens

    def save_to_cache(self, tokens):
        """Sauvegarde les données dans le cache CSV"""
        try:
            df = pd.DataFrame(tokens)
            df['cache_timestamp'] = datetime.now()
            df.to_csv(self.cache_file, index=False)
            logger.info(f"Données sauvegardées dans le cache ({len(tokens)} tokens)")
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde du cache: {e}")

    def load_from_cache(self):
        """Charge les données depuis le cache CSV"""
        try:
            if not os.path.exists(self.cache_file):
                return None

            df = pd.read_csv(self.cache_file)
            cache_timestamp = pd.to_datetime(df['cache_timestamp'].iloc[0])
            
            if datetime.now() - cache_timestamp > self.cache_duration:
                logger.info("Cache expiré")
                return None

            tokens = df.drop('cache_timestamp', axis=1).to_dict('records')
            logger.info(f"Données chargées depuis le cache ({len(tokens)} tokens)")
            return tokens

        except Exception as e:
            logger.error(f"Erreur lors du chargement du cache: {e}")
            return None