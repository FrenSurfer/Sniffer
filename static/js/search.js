class SearchManager {
    constructor() {
        this.searchInput = document.getElementById('tokenSearch');
        this.clearSearchBtn = document.querySelector('.clear-search');
        this.table = document.querySelector('table');
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.searchInput.addEventListener('input', () => this.handleSearch());
        this.clearSearchBtn.addEventListener('click', () => this.clearSearch());
    }

    handleSearch() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const rows = this.table.querySelectorAll('tbody tr');
        let visibleCount = 0;

        rows.forEach(row => {
            const symbol = row.cells[1].textContent.toLowerCase();
            const name = row.cells[2].textContent.toLowerCase();
            const isVisible = symbol.includes(searchTerm) || 
                            name.includes(searchTerm);

            // Ne pas cacher une ligne si elle est déjà cachée par les filtres
            if (row.style.display !== 'none' || isVisible) {
                row.style.display = isVisible ? '' : 'none';
            }

            if (isVisible && row.style.display !== 'none') {
                visibleCount++;
            }
        });

        // Mettre à jour le compteur de tokens visibles
        document.getElementById('visibleCount').textContent = 
            `${visibleCount} tokens affichés`;

        // Afficher/cacher le bouton de réinitialisation
        this.clearSearchBtn.style.display = 
            this.searchInput.value ? 'block' : 'none';
    }

    clearSearch() {
        this.searchInput.value = '';
        this.clearSearchBtn.style.display = 'none';
        
        // Réappliquer les filtres actuels
        if (window.filterManager) {
            window.filterManager.applyFilters();
        } else {
            // Fallback si filterManager n'est pas disponible
            this.table.querySelectorAll('tbody tr').forEach(row => {
                row.style.display = '';
            });
        }
    }

    // Méthode publique pour réinitialiser la recherche
    reset() {
        this.clearSearch();
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    window.searchManager = new SearchManager();
});