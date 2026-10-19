// Página de materiais: o que se compra para os atendimentos e quanto custa cada uso. Dados na API.

let materiais = [];
let editandoId = null; // id do material aberto no modal; null quando é um material novo

function montarTabela() {
  document.getElementById("tabela-insumos").innerHTML = materiais.map((m) => `
    <tr>
      <td class="fw-medium">${escapar(m.nome)}</td>
      <td class="text-secondary">${escapar(m.embalagem || "")}</td>
      <td class="text-end">${moeda(m.preco)}</td>
      <td class="text-end">${numero(m.rendimento)} usos</td>
      <td class="text-end fw-semibold">${moeda(m.custo_por_uso)}</td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-link p-0 me-3" onclick="abrirEdicao(${m.id})" aria-label="Editar ${escapar(m.nome)}" title="Editar">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-link text-danger p-0" onclick="removerMaterial(${m.id})" aria-label="Remover ${escapar(m.nome)}" title="Remover">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`).join("") || `<tr><td colspan="6" class="text-secondary">Nenhum material cadastrado.</td></tr>`;
}

async function removerMaterial(id) {
  try {
    await api(`/materiais/${id}`, { metodo: "DELETE" });
    materiais = materiais.filter((m) => m.id !== id);
    montarTabela();
  } catch (erro) {
    avisarErro(erro); // ex.: "Este material é usado em algum serviço…"
  }
}

function abrirEdicao(id) {
  editandoId = id;
  bootstrap.Modal.getOrCreateInstance(document.getElementById("modal-insumo")).show();
}

// Calculadora rápida: estima o rendimento pelo tempo que a embalagem dura (conta feita na API).
function iniciarCalculadoraRendimento(rendimento, atualizarCustoPorUso) {
  const duracao = document.getElementById("rend-duracao");
  const unidade = document.getElementById("rend-unidade");
  const porPeriodo = document.getElementById("rend-por-periodo");
  const resultado = document.getElementById("rend-resultado");
  const usar = document.getElementById("rend-usar");
  let estimativa = null;

  const calcular = aoPararDeDigitar(async () => {
    const d = Number(duracao.value);
    const p = Number(porPeriodo.value);
    if (!(d > 0 && p > 0)) {
      estimativa = null;
      resultado.textContent = "Preencha os dois campos.";
      usar.disabled = true;
      return;
    }
    try {
      const resposta = await api("/calculadora/rendimento", {
        metodo: "POST", corpo: { duracao: d, atendimentos_por_periodo: p },
      });
      estimativa = resposta.rendimento_estimado;
      resultado.innerHTML = `Rende cerca de <strong>${estimativa} atendimentos</strong>.`;
      usar.disabled = false;
    } catch (erro) {
      resultado.textContent = erro.message;
    }
  }, 300);

  const atualizarRotulo = () => {
    document.getElementById("rotulo-por-periodo").textContent =
      `Quantos atendimentos você faz por ${unidade.value} usando esse material?`;
  };

  for (const campo of [duracao, porPeriodo]) campo.addEventListener("input", calcular);
  unidade.addEventListener("input", atualizarRotulo);
  usar.addEventListener("click", () => {
    rendimento.value = estimativa;
    atualizarCustoPorUso();
    bootstrap.Collapse.getOrCreateInstance(document.getElementById("calc-rendimento")).hide();
  });
  atualizarRotulo();
}

function iniciarModal() {
  const preco = document.getElementById("insumo-preco");
  const rendimento = document.getElementById("insumo-rendimento");
  // Prévia enquanto a pessoa digita; o valor oficial é calculado pela API ao salvar.
  const atualizarCustoPorUso = () => {
    const r = Number(rendimento.value);
    document.getElementById("insumo-resultado").textContent = r > 0 ? moeda(Number(preco.value) / r) : "—";
  };
  for (const input of [preco, rendimento]) input.addEventListener("input", atualizarCustoPorUso);
  iniciarCalculadoraRendimento(rendimento, atualizarCustoPorUso);

  document.getElementById("modal-insumo").addEventListener("show.bs.modal", (evento) => {
    // Aberto pelo botão "Novo material", o evento traz o botão em relatedTarget.
    if (evento.relatedTarget) editandoId = null;
    const material = materiais.find((m) => m.id === editandoId);
    const formulario = document.getElementById("form-insumo");
    formulario.reset();
    document.getElementById("rend-resultado").textContent = "Preencha os dois campos.";
    document.getElementById("rend-usar").disabled = true;
    bootstrap.Collapse.getOrCreateInstance(document.getElementById("calc-rendimento"), { toggle: false }).hide();
    document.getElementById("titulo-modal-insumo").textContent = material ? "Editar material" : "Novo material";
    document.getElementById("botao-salvar-insumo").textContent = material ? "Salvar alterações" : "Adicionar";
    if (material) {
      document.getElementById("insumo-nome").value = material.nome;
      document.getElementById("insumo-embalagem").value = material.embalagem || "";
      preco.value = material.preco;
      rendimento.value = material.rendimento;
    }
    atualizarCustoPorUso();
  });

  document.getElementById("form-insumo").addEventListener("submit", async (e) => {
    e.preventDefault();
    const corpo = {
      nome: document.getElementById("insumo-nome").value.trim(),
      embalagem: document.getElementById("insumo-embalagem").value.trim(),
      preco: Number(preco.value),
      rendimento: Number(rendimento.value),
    };
    const botao = document.getElementById("botao-salvar-insumo");
    botao.disabled = true;
    try {
      if (editandoId !== null) {
        const atualizado = await api(`/materiais/${editandoId}`, { metodo: "PUT", corpo });
        materiais = materiais.map((m) => (m.id === editandoId ? atualizado : m));
      } else {
        materiais.push(await api("/materiais", { metodo: "POST", corpo }));
      }
      montarTabela();
      bootstrap.Modal.getInstance(document.getElementById("modal-insumo")).hide();
    } catch (erro) {
      avisarErro(erro);
    } finally {
      botao.disabled = false;
    }
  });
}

async function iniciar() {
  await exigirLogin();
  iniciarModal();
  document.getElementById("tabela-insumos").innerHTML =
    `<tr><td colspan="6" class="text-secondary"><span class="spinner-border spinner-border-sm me-2"></span>Carregando…</td></tr>`;
  try {
    materiais = await api("/materiais");
    montarTabela();
  } catch (erro) {
    avisarErro(erro);
  }
}

iniciar();
