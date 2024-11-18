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

    // Variables pour le redimensionnement
    let isResizing = false;
    let currentTh = null;
    let startX = 0;
    let startWidth = 0;

    // Gestion du panneau des seuils
    toggleButton.addEventListener('click', function() {
        const isHidden = thresholdsPanel.style.display === 'none';
        thresholdsPanel.style.display = isHidden ? 'block' : 'none';
        toggleButton.textContent = `Seuils de détection ${isHidden ? '▼' : '▲'}`;
    });

    // Mise à jour des seuils suspects
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

        // Sauvegarder les seuils
        saveThresholds();
    }

    // Sauvegarder les seuils dans localStorage
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

    // Restaurer les seuils depuis localStorage
    function restoreThresholds() {
        const thresholds = JSON.parse(localStorage.getItem('tokenThresholds'));
        if (thresholds) {
            document.getElementById('priceChangeMin').value = thresholds.priceChangeMin;
            document.getElementById('priceChangeMax').value = thresholds.priceChangeMax;
            document.getElementById('volLiqThreshold').value = thresholds.volLiqThreshold;
            document.getElementById('volMcThreshold').value = thresholds.volMcThreshold;
            document.getElementById('liqMcThreshold').value = thresholds.liqMcThreshold;
            updateSuspiciousHighlight();
        }
    }

    // Event listeners pour les seuils
    document.querySelectorAll('#thresholdsPanel input').forEach(input => {
        input.addEventListener('change', updateSuspiciousHighlight);
    });
