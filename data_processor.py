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
    """
    logger.info(f"Traitement de {len(token_list)} tokens")
    
    # Liste des tokens à exclure
    excluded_symbols = [
        'USDT', 'USDC',  # Stablecoins
        'mSOL', 'WBTC', 'cbBTC', 'SOL', 'BNSOL', 'bSOL', 'LP-SOLAYER', 'hubSOL', 'PYUSD',  # Wrapped tokens
        'JLP', 'bbSOL',  # LP tokens
        'JitoSOL', 'JupSOL', 'dSOL', 'vSOL', 'compassSOL', 'INF'  # Staked tokens
    ]

    # Création du DataFrame
    df = pd.DataFrame(token_list)
    logger.info(f"Nombre initial de tokens: {len(df)}")
    
    # Filtrage des tokens exclus
    df = df[~df['symbol'].isin(excluded_symbols)]
    logger.info(f"Tokens après filtrage symboles exclus: {len(df)}")

    

    # Conversion des colonnes numériques
    numeric_columns = ['v24hUSD', 'liquidity', 'mc', 'v24hChangePercent']
    for col in numeric_columns:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    # Calcul des ratios
    df['volume_liquidity_ratio'] = (df['v24hUSD'] / df['liquidity']).fillna(0)
    df['volume_mc_ratio'] = (df['v24hUSD'] / df['mc']).fillna(0)
    df['liquidity_mc_ratio'] = (df['liquidity'] / df['mc']).fillna(0)
    
    # Coefficients par défaut pour le score
    default_weights = {
        'volume_change': 0.10,    # Renommé de 'price_change'
        'price_change': 0.10,     # Nouveau coefficient
        'volume': 0.15,
        'liquidity': 0.15,
        'vol_liq_ratio': 0.15,
        'vol_mc_ratio': 0.15,
        'liq_mc_ratio': 0.10,
        'holders': 0.05,
        'unique_wallets': 0.05
    }
    
    # Utiliser les coefficients fournis ou les valeurs par défaut
    weights = default_weights if score_weights is None else {**default_weights, **score_weights}
    

    try:
        # Conversion des données d'overview avec gestion des erreurs
        df['holders'] = pd.to_numeric(df['holder_count'], errors='coerce').fillna(0)
        df['unique_wallets_24h'] = pd.to_numeric(df['unique_wallet_24h'], errors='coerce').fillna(0)
        df['wallet_change'] = pd.to_numeric(df['unique_wallet_change'], errors='coerce').fillna(0)
        df['price_change_24h'] = pd.to_numeric(df['priceChange24hPercent'], errors='coerce').fillna(0)
    except KeyError as e:
        logger.warning(f"Colonnes manquantes pour les données d'overview: {e}")
        df['holders'] = 0
        df['unique_wallets_24h'] = 0
        df['wallet_change'] = 0
        df['price_change_24h'] = 0
    # Normalisation des métriques pour le score
    normalized_metrics = {
        'volume_change': normalize_series(df['v24hChangePercent']),
        'price_change': normalize_series(df['price_change_24h']),
        'volume': normalize_series(df['v24hUSD']),
        'liquidity': normalize_series(df['liquidity']),
        'vol_liq_ratio': normalize_series(df['volume_liquidity_ratio']),
        'vol_mc_ratio': normalize_series(df['volume_mc_ratio']),
        'liq_mc_ratio': normalize_series(df['liquidity_mc_ratio'])
    }
    
    

    # Mise à jour des métriques normalisées seulement si les données sont disponibles
    if df['holders'].sum() > 0 or df['unique_wallets_24h'].sum() > 0:
        normalized_metrics.update({
            'holders': normalize_series(df['holders']),
            'unique_wallets': normalize_series(df['unique_wallets_24h'])
        })
    else:
        normalized_metrics.update({
            'holders': pd.Series([0] * len(df)),
            'unique_wallets': pd.Series([0] * len(df))
        })
    
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
        (df['v24hChangePercent'] > 10000) |       # Volume pump > 100%
        (df['v24hChangePercent'] < -50) |       # Volume dump > 50%
        (df['price_change_24h'] > 10000) |        # Prix pump > 100%
        (df['price_change_24h'] < -50)          # Prix dump > 50%
    )
    
    df['less_than_24h'] = (df['v24hChangePercent'] == 0.00)
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
    - Holders moyens: {df['holders'].mean():,.0f}
    - Wallets uniques 24h moyens: {df['unique_wallets_24h'].mean():,.0f}
    """)
    
    return df