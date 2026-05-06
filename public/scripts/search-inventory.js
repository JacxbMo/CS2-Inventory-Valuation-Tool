// ---- Shared helpers ----------------------------------------------------

function getItemPrice(item) {
  const priceElement = item.querySelector(".grid-item-value");
  if (!priceElement) return null;

  const rawPrice = priceElement.firstChild.textContent.trim();
  if (rawPrice === "N/A") return null;

  const cleanPrice = rawPrice.replace("€", "").replace(/,/g, "").trim();
  const price = parseFloat(cleanPrice);

  return Number.isNaN(price) ? null : price;
}

function formatPrice(price) {
  return `€${Number(price).toLocaleString("en-GB")}`;
}

function applyVisibility(item) {
  const searchOk = item.dataset.searchMatch !== "false";
  const priceOk = item.dataset.priceMatch !== "false";
  const floatOk = item.dataset.floatMatch !== "false";
  item.style.display = searchOk && priceOk && floatOk ? "" : "none";
}

// ---- Search ------------------------------------------------------------

const searchBox = document.getElementById("inventory-search");

function applySearch() {
  const searchText = searchBox.value.toLowerCase().trim();
  const gridItems = document.querySelectorAll("#item-grid .grid-item");

  gridItems.forEach((item) => {
    const title =
      item
        .querySelector(".grid-item-title-container p")
        ?.textContent.toLowerCase()
        .trim() || "";

    const wear =
      item.querySelector(".grid-item-info")?.textContent.toLowerCase().trim() ||
      "";

    const searchableText = `${title} ${wear}`;
    item.dataset.searchMatch = searchableText.includes(searchText)
      ? "true"
      : "false";

    applyVisibility(item);
  });
}

searchBox.addEventListener("input", applySearch);

// ---- Sort --------------------------------------------------------------

const sortSelect = document.getElementById("sort-items");
const itemGrid = document.getElementById("item-grid");

let originalOrder = [];

function saveOriginalOrder() {
  originalOrder = Array.from(itemGrid.querySelectorAll(".grid-item"));
}

function sortItems() {
  const sortType = sortSelect.value;

  let items = [...originalOrder];

  if (sortType === "old-new") {
    items.reverse();
  } else if (sortType === "price-high-low") {
    items.sort(
      (a, b) => (getItemPrice(b) ?? -Infinity) - (getItemPrice(a) ?? -Infinity),
    );
  } else if (sortType === "price-low-high") {
    items.sort(
      (a, b) => (getItemPrice(a) ?? Infinity) - (getItemPrice(b) ?? Infinity),
    );
  }

  items.forEach((item) => itemGrid.appendChild(item));
}

sortSelect.addEventListener("change", sortItems);

// ---- Price filter (exponential scale) ----------------------------------

const minPriceSlider = document.getElementById("min-price");
const maxPriceSlider = document.getElementById("max-price");
const priceSliderRange = document.getElementById("price-slider-range");
const minPriceInput = document.getElementById("price-min-input");
const maxPriceInput = document.getElementById("price-max-input");

const PRICE_MAX = 1_500_000;
const LOG_MIN = Math.log(1);
const LOG_MAX = Math.log(PRICE_MAX + 1);
const SLIDER_MAX = 1000;

function sliderToPrice(sliderValue) {
  if (sliderValue <= 0) return 0;
  return Math.round(
    Math.exp(LOG_MIN + (sliderValue / SLIDER_MAX) * (LOG_MAX - LOG_MIN)) - 1,
  );
}

