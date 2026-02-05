function parseNumericValue(value) {
  if (typeof value === "string") {
    return parseFloat(value.replace(/[^\d.-]/g, "")) || 0;
  }
  return parseFloat(value) || 0;
}

window.copyWithEffect = function (element, address) {
  navigator.clipboard.writeText(address);
  element.style.transition = "color 0.3s";
  const originalColor = getComputedStyle(element).color;
  element.style.color = "#28a745";
  setTimeout(() => {
    element.style.color = originalColor;
  }, 500);
};

function refreshCache() {
  fetch("/refresh-cache")
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        location.reload();
      } else {
        alert("Refresh error: " + data.error);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Error refreshing data");
    });
}
