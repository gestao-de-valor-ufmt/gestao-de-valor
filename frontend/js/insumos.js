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

function iniciar() {
  const preco = document.getElementById("insumo-preco");
  const rendimento = document.getElementById("insumo-rendimento");
  for (const input of [preco, rendimento]) {
    input.addEventListener("input", () => {
      const r = Number(rendimento.value);
      document.getElementById("insumo-resultado").textContent = r > 0 ? moeda(Number(preco.value) / r) : "—";
    });
  }

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
    bootstrap.Modal.getInstance(document.getElementById("modal-insumo")).hide();
  });

  montarTabela();
}

iniciar();
