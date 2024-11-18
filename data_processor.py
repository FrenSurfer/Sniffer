import pandas as pd
import logging
import numpy as np

logger = logging.getLogger(__name__)

def normalize_series(series):
    """Normalise une série entre 0 et 1"""
    min_val = series.min()
    max_val = series.max()
    return (series - min_val) / (max_val - min_val) if max_val > min_val else series

def process_token_list(token_list, score_weights=None):
    """
    Traite la liste des tokens avec des coefficients personnalisables
    
    Args:
        token_list: Liste des tokens à traiter
        score_weights: Dictionnaire des coefficients du score {
            'price_change': float,  # Variation prix
            'volume': float,        # Volume brut
            'liquidity': float,     # Liquidité brute
            'vol_liq_ratio': float, # Ratio Vol/Liq
            'vol_mc_ratio': float,  # Ratio Vol/MC
            'liq_mc_ratio': float   # Ratio Liq/MC
        }
    """
    logger.info(f"Traitement de {len(token_list)} tokens")
    
    # Coefficients par défaut pour le score
    default_weights = {
        'price_change': 0.15,
        'volume': 0.15,
        'liquidity': 0.15,
        'vol_liq_ratio': 0.20,
        'vol_mc_ratio': 0.20,
        'liq_mc_ratio': 0.15
    }
    
    # Utiliser les coefficients fournis ou les valeurs par défaut
    weights = default_weights if score_weights is None else {**default_weights, **score_weights}
    
    # Liste des tokens à exclure
    excluded_symbols = [
        'USDT', 'USDC',  # Stablecoins
        'mSOL', 'WBTC', 'cbBTC', 'SOL', 'BNSOL', 'bSOL', 'LP-SOLAYER', 'hubSOL', 'PYUSD',  # Wrapped tokens
        'JLP',  # LP tokens
        'JitoSOL', 'JupSOL'  # Staked tokens
    ]
    
    # Création du DataFrame et nettoyage initial
    df = pd.DataFrame(token_list)
    df = df.fillna(0)  # Remplacer les NaN par 0
    
    # Conversion des colonnes numériques
    numeric_columns = ['mc', 'v24hUSD', 'liquidity', 'v24hChangePercent']
    for col in numeric_columns:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    initial_count = len(df)
    logger.info(f"Nombre initial de tokens: {initial_count}")
    
    # Filtrage des tokens exclus
    df = df[~df['symbol'].isin(excluded_symbols)]
    logger.info(f"Tokens après filtrage symboles exclus: {len(df)}")
    
    # Calcul des ratios principaux (avec protection contre division par zéro)
    df['volume_liquidity_ratio'] = (df['v24hUSD'] / df['liquidity'].replace(0, np.inf)).round(3)
    df['volume_mc_ratio'] = (df['v24hUSD'] / df['mc'].replace(0, np.inf)).round(3)
    df['liquidity_mc_ratio'] = (df['liquidity'] / df['mc'].replace(0, np.inf)).round(3)
    
    # Remplacer les valeurs infinies par 0
    df = df.replace([np.inf, -np.inf], 0)
    
    # Normalisation des métriques pour le score
    normalized_metrics = {
        'price_change': normalize_series(df['v24hChangePercent']),
        'volume': normalize_series(df['v24hUSD']),
        'liquidity': normalize_series(df['liquidity']),
        'vol_liq_ratio': normalize_series(df['volume_liquidity_ratio']),
        'vol_mc_ratio': normalize_series(df['volume_mc_ratio']),
        'liq_mc_ratio': normalize_series(df['liquidity_mc_ratio'])
    }
    
    # Calcul du score de performance avec les coefficients
    df['performance'] = sum(
        normalized_metrics[key] * weight 
        for key, weight in weights.items()
    ).round(3)
    
    # Détection des tokens suspects
    df['is_suspicious'] = (
        (df['volume_liquidity_ratio'] > 5) |    # Volume/Liq anormal
        (df['volume_mc_ratio'] > 3) |           # Volume/MC anormal
        (df['liquidity_mc_ratio'] < 0.05) |     # Liquidité/MC faible
        (df['v24hChangePercent'] > 100) |       # Pump > 100%
        (df['v24hChangePercent'] < -50)         # Dump > 50%
    )
    
    # Détection des pump tokens
    df['is_pump'] = df['address'].str.lower().str.endswith('pump')
    
    # Statistiques finales
    suspicious_count = len(df[df['is_suspicious']])
    pump_count = len(df[df['is_pump']])
    
    logger.info(f"""
    Statistiques finales:
    - Tokens totaux analysés: {len(df)}
    - Tokens suspects: {suspicious_count} ({(suspicious_count/len(df)*100):.1f}%)
    - Tokens pump: {pump_count}
    - Market Cap moyen: ${df['mc'].mean():,.2f}
    - Volume moyen 24h: ${df['v24hUSD'].mean():,.2f}
    - Liquidité moyenne: ${df['liquidity'].mean():,.2f}
    - Score moyen: {df['performance'].mean():.3f}
    """)
    
    return df