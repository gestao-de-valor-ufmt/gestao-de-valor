// Calculadora: 4 perguntas → quanto cobrar, quantos atendimentos e quanto dá de desconto.
// Enquanto a pessoa digita, a API simula o resultado (sem gravar); quando ela para, as mudanças são salvas.

const CAMPOS_SERVICO = { outrosGastos: "outros_gastos", minutos: "minutos", precoCobrado: "preco_cobrado" };

let configuracao = null;
let servicos = [];
let totalContas = 0;
let materialPorServico = {}; // custo do material de cada serviço (vem do resumo da API)
let grafico = null;

function texto(id, valor) {
  document.getElementById(id).textContent = valor;
}

function servicoSelecionado() {
  const id = Number(document.getElementById("servico").value);
  return servicos.find((s) => s.id === id);
}

function meta() {
  return configuracao.salario + totalContas + (configuracao.reserva || 0);
}

// Preenche os campos com os valores salvos do serviço escolhido.
function preencherCampos() {
  const servico = servicoSelecionado();
  document.getElementById("salario").value = configuracao.salario;
  document.getElementById("taxaCartao").value = configuracao.taxa_cartao ?? 0;
  for (const [idCampo, campo] of Object.entries(CAMPOS_SERVICO)) {
    document.getElementById(idCampo).value = servico[campo] ?? 0;
  }
}

const calcular = aoPararDeDigitar(async () => {
  const servico = servicoSelecionado();
  if (!servico || !(servico.minutos > 0)) return;
  let a;
  try {
    a = await api("/calculadora/simular", {
      metodo: "POST",
      corpo: {
        salario: configuracao.salario,
        contas_fixas: totalContas,
        reserva: configuracao.reserva || 0,
        dias_por_mes: configuracao.dias_por_mes,
        horas_por_dia: configuracao.horas_por_dia,
        taxa_cartao: configuracao.taxa_cartao || 0,
        material: materialPorServico[servico.id] || 0,
        outros_gastos: servico.outros_gastos,
        minutos: servico.minutos,
        preco_cobrado: servico.preco_cobrado,
      },
    });
  } catch (erro) {
    texto("preco-minimo", "—");
    texto("texto-necessarios", erro.message);
    return;
  }
  mostrarResultado(servico, a);
}, 300);

function mostrarResultado(servico, a) {
  const outras = totalContas + (configuracao.reserva || 0);
  texto("ajuda-contas", outras > 0
    ? `Mais ${moeda(outras)} de contas e reserva do mês, que você edita em "Seu mês".`
    : `Sem contas fixas cadastradas. Se tiver, cadastre em "Seu mês".`);
  texto("p-material", moeda(a.material));

  // Cobre pelo menos
  texto("preco-minimo", moeda(a.preco_minimo));
  texto("c-material", moeda(a.material));
  texto("c-outros", moeda(a.outros_gastos));
  texto("c-tempo", `(${numero(servico.minutos)} min × ${moeda(a.parte_da_meta / (servico.minutos / 60))}/h)`);
  texto("c-parte", moeda(a.parte_da_meta));
  document.getElementById("linha-taxa").hidden = !(configuracao.taxa_cartao > 0);
  texto("c-taxa", moeda(a.taxa_no_minimo));

  mostrarNecessarios(a);
  grafico = desenharGraficoMeta(document.getElementById("grafico"), grafico, { ...a, meta: meta() });
}

