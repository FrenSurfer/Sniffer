import requests
import logging
from time import sleep

logger = logging.getLogger(__name__)

class SolscanClient:
    def __init__(self, api_key):
        self.base_url = "https://pro-api.solscan.io/v2.0"
        self.headers = {
            "Accept": "application/json",
            "Authorization": api_key  # Changé ici
        }

    def get_token_holders(self, token_address, page=1, page_size=10):
        """Récupère les holders d'un token"""
        endpoint = f"{self.base_url}/token/holders"
        params = {
            "address": token_address,
            "page": page,
            "page_size": page_size
        }

        try:
            # Ajout d'une pause pour éviter de surcharger l'API
            sleep(0.5)
            
            response = requests.get(
                endpoint,
                headers=self.headers,
                params=params,
                timeout=10
            )
            
            # Debug de la réponse
            if response.status_code == 401:
                logger.error(f"Erreur d'authentification avec l'API Solscan. Headers utilisés: {self.headers}")
                logger.error(f"Response: {response.text}")
                return None
                
            response.raise_for_status()
            data = response.json()
            
            if not data.get("success"):
                logger.error(f"Erreur Solscan pour {token_address}: {data.get('errors')}")
                return None
                
            return data["data"]
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur lors de la récupération des holders pour {token_address}: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Erreur inattendue pour {token_address}: {str(e)}")
            return None

    def analyze_holder_distribution(self, token_address):
        """Analyse la distribution des holders"""
        try:
            holders_data = self.get_token_holders(token_address, page=1, page_size=100)
            
            if not holders_data or not holders_data.get("items"):
                return {
                    "total_holders": 0,
                    "top_10_concentration": 1.0,
                    "is_suspicious": True
                }
                
            holders = holders_data["items"]
            total_holders = holders_data["total"]
            
            # Calculer des métriques
            if len(holders) > 0:
                # Top 10 concentration
                top_10_amount = sum(float(h["amount"]) for h in holders[:10])
                total_amount = sum(float(h["amount"]) for h in holders)
                top_10_concentration = (top_10_amount / total_amount) if total_amount > 0 else 1.0
                
                return {
                    "total_holders": total_holders,
                    "top_10_concentration": top_10_concentration,
                    "is_suspicious": top_10_concentration > 0.90  # Plus de 90% détenu par top 10
                }
            
            return {
                "total_holders": 0,
                "top_10_concentration": 1.0,
                "is_suspicious": True
            }
            
        except Exception as e:
            logger.error(f"Erreur lors de l'analyse des holders pour {token_address}: {str(e)}")
            return {
                "total_holders": 0,
                "top_10_concentration": 1.0,
                "is_suspicious": True
            }