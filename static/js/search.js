class SearchManager {
  constructor() {
    this.searchInput = document.getElementById("tokenSearch");
    this.clearSearchBtn = document.querySelector(".clear-search");
    this.table = document.querySelector("table");

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    this.searchInput.addEventListener("input", () => this.handleSearch());
    this.clearSearchBtn.addEventListener("click", () => this.clearSearch());
  }

  handleSearch() {
    const searchTerm = this.searchInput.value.toLowerCase();
    const rows = this.table.querySelectorAll("tbody tr");
    let visibleCount = 0;

    rows.forEach((row) => {
      const symCell = row.cells[1];
      const nameCell = row.cells[2];
      const symbol = (
        symCell.querySelector(".token-link")?.textContent || symCell.textContent
      ).toLowerCase();
      const name = (
        nameCell.querySelector(".token-link")?.textContent ||
        nameCell.textContent
      ).toLowerCase();
      const isVisible =
        symbol.includes(searchTerm) || name.includes(searchTerm);

      if (row.style.display !== "none" || isVisible) {
        row.style.display = isVisible ? "" : "none";
      }

      if (isVisible && row.style.display !== "none") {
        visibleCount++;
      }
    });

    document.getElementById(
      "visibleCount"
    ).textContent = `${visibleCount} tokens`;

    this.clearSearchBtn.style.display = this.searchInput.value
      ? "block"
      : "none";
  }

  clearSearch() {
    this.searchInput.value = "";
    this.clearSearchBtn.style.display = "none";
    if (window.filterManager) {
      window.filterManager.applyFilters();
    } else {
      this.table.querySelectorAll("tbody tr").forEach((row) => {
        row.style.display = "";
      });
    }
  }

  reset() {
    this.clearSearch();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.searchManager = new SearchManager();
});
