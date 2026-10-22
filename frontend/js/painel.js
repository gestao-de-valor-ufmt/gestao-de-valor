// Página inicial: indicadores, tabela de preços e gráfico da meta. Os números vêm da API.

let resumo = null;
let grafico = null;

function montarIndicadores() {
  document.getElementById("ind-meta").textContent = moeda(resumo.meta);
  montarGanhoPorHora();
  document.getElementById("ind-horas").textContent = `${numero(resumo.horas_de_atendimento)} h`;
  document.getElementById("ind-servicos").textContent = resumo.servicos.length;
}

// Quanto sobra por hora de trabalho com os preços atuais: um valor, ou de quanto a quanto
// quando há vários serviços. Embaixo, o mínimo por hora para pagar salário e contas.
function montarGanhoPorHora() {
  const valor = document.getElementById("ind-hora");
  const minimo = document.getElementById("ind-hora-minimo");
  const ganhos = resumo.servicos.filter((a) => a.preco_cobrado > 0).map((a) => a.ganho_por_hora);
  if (!ganhos.length) {
    valor.textContent = "—";
    minimo.textContent = "informe quanto você cobra";
    return;
  }
  const menor = Math.min(...ganhos);
  const maior = Math.max(...ganhos);
  valor.classList.toggle("valor-faixa", maior - menor >= 0.005);
  valor.innerHTML = maior - menor < 0.005
    ? moeda(menor)
    : `${moeda(menor)} <span class="fw-normal fs-6">a</span> ${moeda(maior)}`;

  if (resumo.meta === 0) {
    minimo.textContent = "tirando os gastos";
  } else if (menor < resumo.valor_da_hora - 0.005) {
    minimo.innerHTML = `<span class="text-danger"><i class="bi bi-exclamation-triangle me-1"></i>mínimo: ${moeda(resumo.valor_da_hora)}</span>`;
  } else {
    minimo.innerHTML = `<i class="bi bi-check-circle text-success me-1"></i>mínimo: ${moeda(resumo.valor_da_hora)}`;
  }
}

function montarTabela() {
  const linhas = resumo.servicos.map((a) => {
    const abaixo = a.preco_cobrado < a.preco_minimo - 0.005;
    let necessarios;
    if (a.atendimentos_necessarios === null) {
      necessarios = `<span class="small text-danger">Não paga nem o material</span>`;
    } else if (resumo.meta === 0) {
      necessarios = `<span class="small text-secondary">Sem meta: sobram ${moeda(a.sobra)} por cliente</span>`;
    } else {
      const uso = Math.min(100, (a.atendimentos_necessarios / a.capacidade) * 100);
      const cor = uso >= 100 ? "bg-danger" : uso > 85 ? "bg-warning" : "bg-success";
      necessarios = `
        <div class="small mb-1">${a.atendimentos_necessarios} de ${a.capacidade} que cabem</div>
        <div class="progress barra-capacidade" role="progressbar" aria-label="Quanto da agenda é preciso ocupar"
             aria-valuenow="${Math.round(uso)}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar ${cor}" style="width: ${uso}%"></div>
        </div>`;
    }
    return `
      <tr>
        <td><a class="fw-medium text-reset" href="calculadora.html?servico=${a.servico_id}">${escapar(a.nome)}</a></td>
        <td class="text-end">${moeda(a.preco_minimo)}</td>
        <td class="text-end fw-semibold ${abaixo ? "text-danger" : ""}">${moeda(a.preco_cobrado)}</td>
        <td class="text-end ${abaixo ? "text-danger" : ""}">${a.preco_cobrado > 0 ? moeda(a.ganho_por_hora) : "—"}</td>
        <td style="min-width: 150px">${necessarios}</td>
      </tr>`;
  });
  document.getElementById("tabela-servicos").innerHTML = linhas.join("") ||
    `<tr><td colspan="5"class="text-secondary">Nenhum serviço cadastrado. <a href="servicos.html">Cadastrar serviço</a></td></tr>`;
}

function montarGrafico() {
  const select = document.getElementById("servico-grafico");
  const a = resumo.servicos.find((s) => s.servico_id === Number(select.value));
  const texto = document.getElementById("texto-meta");
  if (!a) {
    texto.textContent = "Cadastre um serviço para ver o gráfico.";
    return;
  }
  grafico = desenharGraficoMeta(document.getElementById("grafico"), grafico, { ...a, meta: resumo.meta });
  texto.innerHTML = a.atendimentos_necessarios === null
    ? `Cobrando ${moeda(a.preco_cobrado)}, não sobra nada de cada atendimento: a meta nunca é alcançada.`
    : resumo.meta === 0
    ? `Sem salário nem contas definidos em "Seu mês". Cada cliente deixa ${moeda(a.sobra)} no seu bolso.`
    : `Cobrando ${moeda(a.preco_cobrado)} na <strong>${escapar(a.nome)}</strong>, você bate a meta no
       <strong>${a.atendimentos_necessarios}º atendimento</strong> do mês. Depois disso, é dinheiro extra.`;
}

async function carregarExemplo() {
  const botao = document.getElementById("carregar-exemplo");
  const textoOriginal = botao.innerHTML;
  botao.disabled = true;
  botao.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Preparando o exemplo…`;
  try {
    await api("/conta/exemplo", { metodo: "POST" });
    await carregar();
  } catch (erro) {
    avisarErro(erro);
  } finally {
    botao.disabled = false;
    botao.innerHTML = textoOriginal;
  }
}

async function carregar() {
  const area = document.getElementById("carregando-painel");
  carregando(area, "Carregando seus números…");
  try {
    resumo = await api("/calculadora/resumo");
  } catch (erro) {
    area.innerHTML = `<div class="alert alert-danger">${escapar(erro.message)}</div>`;
    return;
  }
  area.innerHTML = "";

  // Conta nova: sem serviços e sem meta, mostra as boas-vindas.
  const vazia = resumo.servicos.length === 0 && resumo.meta === 0;
  document.getElementById("boas-vindas").hidden = !vazia;
  document.getElementById("conteudo-painel").hidden = vazia;
  if (vazia) return;

  montarIndicadores();
  montarTabela();
  const select = document.getElementById("servico-grafico");
  select.innerHTML = resumo.servicos.map((s) => `<option value="${s.servico_id}">${escapar(s.nome)}</option>`).join("");
  montarGrafico();
}

async function iniciar() {
  const usuario = await exigirLogin();
  const nome = usuario.displayName || (usuario.email || "").split("@")[0];
  if (nome) document.getElementById("nome-usuario").textContent = `, ${nome.split(" ")[0]}`;

  document.getElementById("servico-grafico").addEventListener("change", montarGrafico);
  document.getElementById("carregar-exemplo").addEventListener("click", carregarExemplo);
  await carregar();
}

iniciar();
