// Página de serviços: o que cada atendimento usa de material, quanto tempo leva e quanto se cobra.
// Os dados ficam na API; o preço mínimo de cada serviço vem do resumo calculado no servidor.

let servicos = [];
let materiais = [];
let analises = {}; // análise de cada serviço, por id
let editandoId = null; // id do serviço aberto no modal; null quando é um serviço novo

function campoValor(id, campo, valor, passo) {
  return `
    <div class="input-group input-group-sm" style="width: 7.5rem">
      <span class="input-group-text">R$</span>
      <input class="form-control text-end" type="number" min="0" step="${passo}" id="${campo}-${id}"
             value="${valor ?? 0}" onchange="alterarServico(${id}, '${campo}', this.value)">
    </div>`;
}

function montarLista() {
  const porId = Object.fromEntries(materiais.map((m) => [m.id, m]));
  const cartoes = servicos.map((s) => {
    const a = analises[s.id];
    const abaixo = a && a.preco_cobrado < a.preco_minimo - 0.005;
    const itens = s.materiais.map((item) => {
      const material = porId[item.material_id];
      if (!material) return "";
      return `<li class="d-flex justify-content-between">
        <span>${escapar(material.nome)} <span class="text-secondary">× ${numero(item.quantidade, item.quantidade % 1 ? 1 : 0)}</span></span>
        <span>${moeda(material.custo_por_uso * item.quantidade)}</span>
      </li>`;
    }).join("");

    return `
      <div class="col-md-6 col-xl-4">
        <div class="card h-100">
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div>
                <h2 class="h5 fw-semibold mb-0">${escapar(s.nome)}</h2>
                <span class="small text-secondary"><i class="bi bi-clock me-1"></i>${numero(s.minutos)} min</span>
              </div>
              <div class="d-flex gap-3">
                <button class="btn btn-sm btn-link p-0" onclick="abrirEdicao(${s.id})" aria-label="Editar ${escapar(s.nome)}" title="Editar">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-link text-danger p-0" onclick="removerServico(${s.id})" aria-label="Remover ${escapar(s.nome)}" title="Remover">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
            <div class="linha-composicao small"><span>Material</span><span>${a ? moeda(a.material) : "—"}</span></div>
            <div class="linha-composicao small align-items-center">
              <label for="outros_gastos-${s.id}">Deslocamento e outros</label>
              ${campoValor(s.id, "outros_gastos", s.outros_gastos, 0.5)}
            </div>
            <details class="small mt-2">
              <summary class="text-secondary">Ver material (${s.materiais.length} itens)</summary>
              <ul class="list-unstyled mt-2 mb-0 vstack gap-1">${itens || "<li class='text-secondary'>Nenhum material.</li>"}</ul>
            </details>
            <div class="mt-auto pt-3">
              <div class="linha-composicao"><span>Cobre pelo menos</span><strong>${a ? moeda(a.preco_minimo) : "—"}</strong></div>
              <div class="linha-composicao align-items-center">
                <label for="preco_cobrado-${s.id}">Você cobra</label>
                ${campoValor(s.id, "preco_cobrado", s.preco_cobrado, 1)}
              </div>
              ${abaixo ? `<div class="small text-danger mt-1"><i class="bi bi-exclamation-triangle me-1"></i>Abaixo do mínimo</div>` : ""}
              <a class="btn btn-outline-primary btn-sm w-100 mt-3" href="calculadora.html?servico=${s.id}">
                <i class="bi bi-calculator me-1"></i>Abrir na calculadora
              </a>
            </div>
          </div>
        </div>
      </div>`;
  });

  document.getElementById("lista-servicos").innerHTML = cartoes.join("") ||
    `<div class="col-12 text-secondary">Nenhum serviço cadastrado. Clique em <strong>Novo serviço</strong> para começar.</div>`;
}

// Recalcula os preços mínimos no servidor e redesenha os cartões.
async function atualizarAnalises() {
  const resumo = await api("/calculadora/resumo");
  analises = Object.fromEntries(resumo.servicos.map((a) => [a.servico_id, a]));
  montarLista();
}

function dadosParaApi(servico) {
  const { id, ...corpo } = servico;
  return corpo;
}

async function alterarServico(id, campo, valor) {
  const servico = servicos.find((s) => s.id === id);
  try {
    const atualizado = await api(`/servicos/${id}`, {
      metodo: "PUT", corpo: { ...dadosParaApi(servico), [campo]: Math.max(0, Number(valor) || 0) },
    });
    servicos = servicos.map((s) => (s.id === id ? atualizado : s));
    await atualizarAnalises();
  } catch (erro) {
    avisarErro(erro);
  }
}