function priceToSlider(price) {
  if (price <= 0) return 0;
  return Math.round(
    ((Math.log(price + 1) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * SLIDER_MAX,
  );
}

function updatePriceSliderBar() {
  let vMin = Number(minPriceSlider.value);
  let vMax = Number(maxPriceSlider.value);
  if (vMin > vMax) [vMin, vMax] = [vMax, vMin];

  const leftPct = (vMin / SLIDER_MAX) * 100;
  const widthPct = ((vMax - vMin) / SLIDER_MAX) * 100;

  priceSliderRange.style.left = `${leftPct}%`;
  priceSliderRange.style.width = `${widthPct}%`;
}

function formatNumber(price) {
  return Number(price).toLocaleString("en-GB");
}

function slidersToInputs() {
  let vMin = Number(minPriceSlider.value);
  let vMax = Number(maxPriceSlider.value);
  if (vMin > vMax) [vMin, vMax] = [vMax, vMin];
  minPriceInput.value = formatNumber(sliderToPrice(vMin));
  maxPriceInput.value = formatNumber(sliderToPrice(vMax));
}

function parseInputPrice(str) {
  return parseFloat(str.replace(/[,\s]/g, "")) || 0;
}

function inputsToSliders() {
  const lo = Math.min(
    parseInputPrice(minPriceInput.value),
    parseInputPrice(maxPriceInput.value),
  );
  const hi = Math.max(
    parseInputPrice(minPriceInput.value),
    parseInputPrice(maxPriceInput.value),
  );
  minPriceSlider.value = priceToSlider(Math.min(lo, PRICE_MAX));
  maxPriceSlider.value = priceToSlider(Math.min(hi, PRICE_MAX));
}

function filterByPrice() {
  let vMin = Number(minPriceSlider.value);
  let vMax = Number(maxPriceSlider.value);
  if (vMin > vMax) [vMin, vMax] = [vMax, vMin];

  const minPrice = sliderToPrice(vMin);
  const maxPrice = sliderToPrice(vMax);

  slidersToInputs();
  updatePriceSliderBar();

  document.querySelectorAll("#item-grid .grid-item").forEach((item) => {
    const itemPrice = getItemPrice(item);
    const matches =
      itemPrice !== null && itemPrice >= minPrice && itemPrice <= maxPrice;
    item.dataset.priceMatch = matches ? "true" : "false";
    applyVisibility(item);
  });
}

minPriceSlider.addEventListener("input", filterByPrice);
maxPriceSlider.addEventListener("input", filterByPrice);

minPriceInput.addEventListener("change", () => {
  inputsToSliders();
  filterByPrice();
});
maxPriceInput.addEventListener("change", () => {
  inputsToSliders();
  filterByPrice();
});

function isValidPriceKey(e) {
  const allowed = [
    "Backspace",
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "Tab",
    "Home",
    "End",
  ];
  if (allowed.includes(e.key)) return true;
  if (e.key >= "0" && e.key <= "9") return true;
  return false;
}

minPriceInput.addEventListener("keydown", (e) => {
  if (!isValidPriceKey(e)) e.preventDefault();
});

maxPriceInput.addEventListener("keydown", (e) => {
  if (!isValidPriceKey(e)) e.preventDefault();
});

// ---- Float filter (linear scale) ---------------------------------------

const minFloatSlider = document.getElementById("min-float");
const maxFloatSlider = document.getElementById("max-float");
const floatSliderRange = document.getElementById("float-slider-range");
const minFloatInput = document.getElementById("float-min-input");
const maxFloatInput = document.getElementById("float-max-input");

const FLOAT_MIN = 0;
const FLOAT_MAX = 1;
const FLOAT_DECIMALS = 4;

function formatFloat(value) {
  return Number(value).toFixed(FLOAT_DECIMALS);
}

function parseInputFloat(str) {
  return parseFloat(str) || 0;
}

const floatSliderRangeLeft = document.getElementById("float-slider-range-left");
const floatSliderRangeRight = document.getElementById(
  "float-slider-range-right",
);

function updateFloatSliderBar() {
  let vMin = Number(minFloatSlider.value);
  let vMax = Number(maxFloatSlider.value);
  if (vMin > vMax) [vMin, vMax] = [vMax, vMin];

  floatSliderRangeLeft.style.left = "0%";
  floatSliderRangeLeft.style.width = `${vMin * 100}%`;

  floatSliderRangeRight.style.right = "0%";
  floatSliderRangeRight.style.width = `${(1 - vMax) * 100}%`;
}

function floatSlidersToInputs() {
  let vMin = Number(minFloatSlider.value);
  let vMax = Number(maxFloatSlider.value);
  if (vMin > vMax) [vMin, vMax] = [vMax, vMin];
  minFloatInput.value = formatFloat(vMin);
  maxFloatInput.value = formatFloat(vMax);
}

function floatInputsToSliders() {
  const lo = Math.min(
    parseInputFloat(minFloatInput.value),
    parseInputFloat(maxFloatInput.value),
  );
  const hi = Math.max(
    parseInputFloat(minFloatInput.value),
    parseInputFloat(maxFloatInput.value),
  );
  minFloatSlider.value = Math.min(Math.max(lo, FLOAT_MIN), FLOAT_MAX);
  maxFloatSlider.value = Math.min(Math.max(hi, FLOAT_MIN), FLOAT_MAX);
}

function getItemFloat(item) {
  const infoEls = item.querySelectorAll(".grid-item-info");
  if (!infoEls[2]) return null;
  const val = parseFloat(infoEls[2].textContent.trim());
  return Number.isNaN(val) ? null : val;
}

function filterByFloat() {
  let vMin = Number(minFloatSlider.value);
  let vMax = Number(maxFloatSlider.value);
  if (vMin > vMax) [vMin, vMax] = [vMax, vMin];

  floatSlidersToInputs();
  updateFloatSliderBar();

  document.querySelectorAll("#item-grid .grid-item").forEach((item) => {
    const itemFloat = getItemFloat(item);
    const matches =
      itemFloat !== null && itemFloat >= vMin && itemFloat <= vMax;
    item.dataset.floatMatch = matches ? "true" : "false";
    applyVisibility(item);
  });
}

minFloatSlider.addEventListener("input", filterByFloat);
maxFloatSlider.addEventListener("input", filterByFloat);

minFloatInput.addEventListener("change", () => {
  floatInputsToSliders();
  filterByFloat();
});
maxFloatInput.addEventListener("change", () => {
  floatInputsToSliders();
  filterByFloat();
});

function isValidFloatKey(e) {
  const allowed = [
    "Backspace",
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "Tab",
    "Home",
    "End",
  ];
  if (allowed.includes(e.key)) return true;
  if (e.key >= "0" && e.key <= "9") return true;
  if (e.key === "." && !e.target.value.includes(".")) return true;
  return false;
}

minFloatInput.addEventListener("keydown", (e) => {
  if (!isValidFloatKey(e)) e.preventDefault();
});
maxFloatInput.addEventListener("keydown", (e) => {
  if (!isValidFloatKey(e)) e.preventDefault();
});

// Initialise
updatePriceSliderBar();
slidersToInputs();
updateFloatSliderBar();
floatSlidersToInputs();
filterByFloat();
