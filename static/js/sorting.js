class SortManager {
  constructor() {
    this.table = document.querySelector("table");
    this.columnMap = {
      symbol: 1,
      name: 2,
      liquidity: 3,
      volume: 4,
      mc: 5,
      v24hChangePercent: 6,
      volume_liquidity_ratio: 7,
      volume_mc_ratio: 8,
      liquidity_mc_ratio: 9,
      is_pump: 10,
      bubblemaps: 11,
    };

    this.suspiciousColumns = [
      "v24hChangePercent",
      "volume_liquidity_ratio",
      "volume_mc_ratio",
      "liquidity_mc_ratio",
    ];

    this.initializeSorting();
  }

  initializeSorting() {
    window.sortTable = (column) => this.sortTable(column);
  }

  sortTable(column) {
    const tbody = this.table.querySelector("tbody");
    const rows = Array.from(tbody.querySelectorAll("tr"));

    let currentSortOrder = tbody.getAttribute("data-sort-order") || "asc";
    let currentSortColumn = tbody.getAttribute("data-sort-column");
    if (currentSortColumn === column) {
      currentSortOrder = currentSortOrder === "asc" ? "desc" : "asc";
    } else {
      currentSortOrder = "asc";
    }
    tbody.setAttribute("data-sort-order", currentSortOrder);
    tbody.setAttribute("data-sort-column", column);
    rows.sort((a, b) => this.compareValues(a, b, column, currentSortOrder));
    rows.forEach((row) => tbody.appendChild(row));
    this.updateSortIndicators(column, currentSortOrder);
  }

  compareValues(rowA, rowB, column, order) {
    if (column === "is_pump") {
      const aValue =
        rowA.cells[this.getColumnIndex(column)].textContent === "✓" ? 1 : 0;
      const bValue =
        rowB.cells[this.getColumnIndex(column)].textContent === "✓" ? 1 : 0;
      return order === "asc" ? aValue - bValue : bValue - aValue;
    }

    const cellA = rowA.cells[this.getColumnIndex(column)];
    const cellB = rowB.cells[this.getColumnIndex(column)];
    let aValue = (
      cellA.querySelector(".token-link")?.textContent || cellA.textContent
    ).trim();
    let bValue = (
      cellB.querySelector(".token-link")?.textContent || cellB.textContent
    ).trim();

    if (this.isSuspiciousColumn(column)) {
      return this.compareSuspiciousValues(aValue, bValue, order);
    }

    return this.compareNormalValues(aValue, bValue, column, order);
  }

  compareNormalValues(aValue, bValue, column, order) {
    if (this.isNumericColumn(column)) {
      const aNum = parseFloat(aValue.replace(/[^\d.-]/g, ""));
      const bNum = parseFloat(bValue.replace(/[^\d.-]/g, ""));
      return order === "asc" ? aNum - bNum : bNum - aNum;
    } else if (this.isPercentageColumn(column)) {
      const aNum = parseFloat(aValue.replace(/[%+]/g, ""));
      const bNum = parseFloat(bValue.replace(/[%+]/g, ""));

      if (column === "v24hChangePercent") {
        return order === "asc" ? aNum - bNum : bNum - aNum;
      }
      return order === "asc" ? aNum - bNum : bNum - aNum;
    }
    return order === "asc"
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue);
  }

  compareSuspiciousValues(aValue, bValue, order) {
    const aNum = parseFloat(aValue.replace(/[%+]/g, ""));
    const bNum = parseFloat(bValue.replace(/[%+]/g, ""));
    return order === "asc" ? aNum - bNum : bNum - aNum;
  }

  isNumericColumn(column) {
    return ["liquidity", "volume", "mc"].includes(column);
  }

  isPercentageColumn(column) {
    return (
      ["v24hChangePercent", "wallet_change"].includes(column) ||
      column.includes("ratio") ||
      column === "performance"
    );
  }

  isSuspiciousColumn(column) {
    return this.suspiciousColumns.includes(column);
  }

  getColumnIndex(column) {
    return this.columnMap[column] || 0;
  }

  updateSortIndicators(column, order) {
    const headers = document.querySelectorAll("th a");
    headers.forEach((header) => {
      header.classList.remove("asc", "desc");
      if (header.dataset.column === column) {
        header.classList.add(order);
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.sortManager = new SortManager();
});
