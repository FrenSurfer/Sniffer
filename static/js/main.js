document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    const table = document.querySelector('table');
    const tableContainer = document.querySelector('.table-container');
    const selectAll = document.getElementById('selectAll');
    const compareButton = document.getElementById('compareButton');
    const selectedCount = document.getElementById('selectedCount');
    const modal = document.getElementById('comparisonModal');
    const closeBtn = document.querySelector('.close');
    const tokenCheckboxes = document.querySelectorAll('.token-select');
    const filterButton = document.getElementById('applyFilters');
    const toggleButton = document.getElementById('toggleThresholds');
    const thresholdsPanel = document.getElementById('thresholdsPanel');
    const toggleWeightsButton = document.getElementById('toggleWeights');
    const weightsPanel = document.getElementById('weightsPanel');
    const toggleColumnsButton = document.getElementById('toggleColumns');
    const columnsPanel = document.getElementById('columnsPanel');

    // Fonctions utilitaires
    function parseNumericValue(value) {
        if (typeof value === 'string') {
            return parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
        }
        return parseFloat(value) || 0;
    }

    window.copyWithEffect = function(element, address) {
        navigator.clipboard.writeText(address);
        element.style.transition = 'color 0.3s';
        const originalColor = getComputedStyle(element).color;
        element.style.color = '#28a745';
        setTimeout(() => {
            element.style.color = originalColor;
        }, 500);
    };

    // Fonction de tri globale
    window.sortTable = function(column) {
        const tbody = table.querySelector('tbody');
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
        rows.sort((a, b) => {
            let aValue = a.cells[getColumnIndex(column)].textContent.trim();
            let bValue = b.cells[getColumnIndex(column)].textContent.trim();
            
            // Conversion des valeurs selon le type de colonne
            if (column === 'liquidity' || column === 'v24hUSD' || column === 'mc' || 
                column === 'holders' || column === 'unique_wallets_24h') {  // Ajout des nouvelles colonnes numériques
                aValue = parseFloat(aValue.replace(/[^\d.-]/g, ''));
                bValue = parseFloat(bValue.replace(/[^\d.-]/g, ''));
            } else if (column === 'v24hChangePercent' || column.includes('ratio') || 
                       column === 'performance' || column === 'wallet_change') {  // Ajout de wallet_change
                aValue = parseFloat(aValue.replace(/[%+]/g, ''));
                bValue = parseFloat(bValue.replace(/[%+]/g, ''));
            
            } else if (column === 'is_pump') {
                aValue = aValue === '✓' ? 1 : 0;
                bValue = bValue === '✓' ? 1 : 0;
            }
            
            // Comparaison
            if (currentSortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
        
        // Réorganiser les lignes
        rows.forEach(row => tbody.appendChild(row));
        
        // Mettre à jour les indicateurs visuels de tri
        updateSortIndicators(column, currentSortOrder);
    };

    function getColumnIndex(column) {
        const columnMap = {
            'symbol': 1,
            'name': 2,
            'liquidity': 3,
            'v24hUSD': 4,
            'mc': 5,
            'v24hChangePercent': 6,
            'volume_liquidity_ratio': 7,
            'volume_mc_ratio': 8,
            'liquidity_mc_ratio': 9,
            'performance': 10,
            'is_pump': 11,
            'bubblemaps': 12,
            'holders': 13,         
            'unique_wallets_24h': 14,
            'wallet_change': 15
        };
        return columnMap[column];
    }

    function updateSortIndicators(column, order) {
        const headers = document.querySelectorAll('th a');
        headers.forEach(header => {
            header.classList.remove('asc', 'desc');
            if (header.dataset.column === column) {
                header.classList.add(order);
            }
        });
    }

    function toggleColumnVisibility(columnIndex, isVisible) {
        const display = isVisible ? '' : 'none';
        
        // Masquer/afficher les cellules d'en-tête
        document.querySelectorAll(`th:nth-child(${columnIndex + 1})`).forEach(th => {
            th.style.display = display;
        });
        
        // Masquer/afficher les cellules du corps
        document.querySelectorAll(`td:nth-child(${columnIndex + 1})`).forEach(td => {
            td.style.display = display;
        });
    }

    function saveColumnVisibility() {
        const visibility = {};
        document.querySelectorAll('.column-options input[type="checkbox"]').forEach(checkbox => {
            visibility[checkbox.dataset.column] = checkbox.checked;
        });
        localStorage.setItem('columnVisibility', JSON.stringify(visibility));
    }

    function restoreColumnVisibility() {
        const savedVisibility = localStorage.getItem('columnVisibility');
        if (savedVisibility) {
            const visibility = JSON.parse(savedVisibility);
            Object.entries(visibility).forEach(([column, isVisible]) => {
                const checkbox = document.querySelector(`.column-options input[data-column="${column}"]`);
                if (checkbox) {
                    checkbox.checked = isVisible;
                    toggleColumnVisibility(getColumnIndex(column), isVisible);
                }
            });
        }
    }

     // Gestion de la visibilité des colonnes
     toggleColumnsButton.addEventListener('click', function() {
        columnsPanel.style.display = columnsPanel.style.display === 'none' ? 'block' : 'none';
        this.textContent = `Visibilité des colonnes ${columnsPanel.style.display === 'none' ? '▼' : '▲'}`;
    });

    // Event listeners pour les checkboxes des colonnes
    document.querySelectorAll('.column-options input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const columnName = this.dataset.column;
            const columnIndex = getColumnIndex(columnName);
            const isVisible = this.checked;
            
            saveColumnVisibility();
            toggleColumnVisibility(columnIndex, isVisible);
        });
    });

    // Gestion des filtres
    function applyFilters() {
        const rows = document.querySelectorAll('tbody tr');
        const filters = {
            liquidity: parseNumericValue(document.getElementById('minLiquidity').value),
            volume: parseNumericValue(document.getElementById('minVolume').value),
            mcapMin: parseNumericValue(document.getElementById('minMc').value),
            mcapMax: parseNumericValue(document.getElementById('maxMc').value),
            suspicious: document.getElementById('filterSuspicious').checked,
            hide24h: document.getElementById('filter24h').checked,
            minHolders: parseNumericValue(document.getElementById('minHolders').value),
            minWallets24h: parseNumericValue(document.getElementById('minWallets24h').value)
        };
        
        let visibleCount = 0;
        
        rows.forEach(row => {
            const values = {
                liquidity: parseNumericValue(row.cells[3].textContent),
                volume: parseNumericValue(row.cells[4].textContent),
                mcap: parseNumericValue(row.cells[5].textContent),
                priceChange: parseFloat(row.cells[6].textContent.replace(/[^0-9.-]+/g, '')),
                isSuspicious: row.querySelector('.suspicious') !== null,
                isLessThan24h: parseFloat(row.cells[6].textContent.replace(/[^0-9.-]+/g, '')) === 0.00,
                holders: parseNumericValue(row.cells[getColumnIndex('holders')].textContent),
                wallets24h: parseNumericValue(row.cells[getColumnIndex('unique_wallets_24h')].textContent)
            
            };
            
            let visible = true;
            
            if (filters.liquidity && values.liquidity < filters.liquidity) visible = false;
            if (filters.volume && values.volume < filters.volume) visible = false;
            if (filters.mcapMin && values.mcap < filters.mcapMin) visible = false;
            if (filters.mcapMax && values.mcap > filters.mcapMax) visible = false;
            if (filters.suspicious && values.isSuspicious) visible = false;
            if (filters.hide24h && values.isLessThan24h) visible = false;
            if (filters.minHolders && values.holders < filters.minHolders) visible = false;
            if (filters.minWallets24h && values.wallets24h < filters.minWallets24h) visible = false;
            
            row.style.display = visible ? '' : 'none';
            if (visible) visibleCount++;
        });
        
        document.getElementById('visibleCount').textContent = `${visibleCount} tokens affichés`;
        
        // Sauvegarder les filtres
        const filtersToSave = {
            minLiquidity: document.getElementById('minLiquidity').value,
            minVolume: document.getElementById('minVolume').value,
            minMc: document.getElementById('minMc').value,
            maxMc: document.getElementById('maxMc').value,
            filterSuspicious: document.getElementById('filterSuspicious').checked,
            filter24h: document.getElementById('filter24h').checked
        };
        localStorage.setItem('tokenFilters', JSON.stringify(filtersToSave));
    }

    // Event listeners pour les filtres
    filterButton.addEventListener('click', applyFilters);
    document.getElementById('resetFilters').addEventListener('click', function() {
        document.getElementById('minLiquidity').value = '';
        document.getElementById('minVolume').value = '';
        document.getElementById('minMc').value = '';
        document.getElementById('maxMc').value = '';
        document.getElementById('filterSuspicious').checked = false;
        document.getElementById('filter24h').checked = true;
        document.getElementById('minHolders').value = '';
        document.getElementById('minWallets24h').value = '';
        applyFilters();
    });

    // Gestion des seuils de détection
    toggleButton.addEventListener('click', function() {
        thresholdsPanel.style.display = thresholdsPanel.style.display === 'none' ? 'block' : 'none';
        this.textContent = `Seuils de détection ${thresholdsPanel.style.display === 'none' ? '▼' : '▲'}`;
    });

    // Gestion des poids
    toggleWeightsButton.addEventListener('click', function() {
        weightsPanel.style.display = weightsPanel.style.display === 'none' ? 'block' : 'none';
        this.textContent = `Coefficients du Score ${weightsPanel.style.display === 'none' ? '▼' : '▲'}`;
    });

    function updateSuspiciousHighlight() {
        const priceChangeMin = parseFloat(document.getElementById('priceChangeMin').value);
        const priceChangeMax = parseFloat(document.getElementById('priceChangeMax').value);
        const volLiqThreshold = parseFloat(document.getElementById('volLiqThreshold').value);
        const volMcThreshold = parseFloat(document.getElementById('volMcThreshold').value);
        const liqMcThreshold = parseFloat(document.getElementById('liqMcThreshold').value);
        const wallets24hThreshold = parseFloat(document.getElementById('wallets24hThreshold').value);
        const holdersThreshold = parseFloat(document.getElementById('holdersThreshold').value);
    
        const rows = document.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const priceChange = parseFloat(row.cells[6].textContent.replace(/[^0-9.-]+/g, ''));
            const volLiqRatio = parseFloat(row.cells[7].textContent);
            const volMcRatio = parseFloat(row.cells[8].textContent);
            const liqMcRatio = parseFloat(row.cells[9].textContent);
            const wallets24h = parseNumericValue(row.cells[getColumnIndex('unique_wallets_24h')].textContent);
            const holders = parseNumericValue(row.cells[getColumnIndex('holders')].textContent);
    
            // Mise à jour des classes suspicious
            row.cells[6].classList.toggle('suspicious', priceChange < priceChangeMin || priceChange > priceChangeMax);
            row.cells[7].classList.toggle('suspicious', volLiqRatio > volLiqThreshold);
            row.cells[8].classList.toggle('suspicious', volMcRatio > volMcThreshold);
            row.cells[9].classList.toggle('suspicious', liqMcRatio < liqMcThreshold);
            row.cells[getColumnIndex('unique_wallets_24h')].classList.toggle('suspicious', wallets24h < wallets24hThreshold); // Inversé
            row.cells[getColumnIndex('holders')].classList.toggle('suspicious', holders < holdersThreshold); // Inversé
        });
    
        // Sauvegarder les seuils
        const thresholds = {
            priceChangeMin: document.getElementById('priceChangeMin').value,
            priceChangeMax: document.getElementById('priceChangeMax').value,
            volLiqThreshold: document.getElementById('volLiqThreshold').value,
            volMcThreshold: document.getElementById('volMcThreshold').value,
            liqMcThreshold: document.getElementById('liqMcThreshold').value,
            wallets24hThreshold: document.getElementById('wallets24hThreshold').value,
            holdersThreshold: document.getElementById('holdersThreshold').value
        };
        localStorage.setItem('tokenThresholds', JSON.stringify(thresholds));
    }

    // Event listeners pour les seuils
    document.querySelectorAll('#thresholdsPanel input').forEach(input => {
        input.addEventListener('change', updateSuspiciousHighlight);
    });

    // Fonction de recherche
    const searchInput = document.getElementById('tokenSearch');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    function searchTokens() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const rows = document.querySelectorAll('table tbody tr');
        let visibleCount = 0;

        rows.forEach(row => {
            const symbol = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
            const name = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
            const address = row.querySelector('.token-select').dataset.address.toLowerCase();

            if (searchTerm === '' || 
                symbol.includes(searchTerm) || 
                name.includes(searchTerm) || 
                address.includes(searchTerm)) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        document.getElementById('visibleCount').textContent = `${visibleCount} tokens affichés`;
    }

    function clearSearch() {
        searchInput.value = '';
        searchTokens();
    }

    // Event listeners pour la recherche
    searchInput.addEventListener('input', searchTokens);
    clearSearchBtn.addEventListener('click', clearSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchTokens();
        }
    });
    // Ajouter les event listeners
    document.addEventListener('DOMContentLoaded', function() {
        const searchInput = document.getElementById('tokenSearch');
        searchInput.addEventListener('input', searchTokens);
        
        // Ajouter la possibilité de presser Entrée pour effectuer la recherche
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchTokens();
            }
        });
    });

    function updateWeightTotal() {
        const weights = [
            parseFloat(document.getElementById('priceChangeWeight').value) || 0,
            parseFloat(document.getElementById('volumeWeight').value) || 0,
            parseFloat(document.getElementById('liquidityWeight').value) || 0,
            parseFloat(document.getElementById('volLiqWeight').value) || 0,
            parseFloat(document.getElementById('volMcWeight').value) || 0,
            parseFloat(document.getElementById('liqMcWeight').value) || 0
        ];
        
        const total = weights.reduce((a, b) => a + b, 0);
        document.getElementById('weightTotal').textContent = total.toFixed(2);
        document.getElementById('weightTotal').style.color = Math.abs(total - 1.0) < 0.01 ? 'inherit' : 'red';
    }

    // Event listeners pour les poids
    const weightInputs = [
        'priceChangeWeight',
        'volumeWeight',
        'liquidityWeight',
        'volLiqWeight',
        'volMcWeight',
        'liqMcWeight'
    ];

    weightInputs.forEach(id => {
        document.getElementById(id).addEventListener('input', updateWeightTotal);
    });

    // Gestion de la comparaison
    selectAll.addEventListener('change', function() {
        tokenCheckboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
        updateCompareButton();
    });

    tokenCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateCompareButton);
    });

    function updateCompareButton() {
        const checkedCount = document.querySelectorAll('.token-select:checked').length;
        selectedCount.textContent = `(${checkedCount} sélectionné${checkedCount > 1 ? 's' : ''})`;
        compareButton.disabled = checkedCount < 2;
    }

    // Gestion du modal de comparaison
    compareButton.addEventListener('click', async function() {
        const selectedAddresses = Array.from(document.querySelectorAll('.token-select:checked'))
            .map(checkbox => checkbox.dataset.address);
        
        if (selectedAddresses.length < 2) return;
        
        try {
            const response = await fetch('/compare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ addresses: selectedAddresses })
            });
            
            const tokens = await response.json();
            
            let comparisonHTML = `
                <div class="comparison-controls">
                    <div class="metric-toggles">
                        <label><input type="checkbox" data-metric="liquidity" checked> Liquidité</label>
                        <label><input type="checkbox" data-metric="volume" checked> Volume 24h</label>
                        <label><input type="checkbox" data-metric="mcap" checked> Market Cap</label>
                        <label><input type="checkbox" data-metric="price" checked> Variation Prix</label>
                        <label><input type="checkbox" data-metric="vol-liq" checked> Vol/Liq</label>
                        <label><input type="checkbox" data-metric="vol-mc" checked> Vol/MC</label>
                        <label><input type="checkbox" data-metric="liq-mc" checked> Liq/MC</label>
                        <label><input type="checkbox" data-metric="score" checked> Score</label>
                        <label><input type="checkbox" data-metric="holders" checked> Holders</label>
                        <label><input type="checkbox" data-metric="wallets" checked> Wallets 24h</label>
                        <label><input type="checkbox" data-metric="wallet-change" checked> Δ Wallets</label>
                    </div>
                </div>
                <table>
                    <tr class="header-row">
                        <th>Métrique</th>
                        ${tokens.map(t => `<th>${t.symbol}</th>`).join('')}
                    </tr>
                    <tr class="metric-row" data-metric="liquidity">
                        <td>Liquidité ($)</td>
                        ${tokens.map(t => `<td>${t.liquidity.toLocaleString()}</td>`).join('')}
                    </tr>
                    <tr class="metric-row" data-metric="volume">
                        <td>Volume 24h ($)</td>
                        ${tokens.map(t => `<td>${t.v24hUSD.toLocaleString()}</td>`).join('')}
                    </tr>
                    <tr class="metric-row" data-metric="mcap">
                        <td>Market Cap ($)</td>
                        ${tokens.map(t => `<td>${t.mc.toLocaleString()}</td>`).join('')}
                    </tr>
                    <tr class="metric-row" data-metric="price">
                        <td>Variation Prix (%)</td>
                        ${tokens.map(t => `<td class="${t.v24hChangePercent > 0 ? 'positive' : 'negative'}">${t.v24hChangePercent.toFixed(2)}%</td>`).join('')}
                    </tr>
                    <tr class="metric-row" data-metric="vol-liq">
                        <td>Vol/Liq Ratio</td>
                        ${tokens.map(t => `<td>${t.volume_liquidity_ratio.toFixed(2)}</td>`).join('')}
                    </tr>
                    <tr class="metric-row" data-metric="vol-mc">
                        <td>Vol/MC Ratio</td>
                        ${tokens.map(t => `<td>${t.volume_mc_ratio.toFixed(2)}</td>`).join('')}
                    </tr>
                    <tr class="metric-row" data-metric="liq-mc">
                        <td>Liq/MC Ratio</td>
                        ${tokens.map(t => `<td>${t.liquidity_mc_ratio.toFixed(2)}</td>`).join('')}
                    </tr>
                    <tr class="metric-row" data-metric="score">
                        <td>Score</td>
                        ${tokens.map(t => `<td>${t.performance.toFixed(2)}</td>`).join('')}
                    </tr>
                    <tr class="metric-row" data-metric="holders">
                        <td>Holders</td>
                        ${tokens.map(t => `<td>${t.holders.toLocaleString()}</td>`).join('')}
                    </tr>
                    <tr class="metric-row" data-metric="wallets">
                        <td>Wallets 24h</td>
                        ${tokens.map(t => `<td>${t.unique_wallets_24h.toLocaleString()}</td>`).join('')}
                    </tr>
                    <tr class="metric-row" data-metric="wallet-change">
                        <td>Δ Wallets (%)</td>
                        ${tokens.map(t => `<td class="${t.wallet_change > 0 ? 'positive' : 'negative'}">${t.wallet_change.toFixed(2)}%</td>`).join('')}
                    </tr>
                </table>
            `;
            
            document.getElementById('comparisonTable').innerHTML = comparisonHTML;
            modal.style.display = 'block';

            // Event listeners pour les toggles
            document.querySelectorAll('.metric-toggles input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    const metric = this.dataset.metric;
                    const row = document.querySelector(`tr[data-metric="${metric}"]`);
                    if (row) {
                        row.style.display = this.checked ? '' : 'none';
                    }
                });
            });
            
        } catch (error) {
            console.error('Erreur lors de la comparaison:', error);
        }
    });

    // Fermeture du modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Initialisation
    function init() {
        // Restaurer les filtres
        const savedFilters = localStorage.getItem('tokenFilters');
        if (savedFilters) {
            const filters = JSON.parse(savedFilters);
            Object.entries(filters).forEach(([key, value]) => {
                const element = document.getElementById(key);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = value;
                    } else {
                        element.value = value;
                    }
                }
            });
        }

        // Restaurer les seuils
        const savedThresholds = localStorage.getItem('tokenThresholds');
        if (savedThresholds) {
            const thresholds = JSON.parse(savedThresholds);
            Object.entries(thresholds).forEach(([key, value]) => {
                const element = document.getElementById(key);
                if (element) element.value = value;
            });
        }

        // Appliquer les filtres initiaux
        applyFilters();
        updateSuspiciousHighlight();
        updateWeightTotal();
        restoreColumnVisibility();
    }

    // Démarrer l'initialisation
    init();
});