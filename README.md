# Solana Token Sniffer

A small web tool to browse and filter **Solana tokens** using the [Birdeye](https://birdeye.so) API. Data is displayed in a table with quick links to [GMGN](https://gmgn.ai) and [Bubblemaps](https://app.bubblemaps.io).

## What it does

- **Fetches** top Solana tokens (volume, liquidity, market cap) from Birdeye
- **Caches** results in `data/token_cache.csv` (30 min) to limit API calls
- **Filters**: min/max liquidity, volume, market cap, volume/price change, “hide suspicious”, “tokens > 24h”, detection thresholds for highlighting
- **Search** by symbol or name
- **Sort** by any column (symbol, name, liquidity, volume, Δ Volume %, ratios, etc.)
- **Compare** selected tokens in a modal
- **Links**: click symbol or name to open the token on GMGN; copy address via the ⎘ button; Bubblemaps link in the last column

## Setup

1. **Clone and install**

   ```bash
   cd sniffer
   pip install -r requirements.txt
   ```

2. **API key**

   Create a `.env` file at the project root:

   ```env
   API_KEY=your_birdeye_api_key
   ```

   Get a key from [Birdeye](https://birdeye.so) (public API).

3. **Run**

   ```bash
   python app.py
   ```

   Open **http://127.0.0.1:5000** in your browser.

## Project layout

| File / folder       | Role                                                      |
| ------------------- | --------------------------------------------------------- |
| `app.py`            | Flask app, routes, token fetch + 30 min refresh           |
| `api_client.py`     | Birdeye API client, rate limit, CSV cache                 |
| `data_processor.py` | Token list → table data (ratios, etc.)                    |
| `data/`             | `token_cache.csv` (created automatically)                 |
| `templates/`        | `index.html` – main token table UI                        |
| `static/`           | CSS + JS (filters, search, sort, comparison)              |
| `test_api.py`       | Quick test of the API client (uses `API_KEY` from `.env`) |

## Tips

- **Refresh data**: use the “Refresh data” button to bypass cache and refetch from the API.
- **Suspicious highlight**: open “Detection thresholds” in the filters to tune which volume/price changes and ratios are highlighted in yellow.
- **Compare**: select at least 2 tokens with the checkboxes, then click “Compare selected tokens”.

## Requirements

- Python 3.x
- Birdeye API key (in `.env` as `API_KEY`)

See `requirements.txt` for Python dependencies (Flask, pandas, requests, python-dotenv, etc.).
