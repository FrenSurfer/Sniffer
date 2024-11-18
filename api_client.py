import requests
from requests.exceptions import RequestException
import logging
import time

logger = logging.getLogger(__name__)

class BirdeyeAPIClient:
    def __init__(self, api_key):
        self.base_url = "https://public-api.birdeye.so"
        self.headers = {
            "accept": "application/json",
            "X-API-KEY": api_key
        }

    def get_token_list(self, offset=0, limit=50):
        endpoint = f"{self.base_url}/defi/tokenlist"
        params = {
            "sort_by": "v24hUSD",
            "sort_type": "desc",
            "offset": str(offset),
            "limit": str(limit)
        }
        
        try:
            response = requests.get(endpoint, headers=self.headers, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except RequestException as e:
            logger.error(f"Erreur API: {str(e)}")
            return {"success": False, "error": str(e)}

    def get_all_tokens(self, total_desired=200):
        all_tokens = []
        offset = 0
        limit = 50  # Maximum permis par l'API

        while len(all_tokens) < total_desired:
            logger.info(f"Récupération des tokens {offset} à {offset + limit}...")
            response = self.get_token_list(offset=offset, limit=limit)
            
            if not response.get('success'):
                logger.error(f"Erreur lors de la récupération des tokens: {response.get('error')}")
                break
                
            tokens = response['data']['tokens']
            if not tokens:  # Plus de tokens disponibles
                break
                
            all_tokens.extend(tokens)
            offset += limit
            
            # Pause pour éviter de surcharger l'API
            time.sleep(1)
            
            if len(all_tokens) >= total_desired:
                all_tokens = all_tokens[:total_desired]
                break

        logger.info(f"Total des tokens récupérés: {len(all_tokens)}")
        return all_tokens