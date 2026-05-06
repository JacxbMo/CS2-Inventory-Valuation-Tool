async function processInventoryData(data) {
  document.getElementById("empty-state").style.display = "none";
  document.getElementById("dashboard-container").style.display = "flex";
  document.getElementById("item-grid").style.display = "grid";
  const inventory = data.inventory;
  const prices = data.prices;

  const priceMap = new Map();

  for (const price of prices) {
    priceMap.set(String(price.assetid), price);
  }

  const cosmeticMap = new Map();

  for (const cosmetic of data.cosmeticPrices || []) {
    cosmeticMap.set(cosmetic.market_hash_name, cosmetic);
  }

  function calculateStickerValue(stickers, cosmeticMap) {
    let total = 0;

    for (const sticker of stickers || []) {
      const data = cosmeticMap.get(sticker);
      const price = Number(data?.selected_price || 0);

      let multiplier = 0;

      if (price < 5) multiplier = 0.15;
      else if (price < 50) multiplier = 0.3;
      else if (price < 500) multiplier = 0.4;
      else multiplier = 0.6;

      total += price * multiplier;
    }

    return total;
  }

  function calculateCharmValue(charms, cosmeticMap) {
    let total = 0;

    for (const charm of charms || []) {
      const data = cosmeticMap.get(charm);
      const price = Number(data?.selected_price || 0);

      total += price * 0.65;
    }
    return total;
  }

  function formatPrice(value) {
    return `€${Number(value).toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatPercent(value) {
    if (!value || value === 0) return "";
    if (value > 0) return `↑ ${Math.abs(value).toFixed(1)}%`;
    return `↓ ${Math.abs(value).toFixed(1)}%`;
  }

  const itemGrid = document.getElementById("item-grid");

  itemGrid.innerHTML = "";

  const descriptionMap = new Map();
  const assetPropertiesMap = new Map();

  let tradableCount = 0;
  let totalValue = 0;
  let highestValue = 0;
  let mostValuableItem = null;
  let totalWeeklyChangePercent = 0;
  let weeklyChangeCount = 0;

  for (const description of inventory.descriptions) {
    const key = `${description.classid}_${description.instanceid}`;
    descriptionMap.set(key, description);
  }

  for (const entry of inventory.asset_properties) {
    assetPropertiesMap.set(entry.assetid, entry);
  }

  for (const [i, asset] of inventory.assets.entries()) {
    const descriptionKey = `${asset.classid}_${asset.instanceid}`;
    const description = descriptionMap.get(descriptionKey);

    if (!description) continue;
    if (description.tradable !== 1) continue;

    tradableCount++;

    const assetPropertyEntry = assetPropertiesMap.get(asset.assetid);

    const floatProperty = assetPropertyEntry?.asset_properties?.find(
      (property) => Number(property.propertyid) === 2,
    );

    const floatValue = floatProperty?.float_value;

    const exteriorTag = description.tags?.find(
      (tag) => tag.category === "Exterior",
    );

    const qualityTag = description.tags?.find(
      (tag) => tag.category === "Quality",
    );

    const hasFloat = floatValue !== undefined && floatValue !== null;

    const stickerInfo = description.descriptions?.find(
      (entry) => entry.name === "sticker_info",
    );

    let stickerImages = [];

    if (stickerInfo?.value) {
      const parser = new DOMParser();
      const stickerDoc = parser.parseFromString(stickerInfo.value, "text/html");

      stickerImages = Array.from(stickerDoc.querySelectorAll("img"))
        .map((img) => img.getAttribute("src"))
        .filter(Boolean)
        .slice(0, 5);
    }

    let stickerHtml = "";

    if (stickerImages.length === 0) {
      stickerHtml = `<p class="grid-item-no-stickers">This item has no stickers.</p>`;
    } else {
      while (stickerImages.length < 5) {
        stickerImages.push(null);
      }

      stickerHtml = stickerImages
        .map(
          (src) => `
            <img
              loading="lazy"
              src="${src || ""}"
              style="${src ? "" : "display:none;"}"
              alt=""
            />
          `,
        )
        .join("");
    }

    const charmInfo = description.descriptions?.find(
      (entry) => entry.name === "keychain_info",
    );

    let charmImage = null;

    if (charmInfo?.value) {
      const parser = new DOMParser();
      const charmDoc = parser.parseFromString(charmInfo.value, "text/html");

      const charmImg = charmDoc.querySelector("img");

      if (charmImg) {
        charmImage = charmImg.getAttribute("src");
      }
    }

    let itemName = description.name;
    let wearText = exteriorTag?.localized_tag_name || "Minimal Wear";
    let variantTag = qualityTag?.localized_tag_name || "Normal";

    const isStatTrak = itemName.includes("StatTrak");
    const statTrakStyle = isStatTrak ? 'style="color:#fee162;"' : "";

    const fullName =
      description.market_hash_name ||
      description.market_name ||
      description.name ||
      "";

    const priceData = priceMap.get(String(asset.assetid));
    const basePrice = Number(priceData?.selected_price || 0);

    const last24 = Number(priceData?.last_24_hoursavg || 0);
    const last7 = Number(priceData?.last_7_daysavg || 0);

    let weeklyChange = 0;
    let weeklyChangePercent = 0;

    if (last7 > 0 && last24 > 0) {
      weeklyChange = last24 - last7;
      weeklyChangePercent = (weeklyChange / last7) * 100;
      totalWeeklyChangePercent += weeklyChangePercent;
      weeklyChangeCount++;
    }

    const stickerValue = calculateStickerValue(
      priceData?.stickers || [],
      cosmeticMap,
    );

    const charmValue = calculateCharmValue(
      priceData?.charms || [],
      cosmeticMap,
    );

    const cosmeticValue = stickerValue + charmValue;
    const finalItemPrice = basePrice > 0 ? basePrice + cosmeticValue : 0;

    if (finalItemPrice > highestValue) {
      highestValue = finalItemPrice;
      mostValuableItem = {
        name: itemName,
        value: finalItemPrice,
        basePrice,
        stickerValue,
        charmValue,
        weeklyChange,
        weeklyChangePercent,
        assetid: asset.assetid,
      };
    }

    if (finalItemPrice > 0) {
      totalValue += finalItemPrice;
    }

    const isSticker = fullName.startsWith("Sticker | ");
    const isCharm = fullName.startsWith("Charm | ");

    if (isSticker) {
      const rawStickerName = fullName.replace(/^Sticker \| /, "").trim();
      const parts = rawStickerName.split(" | ");

      const firstPart = parts[0]?.trim() || "";

      wearText = parts.slice(1).join(" | ").trim();

      const variantMatch = firstPart.match(/\(([^)]+)\s*$/);

      if (variantMatch) {
        variantTag = variantMatch[1].trim();
        itemName = firstPart.replace(/\s*\(([^)]+)\s*$/, "").trim();
      } else {
        variantTag = "Paper";
        itemName = firstPart;
      }

      if (!wearText) {
        wearText = "Sticker";
      }
    } else if (isCharm) {
      itemName = fullName.replace(/^Charm \| /, "").trim();
      wearText = "Charm";
      variantTag = qualityTag?.localized_tag_name || "Normal";
    }

    const typeTag = description.tags?.find((tag) => tag.category === "Type");

    if (
      typeTag?.localized_tag_name === "Knife" ||
      typeTag?.localized_tag_name === "Gloves"
    ) {
      variantTag = "Normal";
    }

    let gridItem = document.createElement("div");
    gridItem.className = "grid-item";
    gridItem.id = `item-${i}`;

    gridItem.innerHTML = `
      <div class="grid-item-title-container">
        <p ${statTrakStyle}>${itemName}</p>
        <i class="fa-solid fa-circle-info"></i>
      </div>
      <div class="grid-item-item-image-container">
        <img 
          loading="lazy"
          class="grid-item-item-img"
          src="https://community.fastly.steamstatic.com/economy/image/${description.icon_url}/360fx360f"
          alt=""
        />
        <img
          loading="lazy"
          class="grid-item-charm-img"
          src="${charmImage || ""}"
          style="${charmImage ? "" : "display:none;"}"
          alt=""
        />
      </div>
      <p class="grid-item-info">
        ${wearText}${priceData?.version ? `  (${priceData.version})` : ""}
      </p>
      <p class="grid-item-info" style="margin-top: 9px">${variantTag}</p>
      <p class="grid-item-value">
        ${finalItemPrice > 0 ? formatPrice(finalItemPrice) : "N/A"}
        <span style="
          margin-left:8px;
          font-size:12px;
          opacity:0.8;
          position: relative;
          top: -1px;
          color:${weeklyChangePercent < 0 ? "#fe6262" : "inherit"};
        ">
          ${last7 > 0 && last24 > 0 ? formatPercent(weeklyChangePercent) : ""}
        </span>
      </p>
      <p
        class="grid-item-info"
        style="margin-top: 8px; margin-left: 17px"
      >${floatValue || "N/A"}</p>
      <div class="grid-item-float-bar-container">
        <i
          style="
            left: calc(${(Number(floatValue) || 0) * 100}% - 2% - 1px);
            ${!hasFloat ? "display:none;" : ""}
          "
          class="fa-solid fa-caret-up"
        ></i>
        <div
          style="
            width: 7%;
            background-color: #86fe62;
            border-radius: 4px 0 0 4px;
          "
        ></div>
        <div style="width: 8%; background-color: #fef962"></div>
        <div style="width: 23%; background-color: #fec262"></div>
        <div style="width: 7%; background-color: #fe9162"></div>
        <div
          style="
            width: 55%;
            background-color: #fe6262;
            border-radius: 0 4px 4px 0;
          "
        ></div>
      </div>
      <div class="grid-item-sticker-container">
        ${stickerHtml}
      </div>
    `;

    itemGrid.appendChild(gridItem);

    gridItem.addEventListener("click", () => {
      openModal(
        description,
        priceData,
        floatValue,
        charmImage,
        stickerImages,
        cosmeticMap,
      );
    });
  }

  const averageWeeklyChangePercent =
    weeklyChangeCount > 0 ? totalWeeklyChangePercent / weeklyChangeCount : 0;

  document.getElementById("total-value").innerHTML = formatPrice(totalValue);
  document.getElementById("item-count").innerHTML = `${tradableCount}`;

  const mostValuableElement = document.getElementById("most-valuable");
  if (mostValuableElement) {
    mostValuableElement.innerHTML = mostValuableItem
      ? `${formatPrice(mostValuableItem.value)}`
      : "N/A";
  }

  const weeklyChangeElement = document.getElementById("weekly-change");
  if (weeklyChangeElement) {
    weeklyChangeElement.innerHTML =
      weeklyChangeCount > 0 ? formatPercent(averageWeeklyChangePercent) : "N/A";
  }

  saveOriginalOrder();
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("/api/data?steamId=YOUR_DEFAULT_STEAMID");

    if (!response.ok) {
      throw new Error("Request failed");
    }

    const data = await response.json();
    await processInventoryData(data);
  } catch (error) {
    console.error(error);
  }
});

window.addEventListener("inventoryLoaded", async (e) => {
  await processInventoryData(e.detail);
});
