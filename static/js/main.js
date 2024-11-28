class AppManager {
    constructor() {
        // Initialisation des gestionnaires
        this.filterManager = window.filterManager;
        this.searchManager = window.searchManager;
        this.columnVisibilityManager = window.columnVisibilityManager;
        this.comparisonManager = window.comparisonManager;
        this.sortManager = window.sortManager;

        // Initialisation des fonctions globales
        this.initializeGlobalFunctions();
    }

    initializeGlobalFunctions() {
        // Fonction de copie d'adresse avec effet visuel
        window.copyWithEffect = (element, address) => {
            navigator.clipboard.writeText(address);
            element.style.transition = 'color 0.3s';
            const originalColor = getComputedStyle(element).color;
            element.style.color = '#28a745';
            setTimeout(() => {
                element.style.color = originalColor;
            }, 500);
        };

        // Fonction de rafraîchissement du cache
        window.refreshCache = async () => {
            try {
                const response = await fetch('/refresh-cache');
                const data = await response.json();
                if (data.success) {
                    location.reload();
                } else {
                    alert('Erreur lors du rafraîchissement: ' + data.error);
                }
            } catch (error) {
                console.error('Erreur:', error);
                alert('Erreur lors du rafraîchissement des données');
            }
        };
    }

    // Méthode pour réinitialiser toute l'application
    reset() {
        this.filterManager.resetFilters();
        this.searchManager.reset();
        this.columnVisibilityManager.resetColumnVisibility();
    }
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    // Attendre que tous les gestionnaires soient initialisés
    setTimeout(() => {
        window.appManager = new AppManager();
        
        // Appliquer les configurations initiales
        window.filterManager.applyFilters();
        window.columnVisibilityManager.restoreColumnVisibility();
    }, 0);
});