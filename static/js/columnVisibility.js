class ColumnVisibilityManager {
  constructor() {
    this.toggleColumnsButton = document.getElementById("toggleColumns");
    this.columnVisibilityContainer = document.getElementById(
      "columnVisibilityContainer"
    );
    this.columnsPanel = document.getElementById("columnsPanel");
    this.table = document.querySelector("table");

    this.columnDefinitions = [
      { id: "select", label: "Selection", index: 1 },
      { id: "symbol", label: "Symbol", index: 2 },
      { id: "name", label: "Name", index: 3 },
      { id: "liquidity", label: "Liquidity", index: 4 },
      { id: "v24hUSD", label: "Volume 24h", index: 5 },
      { id: "mc", label: "Market Cap", index: 6 },
      { id: "v24hChangePercent", label: "Δ Volume", index: 7 },
      { id: "price_change_24h", label: "Δ Price", index: 8 },
      { id: "volume_liquidity_ratio", label: "Vol/Liq", index: 9 },
      { id: "volume_mc_ratio", label: "Vol/MC", index: 10 },
      { id: "liquidity_mc_ratio", label: "Liq/MC", index: 11 },
      { id: "performance", label: "Score", index: 12 },
      { id: "holders", label: "Holders", index: 13 },
      { id: "unique_wallets_24h", label: "Wallets 24h", index: 14 },
      { id: "wallet_change", label: "Δ Wallets", index: 15 },
      { id: "is_pump", label: "Pump", index: 16 },
      { id: "bubblemaps", label: "Bubblemaps", index: 17 },
    ];

    this.initializePanel();
    this.initializeEventListeners();
    this.restoreColumnVisibility();
  }

  initializePanel() {
    if (!this.columnsPanel) return;
  }

  initializeEventListeners() {
    this.toggleColumnsButton.addEventListener("click", () => {
      const container = this.columnVisibilityContainer;
      if (!container) return;
      const isVisible = container.style.display === "none";
      container.style.display = isVisible ? "block" : "none";
      this.toggleColumnsButton.textContent = `Columns ${isVisible ? "▲" : "▼"}`;
    });

    document
      .querySelectorAll('.column-options input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          this.toggleColumnVisibility(
            this.getColumnIndex(checkbox.dataset.column),
            checkbox.checked
          );
          this.saveColumnVisibility();
        });
      });
  }

  toggleColumnVisibility(columnIndex, isVisible) {
    const display = isVisible ? "" : "none";
    this.table
      .querySelectorAll(`th:nth-child(${columnIndex})`)
      .forEach((th) => {
        th.style.display = display;
      });
    this.table
      .querySelectorAll(`td:nth-child(${columnIndex})`)
      .forEach((td) => {
        td.style.display = display;
      });
  }

  getColumnIndex(columnId) {
    const column = this.columnDefinitions.find((col) => col.id === columnId);
    return column ? column.index : 0;
  }

  saveColumnVisibility() {
    const visibility = {};
    document
      .querySelectorAll('.column-options input[type="checkbox"]')
      .forEach((checkbox) => {
        visibility[checkbox.dataset.column] = checkbox.checked;
      });
    localStorage.setItem("columnVisibility", JSON.stringify(visibility));
  }

  restoreColumnVisibility() {
    const savedVisibility = localStorage.getItem("columnVisibility");
    if (savedVisibility) {
      const visibility = JSON.parse(savedVisibility);
      Object.entries(visibility).forEach(([column, isVisible]) => {
        const checkbox = document.querySelector(
          `.column-options input[data-column="${column}"]`
        );
        if (checkbox) {
          checkbox.checked = isVisible;
          this.toggleColumnVisibility(this.getColumnIndex(column), isVisible);
        }
      });
    }
  }

  resetColumnVisibility() {
    document
      .querySelectorAll('.column-options input[type="checkbox"]')
      .forEach((checkbox) => {
        if (!checkbox.disabled) {
          checkbox.checked = true;
          this.toggleColumnVisibility(
            this.getColumnIndex(checkbox.dataset.column),
            true
          );
        }
      });
    this.saveColumnVisibility();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.columnVisibilityManager = new ColumnVisibilityManager();
});
