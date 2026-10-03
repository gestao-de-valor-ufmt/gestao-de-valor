// Página de materiais: o que se compra para os atendimentos e quanto custa cada uso.

const dados = carregarDados();

function insumoEmUso(id) {
  return dados.servicos.some((s) => s.insumos.some((i) => i.insumoId === id));
}

function montarTabela() {
  document.getElementById("tabela-insumos").innerHTML = dados.insumos.map((i) => `
    <tr>
      <td class="fw-medium">${escapar(i.nome)}</td>
      <td class="text-secondary">${escapar(i.embalagem || "")}</td>
      <td class="text-end">${moeda(i.preco)}</td>
      <td class="text-end">${i.rendimento} usos</td>
      <td class="text-end fw-semibold">${moeda(custoPorUso(i))}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-link text-danger p-0" onclick="removerInsumo(${i.id})" aria-label="Remover ${escapar(i.nome)}">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`).join("") || `<tr><td colspan="6" class="text-secondary">Nenhum material cadastrado.</td></tr>`;
}

function removerInsumo(id) {
  if (insumoEmUso(id)) {
    alert("Este material é usado em algum serviço. Remova-o do serviço antes.");
    return;
  }
  dados.insumos = dados.insumos.filter((i) => i.id !== id);
  salvarDados(dados);
  montarTabela();
}

// Calculadora rápida: estima o rendimento pelo tempo que a embalagem dura.
function iniciarCalculadoraRendimento(rendimento, atualizarCustoPorUso) {
  const duracao = document.getElementById("rend-duracao");
  const unidade = document.getElementById("rend-unidade");
  const porPeriodo = document.getElementById("rend-por-periodo");
  const resultado = document.getElementById("rend-resultado");
  const usar = document.getElementById("rend-usar");
  let estimativa = null;

  const atualizar = () => {
    document.getElementById("rotulo-por-periodo").textContent =
      `Quantos atendimentos você faz por ${unidade.value} usando esse material?`;
    const d = Number(duracao.value);
    const p = Number(porPeriodo.value);
    estimativa = d > 0 && p > 0 ? Math.max(1, Math.round(rendimentoEstimado(d, p))) : null;
    resultado.innerHTML = estimativa ? `Rende cerca de <strong>${estimativa} atendimentos</strong>.` : "Preencha os dois campos.";
    usar.disabled = !estimativa;
  };

  for (const campo of [duracao, unidade, porPeriodo]) campo.addEventListener("input", atualizar);
  usar.addEventListener("click", () => {
    rendimento.value = estimativa;
    atualizarCustoPorUso();
    bootstrap.Collapse.getOrCreateInstance(document.getElementById("calc-rendimento")).hide();
  });
  atualizar();
}

function iniciar() {
  const preco = document.getElementById("insumo-preco");
  const rendimento = document.getElementById("insumo-rendimento");
  const atualizarCustoPorUso = () => {
    const r = Number(rendimento.value);
    document.getElementById("insumo-resultado").textContent = r > 0 ? moeda(Number(preco.value) / r) : "—";
  };
  for (const input of [preco, rendimento]) input.addEventListener("input", atualizarCustoPorUso);
  iniciarCalculadoraRendimento(rendimento, atualizarCustoPorUso);

  document.getElementById("form-insumo").addEventListener("submit", (e) => {
    e.preventDefault();
    dados.insumos.push({
      id: proximoId(dados.insumos),
      nome: document.getElementById("insumo-nome").value.trim(),
      embalagem: document.getElementById("insumo-embalagem").value.trim(),
      preco: Number(preco.value),
      rendimento: Number(rendimento.value),
    });
    salvarDados(dados);
    montarTabela();
    e.target.reset();
    document.getElementById("insumo-resultado").textContent = "—";
    document.getElementById("rend-duracao").dispatchEvent(new Event("input"));
    bootstrap.Collapse.getOrCreateInstance(document.getElementById("calc-rendimento"), { toggle: false }).hide();
    bootstrap.Modal.getInstance(document.getElementById("modal-insumo")).hide();
  });

  montarTabela();
}

iniciar();
