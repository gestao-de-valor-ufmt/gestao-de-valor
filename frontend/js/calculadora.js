// Calculadora: preço sugerido, composição, ponto de equilíbrio e desconto máximo de um serviço.

const dados = carregarDados();
const PERCENTUAIS = ["margem", "impostos", "taxaCartao", "margemMinima"];
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
  const config = dados.configuracao;

  for (const campo of PERCENTUAIS) {
    const casas = campo === "impostos" || campo === "taxaCartao" ? 1 : 0;
    texto(`${campo}-valor`, `${numero(config[campo], casas)}%`);
  }
  texto("ajuda-modo", config.incluirMaoDeObra
    ? "Preço = insumos + custos miúdos + seu tempo (contas fixas e salário) + margem."
    : "Modo simples: preço = insumos + custos miúdos + margem. Veja abaixo se a margem paga as contas e o seu salário.");

  const a = analisarServico(servico, dados);

  texto("c-insumos", moeda(a.insumos));
  texto("c-miudos", moeda(a.custosMiudos));
  texto("c-tempo", `(${servico.minutos} min)`);
  texto("c-mao", config.incluirMaoDeObra ? moeda(a.maoDeObra) : "não incluída");
  texto("c-custo", moeda(a.custo));

  if (a.preco === null) {
    texto("preco", "—");
    texto("lucro", "Margem + impostos + taxas não podem somar 100% ou mais.");
    for (const id of ["c-taxas", "c-lucro", "texto-equilibrio", "texto-capacidade", "comparacao",
                      "d-preco-minimo", "d-desconto", "d-simulacao"]) texto(id, "");
    document.getElementById("barra-preenchimento").style.width = "0";
    grafico = desenharGraficoEquilibrio(document.getElementById("grafico"), grafico, dados, a);
    return;
  }

  texto("preco", moeda(a.preco));
  texto("lucro", config.incluirMaoDeObra
    ? `Você lucra ${moeda(a.lucro)} por atendimento`
    : `Sobram ${moeda(a.lucro)} por atendimento para pagar contas, salário e lucro`);
  texto("aviso-desconto-simples", config.incluirMaoDeObra
    ? ""
    : "No modo simples, o preço mínimo cobre só material e custos miúdos, não as contas fixas.");
  texto("c-taxas", moeda(a.impostosETaxas));
  texto("c-lucro", moeda(a.lucro));

  mostrarEquilibrio(servico, a);
  mostrarDesconto(a);
  compararPrecoAtual(a);
  grafico = desenharGraficoEquilibrio(document.getElementById("grafico"), grafico, dados, a);
}

function mostrarEquilibrio(servico, a) {
  const barra = document.getElementById("barra-preenchimento");

  if (a.pontoEquilibrio === null) {
    document.getElementById("texto-equilibrio").innerHTML =
      `Com esse preço, <strong>nenhuma quantidade</strong> de atendimentos paga as contas fixas e o seu salário.
       Aumente a margem.`;
    barra.style.width = "100%";
    barra.className = "progress-bar bg-danger";
    texto("texto-capacidade", "");
    return;
  }

  document.getElementById("texto-equilibrio").innerHTML =
    `Você precisa fazer <strong>${a.pontoEquilibrio} atendimentos</strong> de ${escapar(servico.nome)} no mês para cobrir
     todos os custos e o seu salário. A partir daí, é lucro.`;

  const uso = Math.min(100, (a.pontoEquilibrio / a.capacidade) * 100);
  barra.style.width = `${uso}%`;
  barra.className = `progress-bar ${uso > 90 ? "bg-danger" : uso > 75 ? "bg-warning" : "bg-success"}`;
  document.getElementById("barra").setAttribute("aria-valuenow", Math.round(uso));
  texto("texto-capacidade", uso >= 100
    ? `Atenção: a meta passa da sua capacidade (${a.capacidade} atendimentos/mês). Reveja preço, custos ou tempo.`
    : `Isso usa ${numero(uso)}% da sua capacidade de ${a.capacidade} atendimentos/mês.`);
}

function mostrarDesconto(a) {
  const { impostos, taxaCartao, margemMinima } = dados.configuracao;

  if (a.precoMinimo === null) {
    texto("d-preco-minimo", "—");
    texto("d-desconto", "—");
  } else {
    texto("d-preco-minimo", moeda(a.precoMinimo));
    texto("d-desconto", a.desconto <= 0
      ? "sem espaço para desconto"
      : `até ${numero(a.desconto, 1)}% (${moeda(a.preco - a.precoMinimo)})`);
  }

  const saida = document.getElementById("d-simulacao");
  const percentual = Number(document.getElementById("desconto-simulado").value);
  if (!percentual || percentual <= 0 || percentual >= 100) {
    saida.innerHTML = "";
    return;
  }

  const precoComDesconto = a.preco * (1 - percentual / 100);
  const margem = margemEfetiva(a.custo, precoComDesconto, impostos, taxaCartao);
  const resultado = precoComDesconto * (margem / 100);
  const dentroDoLimite = margem >= margemMinima - 1e-9;
  const icone = dentroDoLimite ? "bi-check-circle" : "bi-x-circle";
  const cor = dentroDoLimite ? "text-success" : "text-danger";
  const efeito = resultado >= 0
    ? `ainda sobra ${moeda(resultado)} de lucro (${numero(margem, 1)}%)`
    : `você perde ${moeda(-resultado)} por atendimento (${numero(margem, 1)}%)`;

  saida.innerHTML = `<span class="${cor}"><i class="bi ${icone} me-1"></i>
    Cobrando ${moeda(precoComDesconto)}, ${efeito}.
    ${dentroDoLimite ? "Dentro do seu limite." : "Abaixo do limite que você definiu."}</span>`;
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

  const modo = document.getElementById("incluirMaoDeObra");
  modo.checked = dados.configuracao.incluirMaoDeObra;
  modo.addEventListener("change", () => {
    dados.configuracao.incluirMaoDeObra = modo.checked;
    salvarDados(dados);
    calcular();
  });

  select.addEventListener("change", calcular);
  document.getElementById("preco-atual").addEventListener("input", calcular);
  document.getElementById("desconto-simulado").addEventListener("input", calcular);

  if (!dados.servicos.length) {
    document.querySelector("main").insertAdjacentHTML("beforeend",
      `<p class="text-secondary">Cadastre um serviço primeiro em <a href="servicos.html">Serviços</a>.</p>`);
    return;
  }
  calcular();
}

iniciar();
