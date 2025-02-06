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
        self.traders_cache_file = 'data/traders_cache.csv'
        self.trades_cache_file = 'data/trades_cache.csv' 
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
        # Réduire la taille du batch pour respecter la limite de 60 rpm
        batch_size = 30  # Pour rester dans la limite de 60 rpm
        
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

            all_tokens.extend(tokens)
            
            if len(all_tokens) >= total_desired:
                all_tokens = all_tokens[:total_desired]
                break

            # Attendre 1 seconde entre chaque requête pour respecter la limite de 60 rpm
            time.sleep(1)

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

    
    def get_traders_data(self, sort_by='PnL', sort_type='desc', time_range='1W', total_desired=100, use_cache=True):
        """Récupère les données des traders Solana avec gestion du cache"""
        start_time = time.time()
        request_count = 0

        # Vérifier le cache
        if use_cache:
            cached_data = self.load_traders_from_cache()
            if cached_data:
                logger.info("Utilisation des données traders du cache")
                return cached_data

        all_traders = []
        batch_size = 10  # L'API limite à 10 résultats par requête
        num_requests = (total_desired + batch_size - 1) // batch_size

        for offset in range(0, num_requests * batch_size, batch_size):
            self.check_rate_limit()
            self.request_count += 1

            endpoint = f"{self.base_url}/trader/gainers-losers"
            params = {
                "type": time_range,
                "sort_by": sort_by,
                "sort_type": sort_type,
                "offset": str(offset),
                "limit": "10"  # Limite fixée à 10
            }

            headers = {
                **self.headers,
                "x-chain": "solana"
            }

            logger.info(f"Requête traders Solana batch {offset//10 + 1}/{num_requests}")

            def request_func():
                response = requests.get(
                    endpoint,
                    headers=headers,
                    params=params,
                    timeout=10
                )
                if response.status_code != 200:
                    logger.error(f"Réponse API: {response.text}")
                response.raise_for_status()
                return response.json()

            response = retry_request(request_func)
            if response and response.get('success'):
                traders = response.get('data', {}).get('items', [])
                if not traders:  # Si plus de résultats, on arrête
                    break

                # Enrichir chaque trader avec ses trades
                for trader in traders:
                    trader['trades'] = self.get_trader_trades(trader['address'])

                all_traders.extend(traders)

                if len(all_traders) >= total_desired:
                    all_traders = all_traders[:total_desired]
                    break

                time.sleep(0.5)  # Petit délai entre les requêtes
            else:
                break

        # Statistiques finales
        end_time = time.time()
        duration = end_time - start_time
        rpm = (request_count / duration) * 60

        logger.info(f"""
        Statistiques de récupération traders:
        - Temps total: {duration:.2f}s
        - Requêtes totales: {request_count}
        - RPM effectif: {rpm:.2f}
        - Traders récupérés: {len(all_traders)}
        """)

        # Sauvegarder dans le cache
        if all_traders:
            self.save_traders_to_cache(all_traders)

        return all_traders

    def get_trader_trades(self, address, limit=100):
        """Récupère les trades d'un trader spécifique"""
        self.check_rate_limit()
        self.request_count += 1

        endpoint = f"{self.base_url}/trader/txs/seek_by_time"
        params = {
            "address": address,
            "offset": "0",
            "limit": str(limit),
            "tx_type": "swap",
            "sort_type": "desc",
            "before_time": "0",
            "after_time": "0"
        }
        
        headers = {
            **self.headers,
            "x-chain": "solana"
        }
        
        def request_func():
            response = requests.get(
                endpoint, 
                headers=headers, 
                params=params,
                timeout=10
            )
            if response.status_code != 200:
                logger.error(f"Réponse API: {response.text}")
            response.raise_for_status()
            return response.json()
        
        response = retry_request(request_func)
        if response and response.get('success'):
            return response.get('data', {}).get('items', [])
        return []


    def save_traders_to_cache(self, traders):
        """Sauvegarde les données des traders et leurs trades dans des CSV séparés"""
        try:
            # Sauvegarder les données de base des traders
            traders_data = [{
                'address': t['address'],
                'pnl': t['pnl'],
                'trade_count': t['trade_count'],
                'volume': t['volume']
            } for t in traders]
            
            df_traders = pd.DataFrame(traders_data)
            df_traders['cache_timestamp'] = datetime.now()
            df_traders.to_csv(self.traders_cache_file, index=False)
            
            # Sauvegarder les trades séparément
            all_trades = []
            for trader in traders:
                for trade in trader.get('trades', []):
                    trade_data = {
                        'trader_address': trader['address'],
                        'block_unix_time': trade['block_unix_time'],
                        'tx_hash': trade['tx_hash'],
                        'quote_symbol': trade['quote']['symbol'],
                        'quote_amount': trade['quote']['ui_amount'],
                        'base_symbol': trade['base']['symbol'],
                        'base_amount': trade['base']['ui_amount'],
                        'price': trade['quote'].get('nearest_price'),
                        'source': trade.get('source', '')
                    }
                    all_trades.append(trade_data)
            
            if all_trades:
                df_trades = pd.DataFrame(all_trades)
                df_trades['cache_timestamp'] = datetime.now()
                df_trades.to_csv(self.trades_cache_file, index=False)
                
            logger.info(f"Données sauvegardées: {len(traders)} traders et {len(all_trades)} trades")
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde du cache: {e}")

    def load_traders_from_cache(self):
        """Charge les données des traders et leurs trades depuis les CSV"""
        try:
            if not os.path.exists(self.traders_cache_file) or not os.path.exists(self.trades_cache_file):
                return None

            # Charger les traders
            df_traders = pd.read_csv(self.traders_cache_file)
            cache_timestamp = pd.to_datetime(df_traders['cache_timestamp'].iloc[0])
            
            if datetime.now() - cache_timestamp > self.cache_duration:
                logger.info("Cache expiré")
                return None

            # Charger les trades
            df_trades = pd.read_csv(self.trades_cache_file)
            
            # Reconstruire les données
            traders = []
            for _, trader_row in df_traders.iterrows():
                trader = trader_row.to_dict()
                trader.pop('cache_timestamp', None)
                
                # Récupérer les trades de ce trader
                trader_trades = df_trades[df_trades['trader_address'] == trader['address']]
                trades_list = []
                
                for _, trade in trader_trades.iterrows():
                    trade_dict = {
                        'block_unix_time': trade['block_unix_time'],
                        'tx_hash': trade['tx_hash'],
                        'quote': {
                            'symbol': trade['quote_symbol'],
                            'ui_amount': trade['quote_amount'],
                            'nearest_price': trade['price']
                        },
                        'base': {
                            'symbol': trade['base_symbol'],
                            'ui_amount': trade['base_amount']
                        },
                        'source': trade['source']
                    }
                    trades_list.append(trade_dict)
                
                trader['trades'] = trades_list
                traders.append(trader)

            logger.info(f"Données chargées depuis le cache: {len(traders)} traders")
            return traders

        except Exception as e:
            logger.error(f"Erreur lors du chargement du cache: {e}")
            return None