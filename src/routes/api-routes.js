const { decodeHex } = require("@csfloat/cs2-inspect-serializer");
const express = require("express");
const router = express.Router();
const { getInventory } = require("../services/steam-service");
const db = require("../db");

function getFloatAdjustment(floatValue) {
  const float = Number(floatValue);

  if (!Number.isFinite(float)) {
    return {
      floatValue: null,
      floatMultiplier: 1,
      floatCategory: null,
    };
  }

  let floatMultiplier = 1;
  let floatCategory = null;

  if (float <= 0.07) {
    floatMultiplier = 1 + 0.25 * Math.exp(-float * 40);
    floatCategory = float <= 0.01 ? "Very Low Float" : "Low Float";
  } else if (float >= 0.85) {
    floatMultiplier = 1 + 0.2 * Math.exp((float - 1) * -15);
    floatCategory = float >= 0.95 ? "Very High Float" : "High Float";
  }

  return {
    floatValue: float,
    floatMultiplier: parseFloat(floatMultiplier.toFixed(4)),
    floatCategory,
  };
}

function getDopplerVersion(itemName, itemCertificate) {
  try {
    const decoded = decodeHex(itemCertificate);
    const paintIndex = Number(decoded.paintindex);

    const dopplerMap = {
      415: "Ruby",
      416: "Sapphire",
      417: "Black Pearl",
      418: "Phase 1",
      419: "Phase 2",
      420: "Phase 3",
      421: "Phase 4",
      617: "Phase 2",
      618: "Phase 4",
      619: "Black Pearl",
    };

    const gammaDopplerMap = {
      568: "Emerald",
      569: "Phase 1",
      570: "Phase 2",
      571: "Phase 3",
      572: "Phase 4",
    };

    if (itemName.includes("Gamma Doppler")) {
      return gammaDopplerMap[paintIndex] || null;
    }

    if (itemName.includes("Doppler")) {
      return dopplerMap[paintIndex] || null;
    }

    return null;
  } catch (err) {
    console.error("Decode failed:", err.message);
    return null;
  }
}

function extractStickerNames(description) {
  const stickerInfo = description.descriptions?.find(
    (entry) => entry.name === "sticker_info",
  );

  if (!stickerInfo?.value) return [];

  const matches = [...stickerInfo.value.matchAll(/title="([^"]+)"/g)];

  return matches
    .map((match) => match[1])
    .filter((name) => name)
    .map((name) =>
      name
        .replace(/^Sticker:\s*/i, "")
        .replace(/^Sticker \| /i, "")
        .trim(),
    )
    .map((name) => `Sticker | ${name}`);
}
function extractCharmNames(description) {
  const charmInfo = description.descriptions?.find(
    (entry) => entry.name === "keychain_info",
  );

  if (!charmInfo?.value) return [];

  const matches = [...charmInfo.value.matchAll(/title="([^"]+)"/g)];

  return matches.flatMap((match) => {
    const rawName = match[1].trim();

    const cleanedName = rawName
      .replace(/^Charm:\s*/i, "")
      .replace(/^Charm \| /i, "")
      .trim();

    return [
      `Charm | ${cleanedName}`,
      cleanedName,
      `Sticker Slab | ${cleanedName.replace(/^Sticker Slab:\s*/i, "")}`,
    ];
  });
}

