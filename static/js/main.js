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

    // Fonctions utilitaires
    function parseNumericValue(value) {
        if (typeof value === 'string') {
            return parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
        }
        return parseFloat(value) || 0;
    }

    // Gestion des filtres
    function applyFilters() {
        const rows = document.querySelectorAll('tbody tr');
        const filters = {
            liquidity: parseNumericValue(document.getElementById('minLiquidity').value),
            volume: parseNumericValue(document.getElementById('minVolume').value),
            mcapMin: parseNumericValue(document.getElementById('minMc').value),
            mcapMax: parseNumericValue(document.getElementById('maxMc').value),
            suspicious: document.getElementById('filterSuspicious').checked
        };
        
        let visibleCount = 0;
        
        rows.forEach(row => {
            // Extraire toutes les valeurs de la ligne
            const values = {
                liquidity: parseNumericValue(row.cells[3].textContent),
                volume: parseNumericValue(row.cells[4].textContent),
                mcap: parseNumericValue(row.cells[5].textContent),
                isSuspicious: row.querySelector('.suspicious') !== null
            };
            
            // Vérifier chaque filtre indépendamment
            const meetsFilters = 
                // Filtre de liquidité
                (filters.liquidity === 0 || values.liquidity >= filters.liquidity) &&
                // Filtre de volume
                (filters.volume === 0 || values.volume >= filters.volume) &&
                // Filtres de Market Cap (min et max)
                (filters.mcapMin === 0 || values.mcap >= filters.mcapMin) &&
                (filters.mcapMax === 0 || values.mcap <= filters.mcapMax) &&
                // Filtre des tokens suspects
                (!filters.suspicious || !values.isSuspicious);
            
            // Appliquer la visibilité
            row.style.display = meetsFilters ? '' : 'none';
            if (meetsFilters) visibleCount++;
            
            // Debug log pour voir les valeurs
            if (!meetsFilters) {
                console.log('Token filtré:', {
                    symbol: row.cells[1].textContent,
                    values,
                    filters,
                    failedLiquidity: filters.liquidity > 0 && values.liquidity < filters.liquidity,
                    failedVolume: filters.volume > 0 && values.volume < filters.volume,
                    failedMcapMin: filters.mcapMin > 0 && values.mcap < filters.mcapMin,
                    failedMcapMax: filters.mcapMax > 0 && values.mcap > filters.mcapMax,
                    failedSuspicious: filters.suspicious && values.isSuspicious
                });
            }
        });
        
        updateVisibleCount(visibleCount);
        saveFilters();
    }

    // Réinitialisation des filtres
    function resetFilters() {
        document.getElementById('minLiquidity').value = '';
        document.getElementById('minVolume').value = '';
        document.getElementById('minMc').value = '';
        document.getElementById('maxMc').value = '';
        document.getElementById('filterSuspicious').checked = false;
        document.getElementById('filter24h').checked = true;

        localStorage.removeItem('tokenFilters');
        applyFilters();
    }

    // Gestion des seuils suspects
    function updateSuspiciousHighlight() {
        const priceChangeMin = parseFloat(document.getElementById('priceChangeMin').value);
        const priceChangeMax = parseFloat(document.getElementById('priceChangeMax').value);
        const volLiqThreshold = parseFloat(document.getElementById('volLiqThreshold').value);
        const volMcThreshold = parseFloat(document.getElementById('volMcThreshold').value);
        const liqMcThreshold = parseFloat(document.getElementById('liqMcThreshold').value);

        document.querySelectorAll('tbody tr').forEach(row => {
            const priceChange = parseFloat(row.cells[6].textContent.replace(/[^0-9.-]+/g, ''));
            const volLiqRatio = parseFloat(row.cells[7].textContent);
            const volMcRatio = parseFloat(row.cells[8].textContent);
            const liqMcRatio = parseFloat(row.cells[9].textContent);

            row.cells[6].classList.toggle('suspicious', 
                priceChange < priceChangeMin || priceChange > priceChangeMax);
            row.cells[7].classList.toggle('suspicious', 
                volLiqRatio > volLiqThreshold);
            row.cells[8].classList.toggle('suspicious', 
                volMcRatio > volMcThreshold);
            row.cells[9].classList.toggle('suspicious', 
                liqMcRatio < liqMcThreshold);
        });

        saveThresholds();
        applyFilters();
    }

    // Gestion des coefficients du score
    function updateWeightTotal() {
        const weights = getWeights();
        const total = Object.values(weights).reduce((a, b) => a + b, 0);
        document.getElementById('weightTotal').textContent = total.toFixed(2);
        document.getElementById('weightTotal').style.color = 
            Math.abs(total - 1.0) < 0.01 ? 'inherit' : 'red';
    }

    function getWeights() {
        return {
            priceChange: parseFloat(document.getElementById('priceChangeWeight').value) || 0,
            volume: parseFloat(document.getElementById('volumeWeight').value) || 0,
            liquidity: parseFloat(document.getElementById('liquidityWeight').value) || 0,
            volLiq: parseFloat(document.getElementById('volLiqWeight').value) || 0,
            volMc: parseFloat(document.getElementById('volMcWeight').value) || 0,
            liqMc: parseFloat(document.getElementById('liqMcWeight').value) || 0
        };
    }

    // Gestion de la persistance
    function saveFilters() {
        const filters = {
            minLiquidity: document.getElementById('minLiquidity').value,
            minVolume: document.getElementById('minVolume').value,
            minMc: document.getElementById('minMc').value,
            maxMc: document.getElementById('maxMc').value,
            hideSuspicious: document.getElementById('filterSuspicious').checked
        };
        localStorage.setItem('tokenFilters', JSON.stringify(filters));
    }

    function saveThresholds() {
        const thresholds = {
            priceChangeMin: document.getElementById('priceChangeMin').value,
            priceChangeMax: document.getElementById('priceChangeMax').value,
            volLiqThreshold: document.getElementById('volLiqThreshold').value,
            volMcThreshold: document.getElementById('volMcThreshold').value,
            liqMcThreshold: document.getElementById('liqMcThreshold').value
        };
        localStorage.setItem('tokenThresholds', JSON.stringify(thresholds));
    }

    function updateVisibleCount(count) {
        const countElement = document.getElementById('visibleCount');
        if (countElement) {
            countElement.textContent = `${count} tokens affichés`;
        }
    }

    // Event Listeners
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    document.getElementById('applyFilters').addEventListener('click', applyFilters);

    toggleButton.addEventListener('click', () => {
        const isHidden = thresholdsPanel.style.display === 'none';
        thresholdsPanel.style.display = isHidden ? 'block' : 'none';
        toggleButton.textContent = `Seuils de détection ${isHidden ? '▼' : '▲'}`;
    });

    toggleWeightsButton.addEventListener('click', () => {
        const isHidden = weightsPanel.style.display === 'none';
        weightsPanel.style.display = isHidden ? 'block' : 'none';
        toggleWeightsButton.textContent = `Coefficients du Score ${isHidden ? '▼' : '▲'}`;
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
    }

    // Démarrer l'initialisation
    init();
});