async function removerServico(id) {
  const servico = servicos.find((s) => s.id === id);
  if (!confirm(`Remover o serviço "${servico.nome}"?`)) return;
  try {
    await api(`/servicos/${id}`, { metodo: "DELETE" });
    servicos = servicos.filter((s) => s.id !== id);
    montarLista();
  } catch (erro) {
    avisarErro(erro);
  }
}

function adicionarLinhaInsumo(materialId = null, quantidade = 1) {
  const area = document.getElementById("linhas-insumos");
  if (!materiais.length) {
    area.innerHTML = `<p class="small text-secondary mb-0">Você ainda não cadastrou materiais.
      <a href="insumos.html">Cadastrar materiais</a> (dá para salvar o serviço sem material e completar depois).</p>`;
    return;
  }
  const opcoes = materiais.map((m) =>
    `<option value="${m.id}" ${m.id === materialId ? "selected" : ""}>${escapar(m.nome)}</option>`).join("");
  const linha = document.createElement("div");
  linha.className = "row g-2 align-items-center linha-insumo";
  linha.innerHTML = `
    <div class="col"><select class="form-select form-select-sm" aria-label="Material">${opcoes}</select></div>
    <div class="col-3"><input class="form-control form-control-sm" type="number" min="0.1" step="0.1" value="${quantidade}" aria-label="Quantidade"></div>
    <div class="col-auto"><button type="button" class="btn btn-sm btn-link text-danger p-0" aria-label="Remover linha"><i class="bi bi-x-lg"></i></button></div>`;
  linha.querySelector("button").addEventListener("click", () => linha.remove());
  area.appendChild(linha);
}

function abrirEdicao(id) {
  editandoId = id;
  bootstrap.Modal.getOrCreateInstance(document.getElementById("modal-servico")).show();
}

// Prepara o modal: em branco para um serviço novo, ou preenchido para editar.
function prepararModal(evento) {
  // Aberto pelo botão "Novo serviço" (data-bs-toggle), o evento traz o botão em relatedTarget.
  if (evento.relatedTarget) editandoId = null;
  const servico = servicos.find((s) => s.id === editandoId);

  document.getElementById("form-servico").reset();
  document.getElementById("linhas-insumos").innerHTML = "";
  document.getElementById("titulo-modal-servico").textContent = servico ? "Editar serviço" : "Novo serviço";
  document.getElementById("botao-salvar-servico").textContent = servico ? "Salvar alterações" : "Salvar serviço";

  if (!servico) {
    adicionarLinhaInsumo();
    return;
  }
  document.getElementById("servico-nome").value = servico.nome;
  document.getElementById("servico-minutos").value = servico.minutos;
  document.getElementById("servico-outros").value = servico.outros_gastos ?? 0;
  document.getElementById("servico-preco").value = servico.preco_cobrado ?? 0;
  if (!servico.materiais.length) adicionarLinhaInsumo();
  for (const item of servico.materiais) adicionarLinhaInsumo(item.material_id, item.quantidade);
}

async function salvarModal(e) {
  e.preventDefault();
  const corpo = {
    nome: document.getElementById("servico-nome").value.trim(),
    minutos: Number(document.getElementById("servico-minutos").value),
    outros_gastos: Number(document.getElementById("servico-outros").value) || 0,
    preco_cobrado: Number(document.getElementById("servico-preco").value) || 0,
    materiais: [...document.querySelectorAll(".linha-insumo")].map((linha) => ({
      material_id: Number(linha.querySelector("select").value),
      quantidade: Number(linha.querySelector("input").value) || 0,
    })).filter((i) => i.quantidade > 0),
  };
  const botao = document.getElementById("botao-salvar-servico");
  botao.disabled = true;
  try {
    if (servicos.some((s) => s.id === editandoId)) {
      const atualizado = await api(`/servicos/${editandoId}`, { metodo: "PUT", corpo });
      servicos = servicos.map((s) => (s.id === editandoId ? atualizado : s));
    } else {
      servicos.push(await api("/servicos", { metodo: "POST", corpo }));
    }
    bootstrap.Modal.getInstance(document.getElementById("modal-servico")).hide();
    await atualizarAnalises();
  } catch (erro) {
    avisarErro(erro);
  } finally {
    botao.disabled = false;
  }
}

async function iniciar() {
  await exigirLogin();
  document.getElementById("adicionar-linha").addEventListener("click", () => adicionarLinhaInsumo());
  document.getElementById("modal-servico").addEventListener("show.bs.modal", prepararModal);
  document.getElementById("form-servico").addEventListener("submit", salvarModal);

  carregando(document.getElementById("lista-servicos"));
  try {
    [servicos, materiais] = await Promise.all([api("/servicos"), api("/materiais")]);
    await atualizarAnalises();
  } catch (erro) {
    avisarErro(erro);
  }
}

iniciar();
