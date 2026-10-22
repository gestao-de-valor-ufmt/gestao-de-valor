// Partes comuns a todas as páginas: menu, rodapé e funções de formatação.

const PAGINAS = [
  { arquivo: "index.html", titulo: "Painel", icone: "bi-speedometer2" },
  { arquivo: "custos.html", titulo: "Seu mês", icone: "bi-wallet2" },
  { arquivo: "insumos.html", titulo: "Materiais", icone: "bi-box-seam" },
  { arquivo: "servicos.html", titulo: "Serviços", icone: "bi-card-checklist" },
  { arquivo: "calculadora.html", titulo: "Calculadora", icone: "bi-calculator" },
  { arquivo: "ajuda.html", titulo: "Ajuda", icone: "bi-question-circle" },
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
          <div class="ms-lg-3" id="area-usuario"></div>
        </div>
      </div>
    </nav>`;

  document.getElementById("rodape").innerHTML = `
    <footer class="container py-4 small text-secondary d-flex flex-wrap justify-content-between gap-2">
      <span>Gestão de Valor · Seminário Integrador V · BC&T/UFMT · GPL-3.0</span>
      <a class="link-secondary" href="privacidade.html">Política de Privacidade</a>
    </footer>`;

  // Quem está logado aparece no menu, com o botão de sair.
  if (typeof usuarioAtual === "function") {
    usuarioAtual().then((usuario) => {
      const area = document.getElementById("area-usuario");
      area.innerHTML = usuario
        ? `<div class="dropdown">
             <button class="btn btn-sm btn-outline-light dropdown-toggle mt-2 mt-lg-0" data-bs-toggle="dropdown" aria-expanded="false">
               <i class="bi bi-person-circle me-1"></i><span class="d-lg-none d-xl-inline">${escapar(usuario.displayName || usuario.email || "Minha conta")}</span>
             </button>
             <ul class="dropdown-menu dropdown-menu-end">
               <li><span class="dropdown-item-text small text-secondary">${escapar(usuario.email || "")}</span></li>
               <li><hr class="dropdown-divider"></li>
               <li><button class="dropdown-item" onclick="sair()"><i class="bi bi-box-arrow-right me-2"></i>Sair</button></li>
             </ul>
           </div>`
        : `<a class="btn btn-sm btn-light mt-2 mt-lg-0" href="login.html"><i class="bi bi-box-arrow-in-right me-1"></i>Entrar</a>`;
    });
  }
}

// Mostra "carregando" no lugar do conteúdo enquanto os dados chegam da API.
function carregando(elemento, texto = "Carregando…") {
  elemento.innerHTML = `<div class="text-secondary py-4 text-center">
    <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>${texto}</div>`;
}

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function moeda(valor) {
  return valor === null || valor === undefined || Number.isNaN(valor) ? "—" : formatadorMoeda.format(valor);
}

function numero(valor, casas = 0) {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

// Mostra um tempo em minutos do jeito que se fala: "40 min", "4h", "1h30".
function formatarTempo(minutos) {
  const total = Math.round(minutos);
  if (total < 60) return `${total} min`;
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return resto ? `${horas}h${String(resto).padStart(2, "0")}` : `${horas}h`;
}

// Campos de tempo em par (horas + minutos). Quem só usa minutos pode deixar as horas vazias.
function lerTempo(idHoras, idMinutos) {
  const horas = Math.max(0, Number(document.getElementById(idHoras).value) || 0);
  const minutos = Math.max(0, Number(document.getElementById(idMinutos).value) || 0);
  return horas * 60 + minutos;
}

function preencherTempo(idHoras, idMinutos, minutos) {
  const total = Math.round(minutos || 0);
  document.getElementById(idHoras).value = Math.floor(total / 60);
  document.getElementById(idMinutos).value = total % 60;
}

// Evita que texto digitado pelo usuário seja interpretado como HTML.
function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

montarLayout();