// Ajouter les event listeners pour les seuils
document.querySelectorAll('#thresholdsPanel input').forEach(input => {
    input.addEventListener('change', updateSuspiciousHighlight);
});

    document.querySelectorAll('th').forEach(th => {
        const resizer = document.createElement('div');
        resizer.className = 'resizer';
        th.appendChild(resizer);

        resizer.addEventListener('mousedown', function(e) {
            isResizing = true;
            currentTh = th;
            startX = e.pageX;
            startWidth = currentTh.offsetWidth;
            document.body.classList.add('resizing');
            e.preventDefault();
            e.stopPropagation();
        });
    });

    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        const width = startWidth + (e.pageX - startX);
        if (width > 50) {
            currentTh.style.width = width + 'px';
            const columnIndex = Array.from(currentTh.parentNode.children).indexOf(currentTh);
            const cells = table.querySelectorAll(`td:nth-child(${columnIndex + 1})`);
            cells.forEach(cell => cell.style.width = width + 'px');
        }
    });

    document.addEventListener('mouseup', function() {
        if (isResizing) {
            isResizing = false;
            document.body.classList.remove('resizing');
            saveColumnWidths();
        }
    });

    // Gestion du scroll horizontal synchronisé
    tableContainer.addEventListener('scroll', function() {
        const scrollLeft = this.scrollLeft;
        document.querySelectorAll('th').forEach(th => {
            th.style.transform = `translateX(${scrollLeft}px)`;
        });
    });

    // Gestion des filtres
    filterButton.addEventListener('click', function() {
        const filter24h = document.getElementById('filter24h').checked;
        const filterSuspicious = document.getElementById('filterSuspicious').checked;
        const minLiquidity = parseFloat(document.getElementById('minLiquidity').value) || 0;
        const minVolume = parseFloat(document.getElementById('minVolume').value) || 0;

        document.querySelectorAll('tbody tr').forEach(row => {
            const isSuspicious = row.querySelector('td.suspicious') !== null;
            const liquidity = parseFloat(row.cells[3].textContent.replace(/[^0-9.-]+/g, ''));
            const volume = parseFloat(row.cells[4].textContent.replace(/[^0-9.-]+/g, ''));
            const change24h = parseFloat(row.cells[6].textContent.replace(/[^0-9.-]+/g, '')); // Delta 24h

            let shouldShow = true;

            if (filter24h && change24h === 0.00) shouldShow = false;
            if (filterSuspicious && isSuspicious) shouldShow = false;
            if (liquidity < minLiquidity) shouldShow = false;
            if (volume < minVolume) shouldShow = false;

            row.style.display = shouldShow ? '' : 'none';
        });

        saveFilters();
    });

    // Gestion de la sélection
    function updateSelection() {
        const selectedTokens = document.querySelectorAll('.token-select:checked');
        const count = selectedTokens.length;
        selectedCount.textContent = `(${count} sélectionné${count > 1 ? 's' : ''})`;
        compareButton.disabled = count < 2;
    }

    selectAll.addEventListener('change', function() {
        tokenCheckboxes.forEach(cb => cb.checked = this.checked);
        updateSelection();
    });

    tokenCheckboxes.forEach(cb => {
        cb.addEventListener('change', updateSelection);
    });

    // Gestion de la comparaison
    function displayComparison(tokens) {
        const comparisonTable = document.getElementById('comparisonTable');
        
        const metrics = [
            {id: 'name', name: 'Nom', key: 'name'},
            {id: 'liquidity', name: 'Liquidité', key: 'liquidity'},
            {id: 'volume', name: 'Volume 24h', key: 'volume'},
            {id: 'mc', name: 'Market Cap', key: 'mc'},
            {id: 'change', name: 'Variation 24h', key: 'change'},
            {id: 'vol_liq', name: 'Volume/Liquidité', key: 'vol_liq'},
            {id: 'vol_mc', name: 'Volume/MC', key: 'vol_mc'},
            {id: 'liq_mc', name: 'Liquidité/MC', key: 'liq_mc'},
            {id: 'performance', name: 'Performance', key: 'performance'}
        ];

        let togglesHtml = '<div class="metric-toggles">Afficher/Masquer : ';
        metrics.forEach(metric => {
            togglesHtml += `
                <label>
                    <input type="checkbox" 
                           class="metric-toggle" 
                           data-metric="${metric.id}" 
                           checked>
                    ${metric.name}
                </label>`;
        });
        togglesHtml += '</div>';

        let tableHtml = '<table class="comparison-table">';
        tableHtml += '<tr><th>Métrique</th>';
        tokens.forEach(token => {
            tableHtml += `<th>${token.symbol}</th>`;
        });
        tableHtml += '</tr>';

        metrics.forEach(metric => {
            tableHtml += `<tr data-metric="${metric.id}">`;
            tableHtml += `<td>${metric.name}</td>`;
            tokens.forEach(token => {
                tableHtml += `<td>${token[metric.key]}</td>`;
            });
            tableHtml += '</tr>';
        });

        tableHtml += '</table>';
        
        comparisonTable.innerHTML = togglesHtml + tableHtml;

        document.querySelectorAll('.metric-toggle').forEach(toggle => {
            toggle.addEventListener('change', function() {
                const metricId = this.dataset.metric;
                const row = document.querySelector(`tr[data-metric="${metricId}"]`);
                if (row) {
                    row.classList.toggle('hidden', !this.checked);
                }
            });
        });
    }

    compareButton.addEventListener('click', function() {
        const selectedTokens = Array.from(document.querySelectorAll('.token-select:checked'))
            .map(cb => {
                const row = cb.closest('tr');
                return {
                    symbol: row.cells[1].textContent,
                    name: row.cells[2].textContent,
                    liquidity: row.cells[3].textContent,
                    volume: row.cells[4].textContent,
                    mc: row.cells[5].textContent,
                    change: row.cells[6].textContent,
                    vol_liq: row.cells[7].textContent,
                    vol_mc: row.cells[8].textContent,
                    liq_mc: row.cells[9].textContent,
                    performance: row.cells[10].textContent
                };
            });

        displayComparison(selectedTokens);
        modal.style.display = "block";
    });

    // Gestion de la modal
    closeBtn.addEventListener('click', function() {
        modal.style.display = "none";
    });

    window.addEventListener('click', function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    });

    // Fonctions utilitaires
    function saveColumnWidths() {
        const widths = {};
        document.querySelectorAll('th').forEach((th, index) => {
            widths[index] = th.style.width;
        });
        localStorage.setItem('columnWidths', JSON.stringify(widths));
    }

    function restoreColumnWidths() {
        const widths = JSON.parse(localStorage.getItem('columnWidths'));
        if (widths) {
            document.querySelectorAll('th').forEach((th, index) => {
                if (widths[index]) {
                    th.style.width = widths[index];
                    const cells = table.querySelectorAll(`td:nth-child(${index + 1})`);
                    cells.forEach(cell => cell.style.width = widths[index]);
                }
            });
        }
    }

    function saveFilters() {
        const filters = {
            filter24h: document.getElementById('filter24h').checked,
            filterSuspicious: document.getElementById('filterSuspicious').checked,
            minLiquidity: document.getElementById('minLiquidity').value,
            minVolume: document.getElementById('minVolume').value
        };
        localStorage.setItem('tokenFilters', JSON.stringify(filters));
    }

    function restoreFilters() {
        const filters = JSON.parse(localStorage.getItem('tokenFilters'));
        if (filters) {
            document.getElementById('filter24h').checked = filters.filter24h;
            document.getElementById('filterSuspicious').checked = filters.filterSuspicious;
            document.getElementById('minLiquidity').value = filters.minLiquidity;
            document.getElementById('minVolume').value = filters.minVolume;
            filterButton.click();
        }
    }

    // Initialisation
    restoreColumnWidths();
    restoreFilters();
    restoreThresholds();
});