// Página "Seu mês": salário, contas fixas, tempo de atendimento e taxa da maquininha.

const dados = carregarDados();
const CAMPOS_CONFIG = ["salario", "reserva", "diasPorMes", "horasPorDia", "taxaCartao"];

function montarTabela() {
  document.getElementById("tabela-custos").innerHTML = dados.custosFixos.map((c) => `
    <tr>
      <td>${escapar(c.nome)}</td>
      <td class="text-end">${moeda(c.valor)}</td>
      <td class="text-end" style="width: 2rem">
        <button class="btn btn-sm btn-link text-danger p-0" onclick="removerCusto(${c.id})" aria-label="Remover ${escapar(c.nome)}">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`).join("") || `<tr><td colspan="3" class="text-secondary">Nenhuma conta cadastrada.</td></tr>`;
  document.getElementById("total-custos").textContent = moeda(totalContasFixas(dados));
}

function montarResumo() {
  const config = dados.configuracao;
  document.getElementById("res-salario").textContent = moeda(config.salario);
  document.getElementById("res-contas").textContent = moeda(totalContasFixas(dados));
  document.getElementById("res-reserva").textContent = moeda(config.reserva || 0);
  document.getElementById("res-meta").textContent = moeda(metaMensal(dados));

  const horas = horasDeAtendimento(dados);
  document.getElementById("res-hora").innerHTML = horas > 0
    ? `Você atende <strong>${numero(horas)} horas</strong> por mês. Para bater a meta, cada hora atendendo precisa
       render <strong>${moeda(valorDaHora(dados))}</strong>, além do material.`
    : "Preencha os dias e as horas de atendimento.";
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

function adicionarCusto(nome, valor) {
  dados.custosFixos.push({ id: proximoId(dados.custosFixos), nome, valor });
  atualizar();
}

function iniciar() {
  for (const campo of CAMPOS_CONFIG) {
    const input = document.getElementById(campo);
    input.value = dados.configuracao[campo] ?? 0;
    input.addEventListener("input", () => {
      dados.configuracao[campo] = Math.max(0, Number(input.value) || 0);
      atualizar();
    });
  }

  document.getElementById("form-custo").addEventListener("submit", (e) => {
    e.preventDefault();
    adicionarCusto(
      document.getElementById("custo-nome").value.trim(),
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
    adicionarCusto(`Reposição: ${nome}`, Math.round(calcularDepreciacao() * 100) / 100);
    e.target.reset();
    document.getElementById("dep-resultado").textContent = "—";
    bootstrap.Modal.getInstance(document.getElementById("modal-depreciacao")).hide();
  });

  montarTabela();
  montarResumo();
}

iniciar();
