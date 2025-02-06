class SortManager {
    constructor() {
        this.table = document.querySelector('table');
        this.columnMap = {
            'symbol': 1,
            'name': 2,
            'liquidity': 3,
            'volume': 4,
            'mc': 5,
            'v24hChangePercent': 6,
            'price_change_24h': 7,
            'volume_liquidity_ratio': 8,
            'volume_mc_ratio': 9,
            'liquidity_mc_ratio': 10,
            'performance': 11,
            'is_pump': 12,
            'bubblemaps': 13
        };

        this.suspiciousColumns = [
            'v24hChangePercent',
            'price_change_24h',
            'volume_liquidity_ratio',
            'volume_mc_ratio',
            'liquidity_mc_ratio'
        ];

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
        if (column === 'is_pump') {
            const aValue = rowA.cells[this.getColumnIndex(column)].textContent === '✓' ? 1 : 0;
            const bValue = rowB.cells[this.getColumnIndex(column)].textContent === '✓' ? 1 : 0;
            return order === 'asc' ? aValue - bValue : bValue - aValue;
        }

        let aValue = rowA.cells[this.getColumnIndex(column)].textContent.trim();
        let bValue = rowB.cells[this.getColumnIndex(column)].textContent.trim();
        
        if (this.isSuspiciousColumn(column)) {
            return this.compareSuspiciousValues(aValue, bValue, order);
        }

        return this.compareNormalValues(aValue, bValue, column, order);
    }

    compareNormalValues(aValue, bValue, column, order) {
        if (this.isNumericColumn(column)) {
            const aNum = parseFloat(aValue.replace(/[^\d.-]/g, ''));
            const bNum = parseFloat(bValue.replace(/[^\d.-]/g, ''));
            return order === 'asc' ? aNum - bNum : bNum - aNum;
        } 
        else if (this.isPercentageColumn(column)) {
            const aNum = parseFloat(aValue.replace(/[%+]/g, ''));
            const bNum = parseFloat(bValue.replace(/[%+]/g, ''));
            
            if (column === 'v24hChangePercent' || column === 'price_change_24h') {
                // Gestion spéciale pour les colonnes de variation
                return order === 'asc' ? aNum - bNum : bNum - aNum;
            }
            return order === 'asc' ? aNum - bNum : bNum - aNum;
        }
        // Pour les colonnes textuelles (comme symbol, name)
        return order === 'asc' ? 
            aValue.localeCompare(bValue) : 
            bValue.localeCompare(aValue);
    }

    compareSuspiciousValues(aValue, bValue, order) {
        const aNum = parseFloat(aValue.replace(/[%+]/g, ''));
        const bNum = parseFloat(bValue.replace(/[%+]/g, ''));
        return order === 'asc' ? aNum - bNum : bNum - aNum;
    }

    isNumericColumn(column) {
        return ['liquidity', 'volume', 'mc'].includes(column);
    }

    isPercentageColumn(column) {
        return ['v24hChangePercent', 'price_change_24h', 'wallet_change'].includes(column) || 
               column.includes('ratio') || 
               column === 'performance';
    }

    isSuspiciousColumn(column) {
        return this.suspiciousColumns.includes(column);
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