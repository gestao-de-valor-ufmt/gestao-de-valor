// Calculadora: 4 perguntas → quanto cobrar, quantos atendimentos e quanto dá de desconto.

const dados = carregarDados();
const CAMPOS_SERVICO = ["outrosGastos", "minutos", "precoCobrado"];
let grafico = null;

function texto(id, valor) {
  document.getElementById(id).textContent = valor;
}

function servicoSelecionado() {
  const id = Number(document.getElementById("servico").value);
  return dados.servicos.find((s) => s.id === id);
}

// Preenche os campos com os valores salvos do serviço escolhido.
function preencherCampos() {
  const servico = servicoSelecionado();
  document.getElementById("salario").value = dados.configuracao.salario;
  document.getElementById("taxaCartao").value = dados.configuracao.taxaCartao ?? 0;
  for (const campo of CAMPOS_SERVICO) {
    document.getElementById(campo).value = servico[campo] ?? 0;
  }
}

function calcular() {
  const servico = servicoSelecionado();
  if (!servico || !(servico.minutos > 0)) return;
  const a = analisarServico(servico, dados);
  const contas = totalContasFixas(dados) + (dados.configuracao.reserva || 0);

  texto("ajuda-contas", contas > 0
    ? `Mais ${moeda(contas)} de contas e reserva do mês, que você edita em "Seu mês".`
    : `Sem contas fixas cadastradas. Se tiver, cadastre em "Seu mês".`);
  texto("p-material", moeda(a.material));

  // Cobre pelo menos
  texto("preco-minimo", moeda(a.precoMinimo));
  texto("c-material", moeda(a.material));
  texto("c-outros", moeda(a.outrosGastos));
  texto("c-tempo", `(${servico.minutos} min × ${moeda(valorDaHora(dados))}/h)`);
  texto("c-parte", moeda(a.parteDaMeta));
  document.getElementById("linha-taxa").hidden = !(dados.configuracao.taxaCartao > 0);
  texto("c-taxa", moeda(a.taxaNoMinimo));

  mostrarNecessarios(a);
  grafico = desenharGraficoMeta(document.getElementById("grafico"), grafico, a);
}

function mostrarNecessarios(a) {
  const barra = document.getElementById("barra-preenchimento");
  const desconto = document.getElementById("texto-desconto");
  texto("titulo-cobrando", `Cobrando ${moeda(a.preco)}`);
  mostrarLiquido(a);

  if (a.necessarios === null) {
    texto("necessarios", "Não fecha a conta");
    document.getElementById("texto-necessarios").innerHTML =
      `${moeda(a.preco)} não paga nem os gastos do atendimento (${moeda(a.gasto)}). Cada cliente tira dinheiro do seu bolso.`;
    barra.style.width = "100%";
    barra.className = "progress-bar bg-danger";
    texto("texto-capacidade", "");
    desconto.className = "alert alert-danger mb-0 py-2 small";
    desconto.textContent = `Para pagar seu salário e suas contas, cobre pelo menos ${moeda(a.precoMinimo)}.`;
    return;
  }

  if (a.meta === 0) {
    texto("necessarios", `Sobram ${moeda(a.sobra)} por cliente`);
    document.getElementById("texto-necessarios").innerHTML =
      `Você não definiu salário nem contas. Com 100 atendimentos no mês, sobrariam
       <strong>${moeda(a.sobra * 100)}</strong>. Preencha a pergunta 1 para saber quantos clientes você precisa.`;
    barra.style.width = "0";
    texto("texto-capacidade", `Cabem ${a.capacidade} atendimentos desse serviço no seu mês.`);
    desconto.className = "alert alert-secondary mb-0 py-2 small";
    desconto.textContent = `Sem meta definida, qualquer preço acima de ${moeda(a.precoMinimo)} já deixa dinheiro no seu bolso.`;
    return;
  }

  const porDia = a.necessarios / dados.configuracao.diasPorMes;
  texto("necessarios", `${a.necessarios} atendimentos por mês`);
  document.getElementById("texto-necessarios").innerHTML =
    `Sobram <strong>${moeda(a.sobra)}</strong> de cada cliente. Para chegar em ${moeda(a.meta)} no mês,
     são cerca de <strong>${numero(porDia, 1)} por dia</strong> de trabalho.`;

  const uso = Math.min(100, (a.necessarios / a.capacidade) * 100);
  barra.style.width = `${uso}%`;
  barra.className = `progress-bar ${uso >= 100 ? "bg-danger" : uso > 85 ? "bg-warning" : "bg-success"}`;
  document.getElementById("barra").setAttribute("aria-valuenow", Math.round(uso));
  texto("texto-capacidade", a.necessarios > a.capacidade
    ? `Só cabem ${a.capacidade} atendimentos no seu mês. Com esse preço, a meta não fecha.`
    : `Cabem ${a.capacidade} atendimentos desse serviço no seu mês.`);

  if (a.desconto >= 0.005) {
    desconto.className = "alert alert-success mb-0 py-2 small";
    desconto.innerHTML = `<i class="bi bi-tag me-1"></i>Você pode dar até <strong>${moeda(a.desconto)}</strong> de desconto,
      cobrando no mínimo ${moeda(a.precoMinimo)}, sem mexer no seu salário.`;
  } else {
    desconto.className = "alert alert-warning mb-0 py-2 small";
    desconto.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>Seu preço está <strong>${moeda(-a.desconto)}</strong>
      abaixo do mínimo. Melhor não dar desconto.`;
  }
}

// Quanto a maquininha desconta do preço cobrado e quanto cai na conta.
function mostrarLiquido(a) {
  const caixa = document.getElementById("texto-liquido");
  const taxa = dados.configuracao.taxaCartao || 0;
  caixa.hidden = !(taxa > 0 && a.preco > 0);
  if (caixa.hidden) return;
  caixa.innerHTML = `<i class="bi bi-credit-card me-1"></i>Cobrando ${moeda(a.preco)} na maquininha
    (${numero(taxa, 1)}%), ela desconta <strong>${moeda(a.taxaNoPreco)}</strong> e você recebe
    <strong>${moeda(a.preco - a.taxaNoPreco)}</strong>.`;
}

function iniciar() {
  const select = document.getElementById("servico");
  if (!dados.servicos.length) {
    document.querySelector("main").insertAdjacentHTML("beforeend",
      `<p class="text-secondary">Cadastre um serviço primeiro em <a href="servicos.html">Serviços</a>.</p>`);
    return;
  }
  select.innerHTML = dados.servicos.map((s) => `<option value="${s.id}">${escapar(s.nome)}</option>`).join("");

  const pedido = new URLSearchParams(location.search).get("servico");
  if (pedido && dados.servicos.some((s) => s.id === Number(pedido))) select.value = pedido;

  select.addEventListener("change", () => {
    preencherCampos();
    calcular();
  });

  document.getElementById("salario").addEventListener("input", (e) => {
    dados.configuracao.salario = Math.max(0, Number(e.target.value) || 0);
    salvarDados(dados);
    calcular();
  });

  document.getElementById("taxaCartao").addEventListener("input", (e) => {
    dados.configuracao.taxaCartao = Math.min(99, Math.max(0, Number(e.target.value) || 0));
    salvarDados(dados);
    calcular();
  });

  for (const campo of CAMPOS_SERVICO) {
    document.getElementById(campo).addEventListener("input", (e) => {
      servicoSelecionado()[campo] = Math.max(0, Number(e.target.value) || 0);
      salvarDados(dados);
      calcular();
    });
  }

  preencherCampos();
  calcular();
}

iniciar();
