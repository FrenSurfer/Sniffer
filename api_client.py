import requests
from requests.exceptions import RequestException
import logging
import time
import pickle
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
        self.rate_limit = 1000  # Nouvelle limite RPM
        self.min_request_interval = 0.06
        self.cache_file = 'data/token_cache.csv'
        self.cache_duration = timedelta(minutes=30)  # Durée de validité du cache
        os.makedirs('data', exist_ok=True)

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
        """Récupère tous les tokens avec gestion du cache"""
        if use_cache:
            cached_data = self.load_from_cache()
            if cached_data:
                return cached_data

        # Récupération des données depuis l'API
        all_tokens = []
        offset = 0
        limit = 50

        while len(all_tokens) < total_desired:
            logger.info(f"Récupération des tokens {offset} à {offset + limit}...")
            response = self.get_token_list(offset=offset, limit=limit)
            
            if not response.get('success'):
                logger.error(f"Erreur lors de la récupération des tokens: {response.get('error')}")
                break
                
            tokens = response.get('data', {}).get('tokens', [])
            if not tokens:
                break
                
            all_tokens.extend(tokens)
            offset += limit
            
            time.sleep(self.min_request_interval)
            
            if len(all_tokens) >= total_desired:
                all_tokens = all_tokens[:total_desired]
                break

        logger.info(f"Total des tokens récupérés: {len(all_tokens)}")
        
        # Sauvegarder dans le cache
        if all_tokens:
            self.save_to_cache(all_tokens)
        
        return all_tokens

        logger.info(f"Total des tokens récupérés: {len(all_tokens)}")
        self.save_to_cache(all_tokens)
        return all_tokens

    def save_to_cache(self, tokens):
        """Sauvegarde les données dans le cache CSV"""
        try:
            # Créer un DataFrame avec les tokens
            df = pd.DataFrame(tokens)
            
            # Ajouter le timestamp du cache
            df['cache_timestamp'] = datetime.now()
            
            # Sauvegarder en CSV
            df.to_csv(self.cache_file, index=False)
            logger.info(f"Données sauvegardées dans le cache ({len(tokens)} tokens)")

        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde du cache: {e}")


    def load_from_cache(self):
        """Charge les données depuis le cache CSV"""
        try:
            if not os.path.exists(self.cache_file):
                return None

            # Lire le fichier cache
            df = pd.read_csv(self.cache_file)
            cache_timestamp = pd.to_datetime(df['cache_timestamp'].iloc[0])
            
            # Vérifier si le cache est encore valide
            if datetime.now() - cache_timestamp > self.cache_duration:
                logger.info("Cache expiré")
                return None

            # Convertir le DataFrame en liste de dictionnaires
            tokens = df.drop('cache_timestamp', axis=1).to_dict('records')
            logger.info(f"Données chargées depuis le cache ({len(tokens)} tokens)")
            return tokens

        except Exception as e:
            logger.error(f"Erreur lors du chargement du cache: {e}")
            return None