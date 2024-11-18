import pandas as pd
import logging
import numpy as np

logger = logging.getLogger(__name__)

def normalize_series(series):
    """Normalise une série entre 0 et 1"""
    min_val = series.min()
    max_val = series.max()
    return (series - min_val) / (max_val - min_val) if max_val > min_val else series

def process_token_list(token_list):
    logger.info(f"Traitement de {len(token_list)} tokens")
    
    # Liste des tokens à exclure
    excluded_symbols = [
        'USDT', 'USDC',  # Stablecoins
        'mSOL', 'WBTC', 'cbBTC', 'SOL', 'BNSOL', 'bSOL', 'LP-SOLAYER', 'hubSOL', 'PYUSD',  # Wrapped tokens
        'JLP',  # LP tokens
        'JitoSOL', 'JupSOL'  # Staked tokens
    ]
    
    df = pd.DataFrame(token_list)
    initial_count = len(df)
    logger.info(f"Nombre initial de tokens: {initial_count}")
    
    # Filtrage par market cap
    df = df[
        (df['mc'] >= 150000) & 
        (df['mc'] <= 75000000)
    ]
    logger.info(f"Tokens après filtrage market cap (150k$ - 75M$): {len(df)}")
    
    # Filtrage des tokens exclus
    df = df[~df['symbol'].isin(excluded_symbols)]
    logger.info(f"Tokens après filtrage symboles exclus: {len(df)}")
    
    # Filtres de liquidité et volume minimum
    df = df[
        (df['liquidity'] > 10000) &  # Min 10k$ liquidité
        (df['v24hUSD'] > 1000)       # Min 1k$ volume 24h
    ]
    logger.info(f"Tokens après filtrage liquidité et volume: {len(df)}")
    
    # Nettoyage des données
    df = df.fillna(0)
    
    # Calcul des ratios principaux
    df['volume_liquidity_ratio'] = (df['v24hUSD'] / df['liquidity']).round(3)
    df['volume_mc_ratio'] = (df['v24hUSD'] / df['mc']).round(3)
    df['liquidity_mc_ratio'] = (df['liquidity'] / df['mc']).round(3)
    
    # Normalisation des métriques pour le score
    normalized_metrics = {
        'price_change': normalize_series(df['v24hChangePercent']),
        'volume': normalize_series(df['v24hUSD']),
        'liquidity': normalize_series(df['liquidity']),
        'vol_liq_ratio': normalize_series(df['volume_liquidity_ratio']),
        'vol_mc_ratio': normalize_series(df['volume_mc_ratio']),
        'liq_mc_ratio': normalize_series(df['liquidity_mc_ratio'])
    }
    
    # Calcul du score de performance
    df['performance'] = (
        normalized_metrics['price_change'] * 0.15 +      # Variation prix
        normalized_metrics['volume'] * 0.15 +            # Volume brut
        normalized_metrics['liquidity'] * 0.15 +         # Liquidité brute
        normalized_metrics['vol_liq_ratio'] * 0.20 +     # Ratio Vol/Liq
        normalized_metrics['vol_mc_ratio'] * 0.20 +      # Ratio Vol/MC
        normalized_metrics['liq_mc_ratio'] * 0.15        # Ratio Liq/MC
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