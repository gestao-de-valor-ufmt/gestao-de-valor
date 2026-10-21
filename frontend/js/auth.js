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
  await verificarConvite(usuario);
  await verificarAceite(usuario);
  return usuario;
}

// ---------- Convite ----------
// A liberação fica gravada no próprio login (marca "convite" no token), então conferir não chama a API.

async function temConvite(usuario, renovar = false) {
  const token = await usuario.getIdTokenResult(renovar);
  return token.claims.convite === true;
}

// Resgata o código na API e renova o login para a marca de convite passar a valer.
async function usarConvite(codigo) {
  await api("/conta/convite", { metodo: "POST", corpo: { codigo } });
  await autenticacao.currentUser.getIdToken(true);
}

async function verificarConvite(usuario) {
  if (await temConvite(usuario)) return;
  // Pode ter sido liberada há pouco (por código ou pela equipe): renova o login antes de pedir o código.
  if (await temConvite(usuario, true)) return;
  await pedirConvite();
}

// Janela que só fecha quando a pessoa informa um código válido (ou sai do sistema).
function pedirConvite() {
  return new Promise((resolver) => {
    const modal = document.createElement("div");
    modal.className = "modal fade";
    modal.tabIndex = -1;
    modal.setAttribute("aria-labelledby", "titulo-convite");
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <form class="modal-content">
          <div class="modal-header"><h2 class="modal-title h5" id="titulo-convite">Código de convite</h2></div>
          <div class="modal-body">
            <p>Por enquanto, o Gestão de Valor é só para convidados. Digite o código que você recebeu.</p>
            <label class="form-label" for="codigo-convite">Código</label>
            <input class="form-control text-uppercase" id="codigo-convite" placeholder="GV-XXXX-XXXX" autocomplete="off" required>
            <div class="text-danger small mt-2" data-erro hidden></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-acao="sair">Sair</button>
            <button class="btn btn-primary" data-acao="usar">Usar código</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal);
    const janela = new bootstrap.Modal(modal, { backdrop: "static", keyboard: false });
    const erro = modal.querySelector("[data-erro]");
    const botao = modal.querySelector("[data-acao=usar]");
    modal.querySelector("[data-acao=sair]").addEventListener("click", sair);
    modal.querySelector("form").addEventListener("submit", async (evento) => {
      evento.preventDefault();
      botao.disabled = true;
      erro.hidden = true;
      try {
        await usarConvite(modal.querySelector("#codigo-convite").value.trim());
        janela.hide();
        resolver();
      } catch (falha) {
        erro.textContent = falha.message;
        erro.hidden = false;
        botao.disabled = false;
      }
    });
    janela.show();
  });
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
