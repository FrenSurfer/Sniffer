import pandas as pd
import logging
import numpy as np

logger = logging.getLogger(__name__)

def safe_division(a, b, default=0.0):
    """Effectue une division sécurisée en gérant les cas particuliers"""
    try:
        with np.errstate(divide='ignore', invalid='ignore'):
            result = np.where(b != 0, a / b, default)
        return np.where(np.isfinite(result), result, default)
    except Exception:
        return default

def process_token_list(tokens):
    """Traite la liste des tokens pour l'affichage en ne gardant que les données essentielles"""
    processed_data = []
    
    for token in tokens:
        processed_token = {
            'address': token['address'],
            'symbol': token['symbol'],
            'name': token['name'],
            'volume': float(token.get('v24hUSD', 0) or 0),
            'liquidity': float(token.get('liquidity', 0) or 0),
            'mc': float(token.get('mc', 0) or 0),
            'price_change_24h': float(token.get('priceChange24h', 0) or 0),
            'v24hChangePercent': float(token.get('v24hChangePercent', 0) or 0),
            'volume_liquidity_ratio': 0,
            'volume_mc_ratio': 0,
            'liquidity_mc_ratio': 0,
            'performance': 0,
            'is_pump': token.get('address', '').lower().endswith('pump')
        }
        
        logger.debug(f"Token brut: {token}")
        
        processed_data.append(processed_token)
    
    df = pd.DataFrame(processed_data)
    
    # Calcul des ratios avec gestion des cas particuliers
    df['volume_liquidity_ratio'] = safe_division(df['volume'], df['liquidity'])
    df['volume_mc_ratio'] = safe_division(df['volume'], df['mc'])
    df['liquidity_mc_ratio'] = safe_division(df['liquidity'], df['mc'])
    
    # Calcul du score de performance (exemple simple)
    df['performance'] = (
        df['volume_liquidity_ratio'] * 0.4 +
        df['volume_mc_ratio'] * 0.4 +
        df['liquidity_mc_ratio'] * 0.2
    )
    
    # S'assurer que toutes les colonnes numériques sont de type float
    numeric_columns = ['volume', 'liquidity', 'mc', 'price_change_24h', 
                      'v24hChangePercent', 'volume_liquidity_ratio', 
                      'volume_mc_ratio', 'liquidity_mc_ratio', 'performance']
    
    for col in numeric_columns:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)
    
    return df