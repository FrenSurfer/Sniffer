class FilterManager {
  constructor() {
    this.filterButton = document.getElementById("applyFilters");
    this.resetButton = document.getElementById("resetFilters");
    this.toggleButton = document.getElementById("toggleThresholds");
    this.thresholdsPanel = document.getElementById("thresholdsPanel");
    this.visibleCountElement = document.getElementById("visibleCount");

    this.initializeEventListeners();
    this.restoreFilters();
    this.restoreThresholds();
  }

  initializeEventListeners() {
    this.filterButton.addEventListener("click", () => this.applyFilters());
    this.resetButton.addEventListener("click", () => this.resetFilters());
    this.toggleButton.addEventListener("click", () =>
      this.toggleThresholdsPanel()
    );

    document
      .querySelectorAll("#thresholdsPanel input, .filters-panel input")
      .forEach((input) => {
        input.addEventListener("change", () => {
          if (input.closest("#thresholdsPanel")) {
            this.updateSuspiciousHighlight();
          } else {
            this.applyFilters();
          }
        });
      });
  }
  toggleThresholdsPanel() {
    const isVisible = this.thresholdsPanel.style.display === "none";
    this.thresholdsPanel.style.display = isVisible ? "block" : "none";
    this.toggleButton.textContent = `Detection thresholds (suspicious highlight) ${
      isVisible ? "▲" : "▼"
    }`;
  }

  getFilterValues() {
    return {
      liquidity: this.parseNumericValue(
        document.getElementById("minLiquidity").value
      ),
      volume: this.parseNumericValue(
        document.getElementById("minVolume").value
      ),
      mcapMin: this.parseNumericValue(document.getElementById("minMc").value),
      mcapMax: this.parseNumericValue(document.getElementById("maxMc").value),
      suspicious: document.getElementById("filterSuspicious").checked,
      hide24h: document.getElementById("filter24h").checked,
      minHolders: this.parseNumericValue(
        document.getElementById("minHolders").value
      ),
      minWallets24h: this.parseNumericValue(
        document.getElementById("minWallets24h").value
      ),
      volumeChangeMin: this.parseNumericValue(
        document.getElementById("minVolumeChange").value
      ),
      volumeChangeMax: this.parseNumericValue(
        document.getElementById("maxVolumeChange").value
      ),
      priceChangeMin: this.parseNumericValue(
        document.getElementById("minPriceChange").value
      ),
      priceChangeMax: this.parseNumericValue(
        document.getElementById("maxPriceChange").value
      ),
    };
  }

  parseNumericValue(value) {
    if (typeof value === "string") {
      return parseFloat(value.replace(/[^\d.-]/g, "")) || 0;
    }
    return parseFloat(value) || 0;
  }

  getRowValues(row) {
    return {
      liquidity: this.parseNumericValue(row.cells[3].textContent),
      volume: this.parseNumericValue(row.cells[4].textContent),
      mcap: this.parseNumericValue(row.cells[5].textContent),
      volumeChange: parseFloat(
        row.cells[6].textContent.replace(/[^0-9.-]+/g, "")
      ),
      volLiqRatio: parseFloat(row.cells[7].textContent),
      volMcRatio: parseFloat(row.cells[8].textContent),
      liqMcRatio: parseFloat(row.cells[9].textContent),
      isSuspicious: [6, 7, 8, 9].some((index) =>
        row.cells[index].classList.contains("suspicious")
      ),
      isLessThan24h:
        parseFloat(row.cells[6].textContent.replace(/[^0-9.-]+/g, "")) === 0,
    };
  }

  hasActiveFilters() {
    const filters = this.getFilterValues();

    return Object.values(filters).some(
      (value) =>
        (typeof value === "boolean" && value) ||
        (typeof value === "number" && value !== 0)
    );
  }

  applyFilters() {
    const rows = document.querySelectorAll("tbody tr");
    const filters = this.getFilterValues();
    let visibleCount = 0;

    const hasFilters = this.hasActiveFilters();

    rows.forEach((row) => {
      if (!hasFilters) {
        row.style.display = "";
        visibleCount++;
      } else {
        const values = this.getRowValues(row);
        const visible = this.checkRowVisibility(values, filters);
        row.style.display = visible ? "" : "none";
        if (visible) visibleCount++;
      }
    });

    this.visibleCountElement.textContent = `${visibleCount} tokens`;
    this.saveFilters();
  }

  checkRowVisibility(values, filters) {
    if (filters.hide24h && values.isLessThan24h) return false;
    if (filters.liquidity && values.liquidity < filters.liquidity) return false;
    if (filters.volume && values.volume < filters.volume) return false;
    if (filters.mcapMin && values.mcap < filters.mcapMin) return false;
    if (filters.mcapMax && values.mcap > filters.mcapMax) return false;
    if (filters.suspicious && values.isSuspicious) return false;
    if (filters.minHolders && values.holders < filters.minHolders) return false;
    if (filters.minWallets24h && values.wallets24h < filters.minWallets24h)
      return false;
    if (
      filters.volumeChangeMin &&
      values.volumeChange < filters.volumeChangeMin
    )
      return false;
    if (
      filters.volumeChangeMax &&
      values.volumeChange > filters.volumeChangeMax
    )
      return false;
    return true;
  }

  resetFilters() {
    const filterInputs = {
      minLiquidity: "",
      minVolume: "",
      minMc: "",
      maxMc: "",
      filterSuspicious: false,
      filter24h: true,
      minHolders: "",
      minWallets24h: "",
      minVolumeChange: "",
      maxVolumeChange: "",
      minPriceChange: "",
      maxPriceChange: "",
    };

    Object.entries(filterInputs).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        if (element.type === "checkbox") {
          element.checked = value;
        } else {
          element.value = value;
        }
      }
    });

    this.applyFilters();
  }

  saveFilters() {
    const filtersToSave = {
      minLiquidity: document.getElementById("minLiquidity").value,
      minVolume: document.getElementById("minVolume").value,
      minMc: document.getElementById("minMc").value,
      maxMc: document.getElementById("maxMc").value,
      filterSuspicious: document.getElementById("filterSuspicious").checked,
      filter24h: document.getElementById("filter24h").checked,
      minHolders: document.getElementById("minHolders").value,
      minWallets24h: document.getElementById("minWallets24h").value,
    };
    localStorage.setItem("tokenFilters", JSON.stringify(filtersToSave));
  }

  restoreFilters() {
    const savedFilters = localStorage.getItem("tokenFilters");
    if (savedFilters) {
      const filters = JSON.parse(savedFilters);
      Object.entries(filters).forEach(([key, value]) => {
        const element = document.getElementById(key);
        if (element) {
          if (element.type === "checkbox") {
            element.checked = value;
          } else {
            element.value = value;
          }
        }
      });
    }
  }

  updateSuspiciousHighlight() {
    const thresholds = {
      volumeChangeMin: parseFloat(
        document.getElementById("volumeChangeMin").value
      ),
      volumeChangeMax: parseFloat(
        document.getElementById("volumeChangeMax").value
      ),
      priceChangeMin: parseFloat(
        document.getElementById("priceChangeMin").value
      ),
      priceChangeMax: parseFloat(
        document.getElementById("priceChangeMax").value
      ),
      volLiqThreshold: parseFloat(
        document.getElementById("volLiqThreshold").value
      ),
      volMcThreshold: parseFloat(
        document.getElementById("volMcThreshold").value
      ),
      liqMcThreshold: parseFloat(
        document.getElementById("liqMcThreshold").value
      ),
      wallets24hThreshold: parseFloat(
        document.getElementById("wallets24hThreshold").value
      ),
      holdersThreshold: parseFloat(
        document.getElementById("holdersThreshold").value
      ),
    };

    const rows = document.querySelectorAll("tbody tr");
    rows.forEach((row) => this.updateRowSuspiciousStatus(row, thresholds));

    this.saveThresholds(thresholds);
  }

  updateRowSuspiciousStatus(row, thresholds) {
    const cells = {
      volumeChange: parseFloat(
        row.cells[6].textContent.replace(/[^0-9.-]+/g, "")
      ),
      volLiqRatio: parseFloat(row.cells[7].textContent),
      volMcRatio: parseFloat(row.cells[8].textContent),
      liqMcRatio: parseFloat(row.cells[9].textContent),
    };

    row.cells[6].classList.toggle(
      "suspicious",
      cells.volumeChange < thresholds.volumeChangeMin ||
        cells.volumeChange > thresholds.volumeChangeMax
    );
    row.cells[7].classList.toggle(
      "suspicious",
      cells.volLiqRatio > thresholds.volLiqThreshold
    );
    row.cells[8].classList.toggle(
      "suspicious",
      cells.volMcRatio > thresholds.volMcThreshold
    );
    row.cells[9].classList.toggle(
      "suspicious",
      cells.liqMcRatio < thresholds.liqMcThreshold
    );
  }

  saveThresholds(thresholds) {
    localStorage.setItem("tokenThresholds", JSON.stringify(thresholds));
  }

  restoreThresholds() {
    const savedThresholds = localStorage.getItem("tokenThresholds");
    if (savedThresholds) {
      const thresholds = JSON.parse(savedThresholds);
      Object.entries(thresholds).forEach(([key, value]) => {
        const element = document.getElementById(key);
        if (element) element.value = value;
      });
      this.updateSuspiciousHighlight();
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.filterManager = new FilterManager();
});
