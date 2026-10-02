// Página inicial: indicadores, tabela de preços e gráfico do ponto de equilíbrio.

const dados = carregarDados();
let grafico = null;

function montarIndicadores() {
  document.getElementById("nome-negocio").textContent = dados.negocio;
  document.getElementById("modo-calculo").textContent = dados.configuracao.incluirMaoDeObra
    ? "com hora de trabalho"
    : "modo simples: insumos + custos miúdos + margem";
  document.getElementById("ind-custo-mensal").textContent = moeda(custoMensalTotal(dados));
  document.getElementById("ind-custo-hora").textContent = moeda(custoHora(dados));
  document.getElementById("ind-horas").textContent = `${numero(horasProdutivas(dados))} h`;
  document.getElementById("ind-servicos").textContent = dados.servicos.length;
}

function montarTabela() {
  const linhas = dados.servicos.map((s) => {
    const a = analisarServico(s, dados);
    if (a.preco === null) {
      return `<tr><td>${escapar(s.nome)}</td><td colspan="3" class="text-danger small">Percentuais somam 100% ou mais</td></tr>`;
    }
    const cabecalho = `
        <td><div class="fw-medium">${escapar(s.nome)}</div><div class="small text-secondary">${s.minutos} min</div></td>
        <td class="text-end">${moeda(a.custo)}</td>
        <td class="text-end fw-semibold">${moeda(a.preco)}</td>`;
    if (a.pontoEquilibrio === null) {
      return `<tr>${cabecalho}<td class="small text-danger">Este preço não paga as contas fixas</td></tr>`;
    }
    const uso = Math.min(100, (a.pontoEquilibrio / a.capacidade) * 100);
    const cor = uso > 90 ? "bg-danger" : uso > 75 ? "bg-warning" : "bg-success";
    return `
      <tr>${cabecalho}
        <td style="min-width: 150px">
          <div class="small mb-1">${a.pontoEquilibrio} de ${a.capacidade} possíveis</div>
          <div class="progress barra-capacidade" role="progressbar" aria-label="Uso da capacidade"
               aria-valuenow="${Math.round(uso)}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar ${cor}" style="width: ${uso}%"></div>
          </div>
        </td>
      </tr>`;
  });
  document.getElementById("tabela-servicos").innerHTML = linhas.join("") ||
    `<tr><td colspan="4" class="text-secondary">Nenhum serviço cadastrado.</td></tr>`;
}

function montarGrafico() {
  const select = document.getElementById("servico-grafico");
  const servico = dados.servicos.find((s) => s.id === Number(select.value));
  const texto = document.getElementById("texto-equilibrio");
  if (!servico) {
    texto.textContent = "";
    return;
  }
  const a = analisarServico(servico, dados);
  grafico = desenharGraficoEquilibrio(document.getElementById("grafico"), grafico, dados, a);
  if (a.preco === null) {
    texto.innerHTML = "";
  } else if (a.pontoEquilibrio === null) {
    texto.innerHTML = `Vendendo <strong>${escapar(servico.nome)}</strong> a ${moeda(a.preco)}, a linha de receita
      nunca alcança a de custos: o preço não deixa nenhuma sobra para pagar as contas fixas.`;
  } else {
    texto.innerHTML = `Vendendo <strong>${escapar(servico.nome)}</strong> a ${moeda(a.preco)}, você cobre todos os custos a partir do
      <strong>${a.pontoEquilibrio}º atendimento</strong> do mês. Onde as linhas se cruzam, começa o lucro.`;
  }
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
