// Login com o Firebase Authentication.
// O Firebase guarda a sessão no navegador e renova o token sozinho.

firebase.initializeApp(FIREBASE_CONFIG);
const autenticacao = firebase.auth();
autenticacao.languageCode = "pt";

// Espera o Firebase dizer se há alguém logado (ele confere a sessão salva ao abrir a página).
function usuarioAtual() {
  return new Promise((resolver) => {
    const parar = autenticacao.onAuthStateChanged((usuario) => {
      parar();
      resolver(usuario);
    });
  });
}

// Para páginas que exigem login: sem usuário, manda para a tela de login e volta depois.
// Com usuário, confere se ele já aceitou a versão atual da Política de Privacidade.
async function exigirLogin() {
  const usuario = await usuarioAtual();
  if (!usuario) {
    const voltar = encodeURIComponent(location.pathname.split("/").pop() + location.search + location.hash);
    location.replace(`login.html?voltar=${voltar}`);
    return new Promise(() => {}); // a página para aqui enquanto o navegador troca de endereço
  }
  await verificarAceite(usuario);
  return usuario;
}

// ---------- Aceite da Política de Privacidade (LGPD) ----------

function chaveAceite(uid) {
  return `gestao-de-valor:aceite:${uid}:${VERSAO_PRIVACIDADE}`;
}

// Evita perguntar à API em toda página: depois de conferido, vale até fechar o navegador.
function marcarAceiteNestaSessao() {
  try {
    sessionStorage.setItem(chaveAceite(autenticacao.currentUser.uid), "1");
  } catch {}
}

function aceiteJaConferido(uid) {
  try {
    return sessionStorage.getItem(chaveAceite(uid)) === "1";
  } catch {
    return false;
  }
}

async function verificarAceite(usuario) {
  if (aceiteJaConferido(usuario.uid)) return;
  const conta = await api("/conta");
  if (!conta.privacidade || conta.privacidade.versao !== VERSAO_PRIVACIDADE) {
    await pedirAceite();
    await api("/conta/privacidade", { metodo: "POST", corpo: { versao: VERSAO_PRIVACIDADE } });
  }
  marcarAceiteNestaSessao();
}

// Janela que só fecha quando a pessoa aceita a política (ou sai do sistema).
function pedirAceite() {
  return new Promise((resolver) => {
    const modal = document.createElement("div");
    modal.className = "modal fade";
    modal.tabIndex = -1;
    modal.setAttribute("aria-labelledby", "titulo-aceite");
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header"><h2 class="modal-title h5" id="titulo-aceite">Política de Privacidade</h2></div>
          <div class="modal-body">
            <p>Para continuar, leia e aceite a nossa
              <a href="privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a>.</p>
            <p class="small text-secondary mb-0">Resumo: guardamos só o necessário para calcular os seus preços.
              Ninguém mais vê os seus dados pelo sistema, e você pode baixar ou apagar tudo quando quiser.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-acao="sair">Sair</button>
            <button type="button" class="btn btn-primary" data-acao="aceitar">Li e aceito</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const janela = new bootstrap.Modal(modal, { backdrop: "static", keyboard: false });
    modal.querySelector("[data-acao=sair]").addEventListener("click", sair);
    modal.querySelector("[data-acao=aceitar]").addEventListener("click", () => {
      janela.hide();
      resolver();
    });
    janela.show();
  });
}

async function obterToken() {
  const usuario = autenticacao.currentUser || (await usuarioAtual());
  return usuario ? usuario.getIdToken() : null;
}

async function sair() {
  await autenticacao.signOut();
  location.href = "login.html";
}
