// Página de serviços: o que cada atendimento usa de material, quanto tempo leva e quanto se cobra.

const dados = carregarDados();

function campoValor(id, campo, valor, passo) {
  return `
    <div class="input-group input-group-sm" style="width: 7.5rem">
      <span class="input-group-text">R$</span>
      <input class="form-control text-end" type="number" min="0" step="${passo}" id="${campo}-${id}"
             value="${valor ?? 0}" onchange="alterarServico(${id}, '${campo}', this.value)">
    </div>`;
}

function montarLista() {
  const cartoes = dados.servicos.map((s) => {
    const a = analisarServico(s, dados);
    const abaixo = a.preco < a.precoMinimo - 0.005;
    const itens = s.insumos.map((item) => {
      const insumo = dados.insumos.find((i) => i.id === item.insumoId);
      if (!insumo) return "";
      return `<li class="d-flex justify-content-between">
        <span>${escapar(insumo.nome)} <span class="text-secondary">× ${item.quantidade}</span></span>
        <span>${moeda(custoPorUso(insumo) * item.quantidade)}</span>
      </li>`;
    }).join("");

    return `
      <div class="col-md-6 col-xl-4">
        <div class="card h-100">
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div>
                <h2 class="h5 fw-semibold mb-0">${escapar(s.nome)}</h2>
                <span class="small text-secondary"><i class="bi bi-clock me-1"></i>${s.minutos} min</span>
              </div>
              <button class="btn btn-sm btn-link text-danger p-0" onclick="removerServico(${s.id})" aria-label="Remover ${escapar(s.nome)}">
                <i class="bi bi-trash"></i>
              </button>
            </div>
            <div class="linha-composicao small"><span>Material</span><span>${moeda(a.material)}</span></div>
            <div class="linha-composicao small align-items-center">
              <label for="outrosGastos-${s.id}">Deslocamento e outros</label>
              ${campoValor(s.id, "outrosGastos", s.outrosGastos, 0.5)}
            </div>
            <details class="small mt-2">
              <summary class="text-secondary">Ver material (${s.insumos.length} itens)</summary>
              <ul class="list-unstyled mt-2 mb-0 vstack gap-1">${itens}</ul>
            </details>
            <div class="mt-auto pt-3">
              <div class="linha-composicao"><span>Cobre pelo menos</span><strong>${moeda(a.precoMinimo)}</strong></div>
              <div class="linha-composicao align-items-center">
                <label for="precoCobrado-${s.id}">Você cobra</label>
                ${campoValor(s.id, "precoCobrado", s.precoCobrado, 1)}
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
    `<div class="col-12 text-secondary">Nenhum serviço cadastrado.</div>`;
}

function alterarServico(id, campo, valor) {
  const servico = dados.servicos.find((s) => s.id === id);
  servico[campo] = Math.max(0, Number(valor) || 0);
  salvarDados(dados);
  montarLista();
}

function removerServico(id) {
  const servico = dados.servicos.find((s) => s.id === id);
  if (!confirm(`Remover o serviço "${servico.nome}"?`)) return;
  dados.servicos = dados.servicos.filter((s) => s.id !== id);
  salvarDados(dados);
  montarLista();
}

function adicionarLinhaInsumo() {
  const opcoes = dados.insumos.map((i) => `<option value="${i.id}">${escapar(i.nome)}</option>`).join("");
  const linha = document.createElement("div");
  linha.className = "row g-2 align-items-center linha-insumo";
  linha.innerHTML = `
    <div class="col"><select class="form-select form-select-sm" aria-label="Material">${opcoes}</select></div>
    <div class="col-3"><input class="form-control form-control-sm" type="number" min="0.1" step="0.1" value="1" aria-label="Quantidade"></div>
    <div class="col-auto"><button type="button" class="btn btn-sm btn-link text-danger p-0" aria-label="Remover linha"><i class="bi bi-x-lg"></i></button></div>`;
  linha.querySelector("button").addEventListener("click", () => linha.remove());
  document.getElementById("linhas-insumos").appendChild(linha);
}

function iniciar() {
  document.getElementById("adicionar-linha").addEventListener("click", adicionarLinhaInsumo);

  document.getElementById("modal-servico").addEventListener("show.bs.modal", () => {
    document.getElementById("form-servico").reset();
    document.getElementById("linhas-insumos").innerHTML = "";
    adicionarLinhaInsumo();
  });

  document.getElementById("form-servico").addEventListener("submit", (e) => {
    e.preventDefault();
    const insumos = [...document.querySelectorAll(".linha-insumo")].map((linha) => ({
      insumoId: Number(linha.querySelector("select").value),
      quantidade: Number(linha.querySelector("input").value) || 0,
    })).filter((i) => i.quantidade > 0);

    dados.servicos.push({
      id: proximoId(dados.servicos),
      nome: document.getElementById("servico-nome").value.trim(),
      minutos: Number(document.getElementById("servico-minutos").value),
      outrosGastos: Number(document.getElementById("servico-outros").value) || 0,
      precoCobrado: Number(document.getElementById("servico-preco").value) || 0,
      insumos,
    });
    salvarDados(dados);
    montarLista();
    bootstrap.Modal.getInstance(document.getElementById("modal-servico")).hide();
  });

  montarLista();
}

iniciar();
