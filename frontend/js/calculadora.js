// Calculadora: preço sugerido, composição e ponto de equilíbrio de um serviço.

const dados = carregarDados();
const PERCENTUAIS = ["margem", "impostos", "taxaCartao"];
let grafico = null;

function texto(id, valor) {
  document.getElementById(id).textContent = valor;
}

function servicoSelecionado() {
  const id = Number(document.getElementById("servico").value);
  return dados.servicos.find((s) => s.id === id);
}

function calcular() {
  const servico = servicoSelecionado();
  if (!servico) return;

  for (const campo of PERCENTUAIS) {
    texto(`${campo}-valor`, `${numero(dados.configuracao[campo], campo === "margem" ? 0 : 1)}%`);
  }

  const a = analisarServico(servico, dados);

  texto("c-insumos", moeda(a.insumos));
  texto("c-tempo", `(${servico.minutos} min)`);
  texto("c-mao", moeda(a.maoDeObra));
  texto("c-custo", moeda(a.custo));

  if (a.preco === null) {
    texto("preco", "—");
    texto("lucro", "Margem + impostos + taxas não podem somar 100% ou mais.");
    for (const id of ["c-taxas", "c-lucro", "texto-equilibrio", "texto-capacidade", "comparacao"]) texto(id, "");
    document.getElementById("barra-preenchimento").style.width = "0";
    grafico = desenharGraficoEquilibrio(document.getElementById("grafico"), grafico, dados, a);
    return;
  }

  texto("preco", moeda(a.preco));
  texto("lucro", `Você lucra ${moeda(a.lucro)} por atendimento`);
  texto("c-taxas", moeda(a.impostosETaxas));
  texto("c-lucro", moeda(a.lucro));

  document.getElementById("texto-equilibrio").innerHTML =
    `Você precisa fazer <strong>${a.pontoEquilibrio} atendimentos</strong> de ${escapar(servico.nome)} no mês para cobrir
     todos os custos e o seu pró-labore. A partir daí, é lucro.`;

  const uso = Math.min(100, (a.pontoEquilibrio / a.capacidade) * 100);
  const barra = document.getElementById("barra-preenchimento");
  barra.style.width = `${uso}%`;
  barra.className = `progress-bar ${uso > 90 ? "bg-danger" : uso > 75 ? "bg-warning" : "bg-success"}`;
  document.getElementById("barra").setAttribute("aria-valuenow", Math.round(uso));
  texto("texto-capacidade", uso >= 100
    ? `Atenção: a meta passa da sua capacidade (${a.capacidade} atendimentos/mês). Reveja preço, custos ou tempo.`
    : `Isso usa ${numero(uso)}% da sua capacidade de ${a.capacidade} atendimentos/mês.`);

  compararPrecoAtual(a);
  grafico = desenharGraficoEquilibrio(document.getElementById("grafico"), grafico, dados, a);
}

function compararPrecoAtual(a) {
  const atual = Number(document.getElementById("preco-atual").value);
  const saida = document.getElementById("comparacao");
  if (!atual) {
    saida.innerHTML = "";
    return;
  }
  const diferenca = atual - a.preco;
  if (atual < a.custo) {
    saida.innerHTML = `<span class="text-danger"><i class="bi bi-exclamation-triangle me-1"></i>
      Você está pagando para trabalhar: o custo é ${moeda(a.custo)}.</span>`;
  } else if (diferenca < 0) {
    saida.innerHTML = `<span class="text-warning-emphasis"><i class="bi bi-arrow-down me-1"></i>
      ${moeda(-diferenca)} abaixo do preço sugerido. Cobre os custos, mas com lucro menor.</span>`;
  } else {
    saida.innerHTML = `<span class="text-success"><i class="bi bi-check-circle me-1"></i>
      Seu preço está ${moeda(diferenca)} acima do sugerido.</span>`;
  }
}

function iniciar() {
  const select = document.getElementById("servico");
  select.innerHTML = dados.servicos.map((s) => `<option value="${s.id}">${escapar(s.nome)}</option>`).join("");

  const pedido = new URLSearchParams(location.search).get("servico");
  if (pedido && dados.servicos.some((s) => s.id === Number(pedido))) select.value = pedido;

  for (const campo of PERCENTUAIS) {
    const input = document.getElementById(campo);
    input.value = dados.configuracao[campo];
    input.addEventListener("input", () => {
      dados.configuracao[campo] = Number(input.value);
      salvarDados(dados);
      calcular();
    });
  }

  select.addEventListener("change", calcular);
  document.getElementById("preco-atual").addEventListener("input", calcular);

  if (!dados.servicos.length) {
    document.querySelector("main").insertAdjacentHTML("beforeend",
      `<p class="text-secondary">Cadastre um serviço primeiro em <a href="servicos.html">Serviços</a>.</p>`);
    return;
  }
  calcular();
}

iniciar();
