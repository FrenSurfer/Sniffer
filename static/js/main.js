class AppManager {
  constructor() {
    this.filterManager = window.filterManager;
    this.searchManager = window.searchManager;
    this.comparisonManager = window.comparisonManager;
    this.sortManager = window.sortManager;
    this.initializeGlobalFunctions();
  }

  initializeGlobalFunctions() {
    window.copyWithEffect = (element, address) => {
      navigator.clipboard.writeText(address);
      element.style.transition = "color 0.3s";
      const originalColor = getComputedStyle(element).color;
      element.style.color = "#28a745";
      setTimeout(() => {
        element.style.color = originalColor;
      }, 500);
    };

    window.refreshCache = async () => {
      try {
        const response = await fetch("/refresh-cache");
        const data = await response.json();
        if (data.success) {
          location.reload();
        } else {
          alert("Refresh error: " + data.error);
        }
      } catch (error) {
        console.error("Error:", error);
        alert("Error refreshing data");
      }
    };
  }

  reset() {
    this.filterManager.resetFilters();
    this.searchManager.reset();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const weightsBtn = document.getElementById("toggleWeights");
  const weightsContainer = document.getElementById("scoreWeightsContainer");
  if (weightsBtn && weightsContainer) {
    weightsBtn.addEventListener("click", () => {
      const isVisible = weightsContainer.style.display === "none";
      weightsContainer.style.display = isVisible ? "block" : "none";
      weightsBtn.textContent = "Score weights " + (isVisible ? "▲" : "▼");
    });
  }
  setTimeout(() => {
    window.appManager = new AppManager();
    window.filterManager.applyFilters();
  }, 0);
});
