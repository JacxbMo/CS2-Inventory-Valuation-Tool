let priceChart = null;

function renderPriceChart(priceData) {
  const container = document.getElementById("modal-graph-container");

  container.innerHTML = `<canvas id="priceChartCanvas"></canvas>`;

  const canvas = document.getElementById("priceChartCanvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";

  if (priceChart) {
    priceChart.destroy();
    priceChart = null;
  }

  const periods = ["24h", "7d", "30d", "90d"];
  const keys = ["last_24_hours", "last_7_days", "last_30_days", "last_90_days"];

  const data = {
    last_24_hours: {
      min: priceData.last_24_hoursmin,
      max: priceData.last_24_hoursmax,
      avg: priceData.last_24_hoursavg,
      median: priceData.last_24_hoursmedian,
    },
    last_7_days: {
      min: priceData.last_7_daysmin,
      max: priceData.last_7_daysmax,
      avg: priceData.last_7_daysavg,
      median: priceData.last_7_daysmedian,
    },
    last_30_days: {
      min: priceData.last_30_daysmin,
      max: priceData.last_30_daysmax,
      avg: priceData.last_30_daysavg,
      median: priceData.last_30_daysmedian,
    },
    last_90_days: {
      min: priceData.last_90_daysmin,
      max: priceData.last_90_daysmax,
      avg: priceData.last_90_daysavg,
      median: priceData.last_90_daysmedian,
    },
  };

  const hasData = keys.some((k) => data[k].avg);
  if (!hasData) {
    container.innerHTML = `<p style="color:rgba(255,255,255,0.4); font-family: Segoe UI; font-size:13px; padding:1rem;">No price history available.</p>`;
    return;
  }

  priceChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: periods,
      datasets: [
        {
          label: "Range",
          data: keys.map((k) => [
            Number(data[k].min) || 0,
            Number(data[k].max) || 0,
          ]),
          backgroundColor: "rgba(134,254,98,0.15)",
          borderColor: "rgba(134,254,98,0.4)",
          borderWidth: 1,
          borderRadius: 3,
          borderSkipped: false,
        },
        {
          label: "Avg",
          data: keys.map((k) => Number(data[k].avg) || null),
          type: "line",
          borderColor: "#86fe62",
          backgroundColor: "#86fe62",
          pointBackgroundColor: "#86fe62",
          pointRadius: 4,
          borderWidth: 2,
          tension: 0.35,
          order: 0,
        },
        {
          label: "Median",
          data: keys.map((k) => Number(data[k].median) || null),
          type: "line",
          borderColor: "rgba(134,254,98,0.45)",
          backgroundColor: "rgba(134,254,98,0.45)",
          pointBackgroundColor: "rgba(134,254,98,0.45)",
          pointRadius: 3,
          borderWidth: 1.5,
          borderDash: [4, 4],
          tension: 0.35,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (ctx.dataset.label === "Range") {
                const [lo, hi] = ctx.raw;
                return ` Range: €${lo.toFixed(2)} – €${hi.toFixed(2)}`;
              }
              return ` ${ctx.dataset.label}: €${Number(ctx.raw).toFixed(2)}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "rgba(255,255,255,0.5)", font: { size: 12 } },
          grid: { color: "rgba(255,255,255,0.05)" },
        },
        y: {
          ticks: {
            color: "rgba(255,255,255,0.5)",
            maxTicksLimit: 5,
            font: { size: 12 },
            callback: (v) => "€" + v.toFixed(2),
          },
          grid: { color: "rgba(255,255,255,0.05)" },
        },
      },
    },
  });
}
