// Página de custos fixos: lista de despesas e configuração da hora técnica.

const dados = carregarDados();
const CAMPOS_CONFIG = ["proLabore", "diasPorMes", "horasPorDia", "produtividade"];

function montarTabela() {
  document.getElementById("tabela-custos").innerHTML = dados.custosFixos.map((c) => `
    <tr>
      <td>${escapar(c.nome)}</td>
      <td><span class="badge text-bg-light border">${escapar(c.categoria)}</span></td>
      <td class="text-end">${moeda(c.valor)}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-link text-danger p-0" onclick="removerCusto(${c.id})" aria-label="Remover ${escapar(c.nome)}">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`).join("") || `<tr><td colspan="4" class="text-secondary">Nenhuma despesa cadastrada.</td></tr>`;
  document.getElementById("total-custos").textContent = moeda(totalCustosFixos(dados));
}

function montarResumo() {
  document.getElementById("produtividade-valor").textContent = `${dados.configuracao.produtividade}%`;
  document.getElementById("res-fixos").textContent = moeda(totalCustosFixos(dados));
  document.getElementById("res-prolabore").textContent = moeda(dados.configuracao.proLabore);
  document.getElementById("res-horas").textContent = `${numero(horasProdutivas(dados), 1)} h`;
  document.getElementById("res-hora").textContent = moeda(custoHora(dados));
}

function atualizar() {
  salvarDados(dados);
  montarTabela();
  montarResumo();
}

function removerCusto(id) {
  dados.custosFixos = dados.custosFixos.filter((c) => c.id !== id);
  atualizar();
}

function adicionarCusto(nome, categoria, valor) {
  dados.custosFixos.push({ id: proximoId(dados.custosFixos), nome, categoria, valor });
  atualizar();
}

function iniciar() {
  for (const campo of CAMPOS_CONFIG) {
    const input = document.getElementById(campo);
    input.value = dados.configuracao[campo];
    input.addEventListener("input", () => {
      dados.configuracao[campo] = Number(input.value) || 0;
      atualizar();
    });
  }

  document.getElementById("form-custo").addEventListener("submit", (e) => {
    e.preventDefault();
    adicionarCusto(
      document.getElementById("custo-nome").value.trim(),
      document.getElementById("custo-categoria").value,
      Number(document.getElementById("custo-valor").value),
    );
    e.target.reset();
    bootstrap.Modal.getInstance(document.getElementById("modal-custo")).hide();
  });

  const depValor = document.getElementById("dep-valor");
  const depMeses = document.getElementById("dep-meses");
  const calcularDepreciacao = () => {
    const meses = Number(depMeses.value);
    return meses > 0 ? Number(depValor.value) / meses : null;
  };
  for (const input of [depValor, depMeses]) {
    input.addEventListener("input", () => {
      document.getElementById("dep-resultado").textContent = moeda(calcularDepreciacao());
    });
  }

  document.getElementById("form-depreciacao").addEventListener("submit", (e) => {
    e.preventDefault();
    const nome = document.getElementById("dep-nome").value.trim();
    adicionarCusto(`Depreciação: ${nome}`, "Depreciação", Math.round(calcularDepreciacao() * 100) / 100);
    e.target.reset();
    document.getElementById("dep-resultado").textContent = "—";
    bootstrap.Modal.getInstance(document.getElementById("modal-depreciacao")).hide();
  });

  montarTabela();
  montarResumo();
}

iniciar();
