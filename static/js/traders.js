class TradersManager {
    constructor() {
        this.timeRangeSelect = document.getElementById('timeRange');
        this.tableBody = document.getElementById('tradersTableBody');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.errorMessage = document.getElementById('errorMessage');
        
        this.initializeEventListeners();
        this.loadTradersData(); // Chargement initial
    }

    initializeEventListeners() {
        // Écouter les changements de période
        this.timeRangeSelect.addEventListener('change', () => this.loadTradersData());

        // Écouter les changements d'onglet
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.loadTradersData();
            }
        });
    }

    async loadTradersData() {
        this.showLoading();
        
        try {
            const response = await fetch(`/api/traders?type=${this.timeRangeSelect.value}`);
            const data = await response.json();
            
            if (data.success) {
                this.renderTraders(data.data);
            } else {
                throw new Error(data.error || 'Erreur lors du chargement des données');
            }
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    renderTraders(traders) {
        this.tableBody.innerHTML = traders.map(trader => {
            const trades = trader.trades || [];
            const lastTrades = trades.slice(0, 5); // Afficher les 5 derniers trades

            return `
                <tr class="trader-row">
                    <td style="cursor: pointer;" onclick="copyWithEffect(this, '${trader.address}')">
                        ${trader.address.slice(0, 8)}...${trader.address.slice(-6)}
                    </td>
                    <td class="${trader.pnl > 0 ? 'positive' : 'negative'}">
                        $${this.formatNumber(trader.pnl)}
                    </td>
                    <td>${this.formatNumber(trader.trade_count)}</td>
                    <td>$${this.formatNumber(trader.volume)}</td>
                    <td>
                        <a href="https://solscan.io/account/${trader.address}" target="_blank" class="action-link">
                            Solscan
                        </a>
                        <button onclick="window.tradersManager.toggleTrades(this)" class="action-link">
                            Voir trades
                        </button>
                    </td>
                </tr>
                <tr class="trades-details" style="display: none;">
                    <td colspan="5">
                        <div class="trades-list">
                            ${lastTrades.map(trade => `
                                <div class="trade-item">
                                    <span>${new Date(trade.block_unix_time * 1000).toLocaleString()}</span>
                                    <span>${trade.quote.symbol} → ${trade.base.symbol}</span>
                                    <span>Amount: ${this.formatNumber(trade.quote.ui_amount)} ${trade.quote.symbol}</span>
                                    <span>Price: $${trade.quote.nearest_price ? this.formatNumber(trade.quote.nearest_price) : 'N/A'}</span>
                                    <a href="https://solscan.io/tx/${trade.tx_hash}" target="_blank">Voir TX</a>
                                </div>
                            `).join('')}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    toggleTrades(button) {
        const traderRow = button.closest('.trader-row');
        const tradesRow = traderRow.nextElementSibling;
        tradesRow.style.display = tradesRow.style.display === 'none' ? 'table-row' : 'none';
    }

    formatNumber(number) {
        return new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(number);
    }

    showLoading() {
        this.loadingSpinner.classList.remove('hidden');
        this.errorMessage.classList.add('hidden');
    }

    hideLoading() {
        this.loadingSpinner.classList.add('hidden');
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    window.tradersManager = new TradersManager();
});