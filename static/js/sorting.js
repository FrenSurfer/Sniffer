class SortManager {
    constructor() {
        this.table = document.querySelector('table');
        this.columnMap = {
            'symbol': 1,
            'name': 2,
            'liquidity': 3,
            'v24hUSD': 4,
            'mc': 5,
            'v24hChangePercent': 6,
            'price_change_24h': 7,
            'volume_liquidity_ratio': 8,
            'volume_mc_ratio': 9,
            'liquidity_mc_ratio': 10,
            'performance': 11,
            'is_pump': 12,
            'bubblemaps': 13,
            'holders': 14,
            'unique_wallets_24h': 15,
            'wallet_change': 16
        };

        this.initializeSorting();
    }

    initializeSorting() {
        window.sortTable = (column) => this.sortTable(column);
    }

    sortTable(column) {
        const tbody = this.table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        // Récupérer l'état de tri actuel
        let currentSortOrder = tbody.getAttribute('data-sort-order') || 'asc';
        let currentSortColumn = tbody.getAttribute('data-sort-column');
        
        // Inverser l'ordre si on clique sur la même colonne
        if (currentSortColumn === column) {
            currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortOrder = 'asc';
        }
        
        // Sauvegarder l'état de tri
        tbody.setAttribute('data-sort-order', currentSortOrder);
        tbody.setAttribute('data-sort-column', column);
        
        // Trier les lignes
        rows.sort((a, b) => this.compareValues(a, b, column, currentSortOrder));
        
        // Réorganiser les lignes
        rows.forEach(row => tbody.appendChild(row));
        
        // Mettre à jour les indicateurs visuels de tri
        this.updateSortIndicators(column, currentSortOrder);
    }

    compareValues(rowA, rowB, column, order) {
        let aValue = rowA.cells[this.getColumnIndex(column)].textContent.trim();
        let bValue = rowB.cells[this.getColumnIndex(column)].textContent.trim();
        
        // Conversion des valeurs selon le type de colonne
        [aValue, bValue] = this.convertValues(aValue, bValue, column);
        
        // Comparaison
        return order === 'asc' ? 
            (aValue > bValue ? 1 : -1) : 
            (aValue < bValue ? 1 : -1);
    }

    convertValues(aValue, bValue, column) {
        if (this.isNumericColumn(column)) {
            return [
                parseFloat(aValue.replace(/[^\d.-]/g, '')),
                parseFloat(bValue.replace(/[^\d.-]/g, ''))
            ];
        } else if (this.isPercentageColumn(column)) {
            // Pour les colonnes de pourcentage, on traite 0.00% comme la plus petite valeur
            const aNum = parseFloat(aValue.replace(/[%+]/g, ''));
            const bNum = parseFloat(bValue.replace(/[%+]/g, ''));
            
            // Si l'une des valeurs est 0.00%, on la traite différemment
            if (aNum === 0) return [-Infinity, bNum];
            if (bNum === 0) return [aNum, -Infinity];
            return [aNum, bNum];
        } else if (column === 'is_pump') {
            return [
                aValue === '✓' ? 1 : 0,
                bValue === '✓' ? 1 : 0
            ];
        }
        return [aValue, bValue];
    }

    isNumericColumn(column) {
        return ['liquidity', 'v24hUSD', 'mc', 'holders', 'unique_wallets_24h'].includes(column);
    }

    isPercentageColumn(column) {
        return column === 'v24hChangePercent' || 
               column.includes('ratio') || 
               column === 'performance' || 
               column === 'wallet_change';
    }

    getColumnIndex(column) {
        return this.columnMap[column] || 0;
    }

    updateSortIndicators(column, order) {
        const headers = document.querySelectorAll('th a');
        headers.forEach(header => {
            header.classList.remove('asc', 'desc');
            if (header.dataset.column === column) {
                header.classList.add(order);
            }
        });
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    window.sortManager = new SortManager();
});