router.get("/data", async (req, res) => {
  const steamId = req.query.steamId;

  if (!steamId) {
    return res.status(400).json({ error: "Missing steamId" });
  }

  try {
    const data = await getInventory(steamId);

    const descriptionMap = new Map();
    const assetPropertiesMap = new Map();
    const tradableItems = [];
    const cosmeticNames = [];

    for (const description of data.descriptions) {
      const key = `${description.classid}_${description.instanceid}`;
      descriptionMap.set(key, description);
    }

    for (const entry of data.asset_properties || []) {
      assetPropertiesMap.set(entry.assetid, entry);
    }

    for (const asset of data.assets) {
      const key = `${asset.classid}_${asset.instanceid}`;
      const description = descriptionMap.get(key);

      if (!description) continue;
      if (description.tradable !== 1) continue;

      const fullName =
        description.market_hash_name ||
        description.market_name ||
        description.name;

      if (!fullName) continue;

      const assetPropertyEntry = assetPropertiesMap.get(asset.assetid);

      const floatProperty = assetPropertyEntry?.asset_properties?.find(
        (property) => Number(property.propertyid) === 2,
      );

      const floatAdjustment = getFloatAdjustment(floatProperty?.float_value);

      const certificateProperty = assetPropertyEntry?.asset_properties?.find(
        (property) => Number(property.propertyid) === 6,
      );

      const itemCertificate = certificateProperty?.string_value || null;

      let version = null;

      if (itemCertificate && fullName.includes("Doppler")) {
        version = getDopplerVersion(fullName, itemCertificate);
      }

      const stickers = extractStickerNames(description);
      const charms = extractCharmNames(description);

      cosmeticNames.push(...stickers, ...charms);

      tradableItems.push({
        assetid: asset.assetid,
        name: fullName,
        version,
        stickers,
        charms,
        floatValue: floatAdjustment.floatValue,
        floatMultiplier: floatAdjustment.floatMultiplier,
        floatCategory: floatAdjustment.floatCategory,
      });
    }

    if (tradableItems.length === 0) {
      return res.json({
        inventory: data,
        prices: [],
        cosmeticPrices: [],
      });
    }

    const itemNames = [...new Set(tradableItems.map((item) => item.name))];
    const uniqueCosmeticNames = [...new Set(cosmeticNames)];
    const allNames = [...new Set([...itemNames, ...uniqueCosmeticNames])];

    const placeholders = allNames.map(() => "?").join(",");

    const query = `
  SELECT 
    market_hash_name,
    version,

    COALESCE(
      last_24_hoursavg,
      last_7_daysavg,
      last_30_daysavg,
      last_90_daysavg
    ) AS selected_price,

    last_24_hoursmin, last_24_hoursmax, last_24_hoursavg, last_24_hoursmedian, last_24_hoursvolume,
    last_7_daysmin,  last_7_daysmax,  last_7_daysavg,  last_7_daysmedian,  last_7_daysvolume,
    last_30_daysmin, last_30_daysmax, last_30_daysavg, last_30_daysmedian, last_30_daysvolume,
    last_90_daysmin, last_90_daysmax, last_90_daysavg, last_90_daysmedian, last_90_daysvolume

  FROM mytable
  WHERE market_hash_name IN (${placeholders})
`;

    db.query(query, allNames, (err, dbPrices) => {
      if (err) {
        console.error("Database query failed:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      const finalPrices = [];

      for (const item of tradableItems) {
        const matches = dbPrices.filter(
          (price) => price.market_hash_name === item.name,
        );

        let selectedPrice = null;

        if (item.version) {
          selectedPrice = matches.find((price) => {
            if (!price.version) return false;

            return (
              price.version.trim().toLowerCase() ===
              item.version.trim().toLowerCase()
            );
          });
        }

        if (!selectedPrice) {
          selectedPrice = matches.find(
            (price) => price.version === null || price.version === "",
          );
        }

        if (selectedPrice) {
          const adjustedSelectedPrice =
            Number(selectedPrice.selected_price || 0) * item.floatMultiplier;

          finalPrices.push({
            assetid: item.assetid,
            detected_version: item.version,
            stickers: item.stickers,
            charms: item.charms,
            float_value: item.floatValue,
            float_multiplier: item.floatMultiplier,
            float_category: item.floatCategory,
            ...selectedPrice,
            selected_price: adjustedSelectedPrice.toFixed(2),
          });
        }
      }

      const cosmeticPrices = dbPrices.filter((price) =>
        uniqueCosmeticNames.includes(price.market_hash_name),
      );

      console.log(
        "SAMPLE ITEM WITH CHARMS:",
        finalPrices.find((i) => i.charms?.length),
      );
      res.json({
        inventory: data,
        prices: finalPrices,
        cosmeticPrices,
      });
    });
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

module.exports = router;
