// Gráfico do ponto de equilíbrio (Chart.js): receita x custo total por quantidade vendida.

function desenharGraficoEquilibrio(canvas, graficoAnterior, dados, analise) {
  if (graficoAnterior) graficoAnterior.destroy();
  if (analise.preco === null) return null;

  const limite = Math.max(analise.capacidade, analise.pontoEquilibrio) + 10;
  const passo = Math.max(1, Math.round(limite / 12));
  const quantidades = [];
  for (let q = 0; q <= limite; q += passo) quantidades.push(q);

  const fixo = custoMensalTotal(dados);

  return new Chart(canvas, {
    type: "line",
    data: {
      labels: quantidades,
      datasets: [
        {
          label: "Receita",
          data: quantidades.map((q) => q * analise.preco),
          borderColor: "#1f4fbf",
          backgroundColor: "#1f4fbf",
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          label: "Custo total",
          data: quantidades.map((q) => fixo + q * analise.custoVariavel),
          borderColor: "#d9480f",
          backgroundColor: "#d9480f",
          borderWidth: 2,
          pointRadius: 0,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8 } },
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
          ticks: { callback: (v) => moeda(v).replace(",00", "") },
          grid: { color: "#eef1f7" },
        },
      },
    },
  });
}
