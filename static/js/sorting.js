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
            'holders': 12,
            'unique_wallets_24h': 13,
            'wallet_change': 14,
            'is_pump': 15,     
            'bubblemaps': 16      
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
        
        // Pour les colonnes de pourcentage (delta prix, volume, wallets)
        if (column === 'v24hChangePercent' || column === 'price_change_24h' || column === 'wallet_change') {
            const aNum = parseFloat(aValue.replace(/[%+]/g, ''));
            const bNum = parseFloat(bValue.replace(/[%+]/g, ''));
            
            // Ordre croissant : négatifs -> zéro -> positifs
            if (order === 'asc') {
                return aNum - bNum;
            }
            // Ordre décroissant : positifs -> zéro -> négatifs
            return bNum - aNum;
        }
        
        // Pour les autres types de colonnes, utiliser convertValues
        [aValue, bValue] = this.convertValues(aValue, bValue, column);
        
        return order === 'asc' ? 
            (aValue > bValue ? 1 : aValue < bValue ? -1 : 0) : 
            (aValue < bValue ? 1 : aValue > bValue ? -1 : 0);
    }

    convertValues(aValue, bValue, column) {
        if (this.isNumericColumn(column)) {
            return [
                parseFloat(aValue.replace(/[^\d.-]/g, '')),
                parseFloat(bValue.replace(/[^\d.-]/g, ''))
            ];
        } else if (this.isPercentageColumn(column)) {
            const aNum = parseFloat(aValue.replace(/[%+]/g, ''));
            const bNum = parseFloat(bValue.replace(/[%+]/g, ''));
            
            // Traitement spécial pour les colonnes de variation de prix et volume
            if (column === 'v24hChangePercent' || column === 'price_change_24h' || column === 'wallet_change') {
                // Pour le tri croissant : négatifs -> 0 -> positifs
                if (aNum === 0) return [0, bNum < 0 ? 1 : bNum];
                if (bNum === 0) return [aNum < 0 ? -1 : aNum, 0];
            }
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
        return ['v24hChangePercent', 'price_change_24h', 'wallet_change'].includes(column) || 
               column.includes('ratio') || 
               column === 'performance';
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