async function getInventory(steamId) {
  const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=2000`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("API request failed");
  }

  return await response.json();
}

module.exports = { getInventory };
