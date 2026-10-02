// Página inicial: indicadores, tabela de preços e gráfico da meta.

const dados = carregarDados();
let grafico = null;

function montarIndicadores() {
  document.getElementById("nome-negocio").textContent = dados.negocio;
  document.getElementById("ind-meta").textContent = moeda(metaMensal(dados));
  document.getElementById("ind-hora").textContent = moeda(valorDaHora(dados));
  document.getElementById("ind-horas").textContent = `${numero(horasDeAtendimento(dados))} h`;
  document.getElementById("ind-servicos").textContent = dados.servicos.length;
}

function montarTabela() {
  const linhas = dados.servicos.map((s) => {
    const a = analisarServico(s, dados);
    const abaixo = a.preco < a.precoMinimo - 0.005;
    let necessarios;
    if (a.necessarios === null) {
      necessarios = `<span class="small text-danger">Não paga nem o material</span>`;
    } else if (a.meta === 0) {
      necessarios = `<span class="small text-secondary">Sem meta: sobram ${moeda(a.sobra)} por cliente</span>`;
    } else {
      const uso = Math.min(100, (a.necessarios / a.capacidade) * 100);
      const cor = uso >= 100 ? "bg-danger" : uso > 85 ? "bg-warning" : "bg-success";
      necessarios = `
        <div class="small mb-1">${a.necessarios} de ${a.capacidade} que cabem</div>
        <div class="progress barra-capacidade" role="progressbar" aria-label="Quanto da agenda é preciso ocupar"
             aria-valuenow="${Math.round(uso)}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar ${cor}" style="width: ${uso}%"></div>
        </div>`;
    }
    return `
      <tr>
        <td><a class="fw-medium text-reset" href="calculadora.html?servico=${s.id}">${escapar(s.nome)}</a>
          <div class="small text-secondary">${s.minutos} min</div></td>
        <td class="text-end">${moeda(a.precoMinimo)}</td>
        <td class="text-end fw-semibold ${abaixo ? "text-danger" : ""}">${moeda(a.preco)}</td>
        <td style="min-width: 150px">${necessarios}</td>
      </tr>`;
  });
  document.getElementById("tabela-servicos").innerHTML = linhas.join("") ||
    `<tr><td colspan="4" class="text-secondary">Nenhum serviço cadastrado.</td></tr>`;
}

function montarGrafico() {
  const select = document.getElementById("servico-grafico");
  const servico = dados.servicos.find((s) => s.id === Number(select.value));
  const texto = document.getElementById("texto-meta");
  if (!servico) {
    texto.textContent = "";
    return;
  }
  const a = analisarServico(servico, dados);
  grafico = desenharGraficoMeta(document.getElementById("grafico"), grafico, a);
  texto.innerHTML = a.necessarios === null
    ? `Cobrando ${moeda(a.preco)}, não sobra nada de cada atendimento: a meta nunca é alcançada.`
    : a.meta === 0
    ? `Sem salário nem contas definidos em "Seu mês". Cada cliente deixa ${moeda(a.sobra)} no seu bolso.`
    : `Cobrando ${moeda(a.preco)} na <strong>${escapar(servico.nome)}</strong>, você bate a meta no
       <strong>${a.necessarios}º atendimento</strong> do mês. Depois disso, é dinheiro extra.`;
}

function iniciar() {
  montarIndicadores();
  montarTabela();

  const select = document.getElementById("servico-grafico");
  select.innerHTML = dados.servicos.map((s) => `<option value="${s.id}">${escapar(s.nome)}</option>`).join("");
  select.addEventListener("change", montarGrafico);
  montarGrafico();
}

iniciar();
