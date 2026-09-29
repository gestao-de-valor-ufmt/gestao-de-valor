// Partes comuns a todas as páginas: menu, rodapé e funções de formatação.

const PAGINAS = [
  { arquivo: "index.html", titulo: "Painel", icone: "bi-speedometer2" },
  { arquivo: "custos.html", titulo: "Custos fixos", icone: "bi-house-gear" },
  { arquivo: "insumos.html", titulo: "Insumos", icone: "bi-box-seam" },
  { arquivo: "servicos.html", titulo: "Serviços", icone: "bi-card-checklist" },
  { arquivo: "calculadora.html", titulo: "Calculadora", icone: "bi-calculator" },
];

function montarLayout() {
  const atual = location.pathname.split("/").pop() || "index.html";

  const links = PAGINAS.map((p) => `
    <li class="nav-item">
      <a class="nav-link ${p.arquivo === atual ? "active" : ""}" href="${p.arquivo}">
        <i class="bi ${p.icone} me-1"></i>${p.titulo}
      </a>
    </li>`).join("");

  document.getElementById("topo").innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primario">
      <div class="container">
        <a class="navbar-brand fw-semibold" href="index.html"><i class="bi bi-gem me-2"></i>Gestão de Valor</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menu"
                aria-controls="menu" aria-expanded="false" aria-label="Abrir menu">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="menu">
          <ul class="navbar-nav ms-auto">${links}</ul>
        </div>
      </div>
    </nav>
    <div class="aviso-prototipo text-center small py-1">
      <i class="bi bi-info-circle me-1"></i>Protótipo com dados de exemplo — as alterações ficam salvas só neste navegador.
    </div>`;

  document.getElementById("rodape").innerHTML = `
    <footer class="container py-4 small text-secondary d-flex flex-wrap justify-content-between gap-2">
      <span>Gestão de Valor · Seminário Integrador V · BC&T/UFMT · GPL-3.0</span>
      <button class="btn btn-link btn-sm p-0 text-secondary" onclick="if (confirm('Apagar suas alterações e voltar aos dados de exemplo?')) restaurarExemplo()">
        <i class="bi bi-arrow-counterclockwise me-1"></i>Restaurar dados de exemplo
      </button>
    </footer>`;
}

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function moeda(valor) {
  return valor === null || valor === undefined || Number.isNaN(valor) ? "—" : formatadorMoeda.format(valor);
}

function numero(valor, casas = 0) {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

// Evita que texto digitado pelo usuário seja interpretado como HTML.
function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

montarLayout();
