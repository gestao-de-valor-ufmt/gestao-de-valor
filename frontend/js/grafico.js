// Gráfico "quando bato a meta": o que sobra no bolso x meta do mês, por número de atendimentos.

function desenharGraficoMeta(canvas, graficoAnterior, analise) {
  if (graficoAnterior) graficoAnterior.destroy();

  const limite = Math.max(analise.capacidade, analise.necessarios || 0) + 5;
  const passo = Math.max(1, Math.round(limite / 12));
  const quantidades = [];
  for (let q = 0; q <= limite; q += passo) quantidades.push(q);

  return new Chart(canvas, {
    type: "line",
    data: {
      labels: quantidades,
      datasets: [
        {
          label: "O que sobra para você",
          data: quantidades.map((q) => Math.max(0, q * analise.sobra)),
          borderColor: "#1f4fbf",
          backgroundColor: "#1f4fbf",
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          label: "Sua meta do mês",
          data: quantidades.map(() => analise.meta),
          borderColor: "#d9480f",
          backgroundColor: "#d9480f",
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8 } },
        tooltip: {
          callbacks: {
            title: (itens) => `${itens[0].label} atendimentos no mês`,
            label: (item) => `${item.dataset.label}: ${moeda(item.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Atendimentos no mês" },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => moeda(v).replace(",00", "") },
          grid: { color: "#eef1f7" },
        },
      },
    },
  });
}
