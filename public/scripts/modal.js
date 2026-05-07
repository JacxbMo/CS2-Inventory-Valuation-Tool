function formatPrice(value) {
  return `€${Number(value).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function openModal(
  description,
  priceData,
  floatValue,
  charmImage,
  stickerImages,
  cosmeticMap,
) {
  const exteriorTag = description.tags?.find((t) => t.category === "Exterior");
  const qualityTag = description.tags?.find((t) => t.category === "Quality");
  const rarityTag = description.tags?.find((t) => t.category === "Rarity");
  const typeTag = description.tags?.find((t) => t.category === "Type");

  const fullName =
    description.market_hash_name ||
    description.market_name ||
    description.name ||
    "";
  const isStatTrak = fullName.includes("StatTrak");
  const isSticker = fullName.startsWith("Sticker | ");
  const isCharm = fullName.startsWith("Charm | ");

  let itemName = description.name;
  let wearText = exteriorTag?.localized_tag_name || "";
  let variantTag = qualityTag?.localized_tag_name || "Normal";

  if (isSticker) {
    const raw = fullName.replace(/^Sticker \| /, "").trim();
    const parts = raw.split(" | ");
    const first = parts[0]?.trim() || "";
    wearText = parts.slice(1).join(" | ").trim() || "Sticker";
    const variantMatch = first.match(/\(([^)]+)\s*$/);
    if (variantMatch) {
      variantTag = variantMatch[1].trim();
      itemName = first.replace(/\s*\(([^)]+)\s*$/, "").trim();
    } else {
      variantTag = "Paper";
      itemName = first;
    }
  } else if (isCharm) {
    itemName = fullName.replace(/^Charm \| /, "").trim();
    wearText = "Charm";
    variantTag = qualityTag?.localized_tag_name || "Normal";
  }

  if (
    typeTag?.localized_tag_name === "Knife" ||
    typeTag?.localized_tag_name === "Gloves"
  ) {
    variantTag = "Normal";
  }

  const version = priceData?.version || priceData?.detected_version || null;

  const rarityColours = {
    "Consumer Grade": "#b0b0b0",
    "Industrial Grade": "#5e98d9",
    "Mil-Spec Grade": "#4b68f8",
    Restricted: "#8b4efd",
    Classified: "#d32ce6",
    Covert: "#eb4b4b",
    Contraband: "#f0c550",
    Distinguished: "#4b69ff",
    Exceptional: "#8847ff",
    Superior: "#e44df5",
    Master: "#eb4b4b",
  };

  const rarityName = rarityTag?.localized_tag_name || "";
  const rarityColour = rarityColours[rarityName] || "#ffffff";

  // item image
  document.getElementById("item-image").src =
    `https://community.fastly.steamstatic.com/economy/image/${description.icon_url}/1280x720`;

  // charm image
  const charmImg = document.getElementById("modal-charm-image");
  if (charmImage) {
    charmImg.src = charmImage;
    charmImg.style.display = "";
  } else {
    charmImg.style.display = "none";
  }

  // float
  const hasFloat = floatValue !== undefined && floatValue !== null;
  document.getElementById("float-text").textContent = hasFloat
    ? `Float: ${Number(floatValue).toFixed(11)}`
    : "Float: N/A";

  const caret = document.querySelector(
    "#modal-float-bar-container .fa-caret-up",
  );
  if (caret) {
    if (hasFloat) {
      caret.style.left = `calc(${Number(floatValue) * 100}% - 2% - 1px)`;
      caret.style.display = "";
    } else {
      caret.style.display = "none";
    }
  }

  // inspect link
  const action = description.actions?.find(
    (a) => a.name === "Inspect in Game...",
  );
  const inspectEl = document.getElementById("modal-inspect-link");
  if (action && priceData?.certificate) {
    const inspectUrl = `steam://run/730//+csgo_econ_action_preview%20${priceData.certificate}`;
    inspectEl.href = inspectUrl;
    inspectEl.style.display = "";
  } else {
    inspectEl.style.display = "none";
  }

  // info panel
  const nameEl = document.querySelector("#modal-info-container p:nth-child(2)");
  nameEl.textContent = itemName + (version ? ` (${version})` : "") || "N/A";
  nameEl.style.color = isStatTrak ? "#fee162" : "#ffffff";

  document.querySelector("#modal-info-container p:nth-child(3)").textContent =
    wearText || "N/A";
  document.querySelector("#modal-info-container p:nth-child(4)").textContent =
    rarityName || "N/A";
  document.querySelector("#modal-info-container p:nth-child(4)").style.color =
    rarityColour;
  document.querySelector("#modal-info-container p:nth-child(5)").textContent =
    variantTag || "N/A";

  const basePrice = Number(priceData?.selected_price || 0);
  const priceEl = document.querySelector(
    "#modal-info-container p:nth-child(6)",
  );
  priceEl.textContent = basePrice > 0 ? formatPrice(basePrice) : "N/A";
  priceEl.style.color = basePrice > 0 ? "#86fe62" : "rgba(255,255,255,0.4)";

  // stickers
  const stickerContainer = document.getElementById("modal-sticker-container");
  const hasStickers =
    stickerImages && stickerImages.some((src) => src !== null);

  if (!hasStickers) {
    stickerContainer.innerHTML = `
      <div style="width:100%; display:flex; align-items:center; justify-content:center;">
        <p style="color:rgba(255,255,255,0.4); font-family:'Segoe UI',sans-serif; font-size:13px;">This item has no stickers.</p>
      </div>
    `;
  } else {
    stickerContainer.innerHTML = `
      <div class="modal-sticker-item"></div>
      <div class="modal-sticker-item"></div>
      <div class="modal-sticker-item"></div>
      <div class="modal-sticker-item"></div>
      <div class="modal-sticker-item"></div>
    `;

    const stickerItems = stickerContainer.querySelectorAll(
      ".modal-sticker-item",
    );
    const paddedStickers = [...stickerImages];
    while (paddedStickers.length < 5) paddedStickers.push(null);

    stickerItems.forEach((item, i) => {
      const src = paddedStickers[i];

      if (!src) {
        item.style.visibility = "hidden";
        return;
      }

      item.style.visibility = "";

      const stickerName = priceData?.stickers?.[i] || null;
      const stickerData = stickerName ? cosmeticMap.get(stickerName) : null;
      const stickerPrice = stickerData
        ? Number(stickerData.selected_price || 0)
        : 0;

      const rawName = stickerName
        ? stickerName.replace(/^Sticker \| /, "")
        : "";
      const typeMatch = rawName.match(/\(([^)]*)\)/);
      const stickerType = typeMatch ? typeMatch[1] : "Paper";
      const displayName = rawName.replace(/\s*\([^)]*\)/g, "").trim() || "N/A";

      item.innerHTML = `
        <img src="${src}" alt="" />
        <p class="modal-sticker-name" style="margin-bottom:8px;"></p>
        <p class="modal-sticker-type" style="margin-bottom:10px;"></p>
        <p class="modal-sticker-price"></p>
      `;

      const ps = item.querySelectorAll("p");
      ps[0].textContent = displayName;
      ps[0].style.color = "white";
      ps[1].textContent = stickerType;
      ps[2].textContent = stickerPrice > 0 ? formatPrice(stickerPrice) : "N/A";
      ps[2].style.color =
        stickerPrice > 0 ? "#86fe62" : "rgba(255,255,255,0.4)";
    });
  }

  // price chart
  renderPriceChart(priceData);

  // show modal
  document.getElementById("modal-wrapper").style.display = "flex";
}

function closeModal() {
  document.getElementById("modal-wrapper").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("close-modal").addEventListener("click", closeModal);

  document.getElementById("modal-wrapper").addEventListener("click", (e) => {
    if (e.target === document.getElementById("modal-wrapper")) closeModal();
  });

  document.getElementById("modal-wrapper").style.display = "none";
});
