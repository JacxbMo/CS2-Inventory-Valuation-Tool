function extractSteamId(input) {
  input = input.trim();

  // direct 64-bit Steam ID
  if (/^\d{17}$/.test(input)) return input;

  // steamcommunity.com/profiles/STEAMID
  const profileMatch = input.match(/steamcommunity\.com\/profiles\/(\d{17})/);
  if (profileMatch) return profileMatch[1];

  // steamcommunity.com/id/VANITYURL — needs server-side resolution
  const vanityMatch = input.match(/steamcommunity\.com\/id\/([^/]+)/);
  if (vanityMatch) return vanityMatch[1]; // handled below

  return null;
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("steam-search-btn");
  const input = document.getElementById("steam-url-input");

  async function loadInventory() {
    const raw = input.value.trim();
    if (!raw) return;

    const steamId = extractSteamId(raw);
    if (!steamId) {
      alert("Invalid Steam URL or ID.");
      return;
    }

    btn.textContent = "Loading...";
    btn.disabled = true;

    try {
      const response = await fetch(`/api/data?steamId=${steamId}`);

      if (!response.ok) throw new Error("Failed to load inventory");

      // re-use your existing handler by dispatching the data
      const data = await response.json();
      window.dispatchEvent(
        new CustomEvent("inventoryLoaded", { detail: data }),
      );
    } catch (err) {
      alert("Could not load inventory. Check the URL and try again.");
      console.error(err);
    } finally {
      btn.textContent = "Load Inventory";
      btn.disabled = false;
    }
  }

  btn.addEventListener("click", loadInventory);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loadInventory();
  });
});
