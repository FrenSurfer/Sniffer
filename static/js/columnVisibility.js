class ColumnVisibilityManager {
    constructor() {
        this.toggleColumnsButton = document.getElementById('toggleColumns');
        this.columnsPanel = document.getElementById('columnsPanel');
        this.table = document.querySelector('table');
        
        this.columnDefinitions = [
            { id: 'select', label: 'Sélection', index: 1 },
            { id: 'symbol', label: 'Symbole', index: 2 },
            { id: 'name', label: 'Nom', index: 3 },
            { id: 'liquidity', label: 'Liquidité', index: 4 },
            { id: 'v24hUSD', label: 'Volume 24h', index: 5 },
            { id: 'mc', label: 'Market Cap', index: 6 },
            { id: 'v24hChangePercent', label: 'Δ Volume', index: 7 },
            { id: 'price_change_24h', label: 'Δ Prix', index: 8 },
            { id: 'volume_liquidity_ratio', label: 'Vol/Liq', index: 9 },
            { id: 'volume_mc_ratio', label: 'Vol/MC', index: 10 },
            { id: 'liquidity_mc_ratio', label: 'Liq/MC', index: 11 },
            { id: 'performance', label: 'Score', index: 12 },
            
            { id: 'holders', label: 'Holders', index: 13 },
            { id: 'unique_wallets_24h', label: 'Wallets 24h', index: 14 },
            { id: 'wallet_change', label: 'Δ Wallets', index: 15 },
            { id: 'is_pump', label: 'Pump', index: 16 },
            { id: 'bubblemaps', label: 'Bubblemaps', index: 17 },
        ];

        this.initializePanel();
        this.initializeEventListeners();
        this.restoreColumnVisibility();
    }

    initializePanel() {
        // Créer le panneau de contrôle des colonnes s'il n'existe pas
        if (!this.columnsPanel) {
            this.columnsPanel = document.createElement('div');
            this.columnsPanel.id = 'columnsPanel';
            this.columnsPanel.className = 'columns-panel';
            this.columnsPanel.style.display = 'none';
            
            const content = `
                <div class="column-options">
                    ${this.columnDefinitions.map(col => `
                        <label>
                            <input type="checkbox" 
                                   data-column="${col.id}" 
                                   ${col.id === 'select' || col.id === 'symbol' ? 'disabled' : ''} 
                                   checked>
                            ${col.label}
                        </label>
                    `).join('')}
                </div>
            `;
            
            this.columnsPanel.innerHTML = content;
            this.toggleColumnsButton.parentNode.insertBefore(
                this.columnsPanel, 
                this.toggleColumnsButton.nextSibling
            );
        }
    }

    initializeEventListeners() {
        // Toggle du panneau
        this.toggleColumnsButton.addEventListener('click', () => {
            const isVisible = this.columnsPanel.style.display === 'none';
            this.columnsPanel.style.display = isVisible ? 'block' : 'none';
            this.toggleColumnsButton.textContent = 
                `Visibilité des colonnes ${isVisible ? '▲' : '▼'}`;
        });

        // Gestion des checkboxes
        document.querySelectorAll('.column-options input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.toggleColumnVisibility(
                    this.getColumnIndex(checkbox.dataset.column),
                    checkbox.checked
                );
                this.saveColumnVisibility();
            });
        });
    }

    toggleColumnVisibility(columnIndex, isVisible) {
        const display = isVisible ? '' : 'none';
        
        // Masquer/afficher les cellules d'en-tête
        this.table.querySelectorAll(`th:nth-child(${columnIndex})`).forEach(th => {
            th.style.display = display;
        });
        
        // Masquer/afficher les cellules du corps
        this.table.querySelectorAll(`td:nth-child(${columnIndex})`).forEach(td => {
            td.style.display = display;
        });
    }

    getColumnIndex(columnId) {
        const column = this.columnDefinitions.find(col => col.id === columnId);
        return column ? column.index : 0;
    }

    saveColumnVisibility() {
        const visibility = {};
        document.querySelectorAll('.column-options input[type="checkbox"]').forEach(checkbox => {
            visibility[checkbox.dataset.column] = checkbox.checked;
        });
        localStorage.setItem('columnVisibility', JSON.stringify(visibility));
    }

    restoreColumnVisibility() {
        const savedVisibility = localStorage.getItem('columnVisibility');
        if (savedVisibility) {
            const visibility = JSON.parse(savedVisibility);
            Object.entries(visibility).forEach(([column, isVisible]) => {
                const checkbox = document.querySelector(
                    `.column-options input[data-column="${column}"]`
                );
                if (checkbox) {
                    checkbox.checked = isVisible;
                    this.toggleColumnVisibility(
                        this.getColumnIndex(column),
                        isVisible
                    );
                }
            });
        }
    }

    // Méthode publique pour réinitialiser la visibilité des colonnes
    resetColumnVisibility() {
        document.querySelectorAll('.column-options input[type="checkbox"]').forEach(checkbox => {
            if (!checkbox.disabled) {
                checkbox.checked = true;
                this.toggleColumnVisibility(
                    this.getColumnIndex(checkbox.dataset.column),
                    true
                );
            }
        });
        this.saveColumnVisibility();
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    window.columnVisibilityManager = new ColumnVisibilityManager();
});