function mostrarNecessarios(a) {
  const barra = document.getElementById("barra-preenchimento");
  const desconto = document.getElementById("texto-desconto");
  texto("titulo-cobrando", `Cobrando ${moeda(a.preco_cobrado)}`);
  mostrarLiquido(a);

  if (a.atendimentos_necessarios === null) {
    texto("necessarios", "Não fecha a conta");
    document.getElementById("texto-necessarios").innerHTML =
      `${moeda(a.preco_cobrado)} não paga nem os gastos do atendimento (${moeda(a.gasto)}). Cada cliente tira dinheiro do seu bolso.`;
    barra.style.width = "100%";
    barra.className = "progress-bar bg-danger";
    texto("texto-capacidade", "");
    desconto.className = "alert alert-danger mb-0 py-2 small";
    desconto.textContent = `Para pagar seu salário e suas contas, cobre pelo menos ${moeda(a.preco_minimo)}.`;
    return;
  }

  if (meta() === 0) {
    texto("necessarios", `Sobram ${moeda(a.sobra)} por cliente`);
    document.getElementById("texto-necessarios").innerHTML =
      `Você não definiu salário nem contas. Com 100 atendimentos no mês, sobrariam
       <strong>${moeda(a.sobra * 100)}</strong>. Preencha a pergunta 1 para saber quantos clientes você precisa.`;
    barra.style.width = "0";
    texto("texto-capacidade", `Cabem ${a.capacidade} atendimentos desse serviço no seu mês.`);
    desconto.className = "alert alert-secondary mb-0 py-2 small";
    desconto.textContent = `Sem meta definida, qualquer preço acima de ${moeda(a.preco_minimo)} já deixa dinheiro no seu bolso.`;
    return;
  }

  const porDia = a.atendimentos_necessarios / configuracao.dias_por_mes;
  texto("necessarios", `${a.atendimentos_necessarios} atendimentos por mês`);
  document.getElementById("texto-necessarios").innerHTML =
    `Sobram <strong>${moeda(a.sobra)}</strong> de cada cliente. Para chegar em ${moeda(meta())} no mês,
     são cerca de <strong>${numero(porDia, 1)} por dia</strong> de trabalho.`;

  const uso = Math.min(100, (a.atendimentos_necessarios / a.capacidade) * 100);
  barra.style.width = `${uso}%`;
  barra.className = `progress-bar ${uso >= 100 ? "bg-danger" : uso > 85 ? "bg-warning" : "bg-success"}`;
  document.getElementById("barra").setAttribute("aria-valuenow", Math.round(uso));
  texto("texto-capacidade", a.atendimentos_necessarios > a.capacidade
    ? `Só cabem ${a.capacidade} atendimentos no seu mês. Com esse preço, a meta não fecha.`
    : `Cabem ${a.capacidade} atendimentos desse serviço no seu mês.`);

  if (a.desconto_maximo >= 0.005) {
    desconto.className = "alert alert-success mb-0 py-2 small";
    desconto.innerHTML = `<i class="bi bi-tag me-1"></i>Você pode dar até <strong>${moeda(a.desconto_maximo)}</strong> de desconto,
      cobrando no mínimo ${moeda(a.preco_minimo)}, sem mexer no seu salário.`;
  } else {
    desconto.className = "alert alert-warning mb-0 py-2 small";
    desconto.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>Seu preço está <strong>${moeda(-a.desconto_maximo)}</strong>
      abaixo do mínimo. Melhor não dar desconto.`;
  }
}

// Quanto a maquininha desconta do preço cobrado e quanto cai na conta.
function mostrarLiquido(a) {
  const caixa = document.getElementById("texto-liquido");
  const taxa = configuracao.taxa_cartao || 0;
  caixa.hidden = !(taxa > 0 && a.preco_cobrado > 0);
  if (caixa.hidden) return;
  caixa.innerHTML = `<i class="bi bi-credit-card me-1"></i>Cobrando ${moeda(a.preco_cobrado)} na maquininha
    (${numero(taxa, 1)}%), ela desconta <strong>${moeda(a.taxa_no_preco)}</strong> e você recebe
    <strong>${moeda(a.valor_liquido)}</strong>.`;
}

// Gravação: espera a pessoa parar de digitar e salva só o que mudou.
const salvarConfiguracao = aoPararDeDigitar(async () => {
  try {
    configuracao = await api("/configuracao", { metodo: "PUT", corpo: configuracao });
  } catch (erro) {
    avisarErro(erro);
  }
}, 900);

const salvarServico = aoPararDeDigitar(async (servico) => {
  if (!(servico.minutos > 0)) return;
  const { id, ...corpo } = servico;
  try {
    await api(`/servicos/${id}`, { metodo: "PUT", corpo });
  } catch (erro) {
    avisarErro(erro);
  }
}, 900);

async function iniciar() {
  await exigirLogin();
  const select = document.getElementById("servico");
  select.innerHTML = `<option>Carregando…</option>`;

  let resumo;
  try {
    [configuracao, servicos, resumo] = await Promise.all([
      api("/configuracao"), api("/servicos"), api("/calculadora/resumo"),
    ]);
  } catch (erro) {
    avisarErro(erro);
    return;
  }
  totalContas = resumo.total_contas;
  materialPorServico = Object.fromEntries(resumo.servicos.map((a) => [a.servico_id, a.material]));

  if (!servicos.length) {
    select.innerHTML = "";
    document.querySelector("main").insertAdjacentHTML("beforeend",
      `<div class="alert alert-info mt-3">Cadastre um serviço primeiro em <a href="servicos.html">Serviços</a>.</div>`);
    return;
  }
  select.innerHTML = servicos.map((s) => `<option value="${s.id}">${escapar(s.nome)}</option>`).join("");

  const pedido = new URLSearchParams(location.search).get("servico");
  if (pedido && servicos.some((s) => s.id === Number(pedido))) select.value = pedido;

  select.addEventListener("change", () => {
    preencherCampos();
    calcular();
  });

  document.getElementById("salario").addEventListener("input", (e) => {
    configuracao.salario = Math.max(0, Number(e.target.value) || 0);
    calcular();
    salvarConfiguracao();
  });

  document.getElementById("taxaCartao").addEventListener("input", (e) => {
    configuracao.taxa_cartao = Math.min(99, Math.max(0, Number(e.target.value) || 0));
    calcular();
    salvarConfiguracao();
  });

  for (const [idCampo, campo] of Object.entries(CAMPOS_SERVICO)) {
    document.getElementById(idCampo).addEventListener("input", (e) => {
      const servico = servicoSelecionado();
      servico[campo] = Math.max(0, Number(e.target.value) || 0);
      calcular();
      salvarServico(servico);
    });
  }

  preencherCampos();
  calcular();
}

iniciar();
