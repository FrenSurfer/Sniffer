class ComparisonManager {
    constructor() {
        this.modal = document.getElementById('comparisonModal');
        this.compareButton = document.getElementById('compareButton');
        this.selectedCount = document.getElementById('selectedCount');
        this.closeBtn = document.querySelector('.close');
        this.selectAll = document.getElementById('selectAll');
        this.tokenCheckboxes = document.querySelectorAll('.token-select');

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Gestion de la sélection
        this.selectAll.addEventListener('change', () => this.handleSelectAll());
        this.tokenCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateCompareButton());
        });

        // Gestion du modal
        this.compareButton.addEventListener('click', () => this.compareTokens());
        this.closeBtn.addEventListener('click', () => this.closeModal());
        window.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.closeModal();
            }
        });
    }

    handleSelectAll() {
        this.tokenCheckboxes.forEach(checkbox => {
            checkbox.checked = this.selectAll.checked;
        });
        this.updateCompareButton();
    }

    updateCompareButton() {
        const checkedCount = document.querySelectorAll('.token-select:checked').length;
        this.selectedCount.textContent = `(${checkedCount} sélectionné${checkedCount > 1 ? 's' : ''})`;
        this.compareButton.disabled = checkedCount < 2;
    }

    async compareTokens() {
        const selectedAddresses = Array.from(document.querySelectorAll('.token-select:checked'))
            .map(checkbox => checkbox.dataset.address);
        
        if (selectedAddresses.length < 2) return;
        
        try {
            const tokens = await this.fetchComparisonData(selectedAddresses);
            this.displayComparisonModal(tokens);
        } catch (error) {
            console.error('Erreur lors de la comparaison:', error);
        }
    }

    async fetchComparisonData(addresses) {
        const response = await fetch('/compare', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ addresses })
        });
        return await response.json();
    }

    displayComparisonModal(tokens) {
        const comparisonHTML = this.generateComparisonHTML(tokens);
        document.getElementById('comparisonTable').innerHTML = comparisonHTML;
        this.modal.style.display = 'block';
        this.initializeMetricToggles();
    }

    generateComparisonHTML(tokens) {
        return `
            <div class="comparison-controls">
                ${this.generateMetricToggles()}
            </div>
            <table>
                ${this.generateHeaderRow(tokens)}
                ${this.generateMetricRows(tokens)}
            </table>
        `;
    }

    generateMetricToggles() {
        const metrics = [
            ['liquidity', 'Liquidité'],
            ['volume', 'Volume 24h'],
            ['mcap', 'Market Cap'],
            ['price', 'Variation Prix'],
            ['vol-liq', 'Vol/Liq'],
            ['vol-mc', 'Vol/MC'],
            ['liq-mc', 'Liq/MC'],
            ['score', 'Score'],
            ['holders', 'Holders'],
            ['wallets', 'Wallets 24h'],
            ['wallet-change', 'Δ Wallets']
        ];

        return `
            <div class="metric-toggles">
                ${metrics.map(([id, label]) => `
                    <label>
                        <input type="checkbox" data-metric="${id}" checked> ${label}
                    </label>
                `).join('')}
            </div>
        `;
    }

    generateHeaderRow(tokens) {
        return `
            <tr class="header-row">
                <th>Métrique</th>
                ${tokens.map(t => `<th>${t.symbol}</th>`).join('')}
            </tr>
        `;
    }

    generateMetricRows(tokens) {
        const metrics = [
            ['liquidity', 'Liquidité ($)', t => t.liquidity.toLocaleString()],
            ['volume', 'Volume 24h ($)', t => t.v24hUSD.toLocaleString()],
            ['mcap', 'Market Cap ($)', t => t.mc.toLocaleString()],
            ['price', 'Variation Prix (%)', t => `<td class="${t.v24hChangePercent > 0 ? 'positive' : 'negative'}">${t.v24hChangePercent.toFixed(2)}%</td>`],
            ['vol-liq', 'Vol/Liq Ratio', t => t.volume_liquidity_ratio.toFixed(2)],
            ['vol-mc', 'Vol/MC Ratio', t => t.volume_mc_ratio.toFixed(2)],
            ['liq-mc', 'Liq/MC Ratio', t => t.liquidity_mc_ratio.toFixed(2)],
            ['score', 'Score', t => t.performance.toFixed(2)],
            ['holders', 'Holders', t => t.holders.toLocaleString()],
            ['wallets', 'Wallets 24h', t => t.unique_wallets_24h.toLocaleString()],
            ['wallet-change', 'Δ Wallets (%)', t => `<td class="${t.wallet_change > 0 ? 'positive' : 'negative'}">${t.wallet_change.toFixed(2)}%</td>`]
        ];

        return metrics.map(([metric, label, formatter]) => `
            <tr class="metric-row" data-metric="${metric}">
                <td>${label}</td>
                ${tokens.map(t => formatter(t)).join('')}
            </tr>
        `).join('');
    }

    initializeMetricToggles() {
        document.querySelectorAll('.metric-toggles input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const metric = checkbox.dataset.metric;
                const row = document.querySelector(`tr[data-metric="${metric}"]`);
                if (row) {
                    row.style.display = checkbox.checked ? '' : 'none';
                }
            });
        });
    }

    closeModal() {
        this.modal.style.display = 'none';
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    window.comparisonManager = new ComparisonManager();
});