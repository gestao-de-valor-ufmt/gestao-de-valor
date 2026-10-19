// Tela de login: Google, e-mail e senha, criação de conta e recuperação de senha.

let criandoConta = false;

// Mensagens do Firebase traduzidas para português simples.
const ERROS = {
  "auth/invalid-email": "Esse e-mail não parece válido.",
  "auth/missing-password": "Digite a sua senha.",
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/email-already-in-use": "Já existe uma conta com esse e-mail. Use \"Entrar\".",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/too-many-requests": "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.",
  "auth/popup-closed-by-user": "A janela do Google foi fechada antes de terminar.",
  "auth/popup-blocked": "O navegador bloqueou a janela do Google. Libere pop-ups para este site.",
  "auth/network-request-failed": "Sem conexão com a internet.",
};

function mostrar(id, texto) {
  const caixa = document.getElementById(id);
  caixa.textContent = texto || "";
  caixa.hidden = !texto;
}

function mostrarErro(erro) {
  mostrar("sucesso", "");
  mostrar("erro", ERROS[erro.code] || "Não foi possível entrar. Tente de novo.");
}

// Registra o aceite da Política de Privacidade (LGPD) e segue para o sistema.
// Se a API falhar agora, o aceite é pedido de novo dentro do sistema (veja auth.js).
async function concluirLogin() {
  try {
    await api("/conta/privacidade", { metodo: "POST", corpo: { versao: VERSAO_PRIVACIDADE } });
    marcarAceiteNestaSessao();
  } catch {
    // segue mesmo assim
  }
  irParaDestino();
}

// Depois do login, volta para a página que a pessoa queria abrir (só páginas do próprio site).
function irParaDestino() {
  const voltar = new URLSearchParams(location.search).get("voltar") || "";
  location.replace(/^[a-z]+\.html([?#].*)?$/.test(voltar) ? voltar : "index.html");
}

function alternarModo() {
  criandoConta = !criandoConta;
  mostrar("erro", "");
  mostrar("sucesso", "");
  document.getElementById("titulo-formulario").textContent = criandoConta ? "Criar conta" : "Entrar";
  document.getElementById("botao-enviar").textContent = criandoConta ? "Criar conta" : "Entrar";
  document.getElementById("pergunta-troca").textContent = criandoConta ? "Já tem conta?" : "Ainda não tem conta?";
  document.getElementById("trocar-modo").textContent = criandoConta ? "Entrar" : "Criar conta grátis";
  document.getElementById("area-esqueci").hidden = criandoConta;
  document.getElementById("area-aceite").hidden = !criandoConta;
  document.getElementById("ajuda-senha").hidden = !criandoConta;
  document.getElementById("senha").autocomplete = criandoConta ? "new-password" : "current-password";
}

async function enviar(evento) {
  evento.preventDefault();
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;
  if (criandoConta && !document.getElementById("aceite").checked) {
    mostrar("sucesso", "");
    mostrar("erro", "Para criar a conta, marque que você concorda com a Política de Privacidade.");
    return;
  }
  const botao = document.getElementById("botao-enviar");
  botao.disabled = true;
  botao.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Entrando…`;
  try {
    if (criandoConta) {
      await autenticacao.createUserWithEmailAndPassword(email, senha);
    } else {
      await autenticacao.signInWithEmailAndPassword(email, senha);
    }
    await concluirLogin();
  } catch (erro) {
    mostrarErro(erro);
    botao.disabled = false;
    botao.textContent = criandoConta ? "Criar conta" : "Entrar";
  }
}

async function entrarComGoogle() {
  try {
    await autenticacao.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    await concluirLogin();
  } catch (erro) {
    mostrarErro(erro);
  }
}

async function esqueciSenha() {
  const email = document.getElementById("email").value.trim();
  if (!email) {
    mostrar("erro", "Digite o seu e-mail no campo acima e clique de novo em \"Esqueci minha senha\".");
    return;
  }
  try {
    await autenticacao.sendPasswordResetEmail(email);
    mostrar("erro", "");
    mostrar("sucesso", "Se houver uma conta com esse e-mail, enviamos um link para criar uma senha nova. Confira também o spam.");
  } catch (erro) {
    mostrarErro(erro);
  }
}

async function iniciar() {
  if (new URLSearchParams(location.search).get("conta") === "excluida") {
    document.getElementById("aviso-conta-excluida").hidden = false;
  }
  // Quem já está logado vai direto para o sistema.
  if (await usuarioAtual()) {
    irParaDestino();
    return;
  }
  document.getElementById("formulario").addEventListener("submit", enviar);
  document.getElementById("entrar-google").addEventListener("click", entrarComGoogle);
  document.getElementById("trocar-modo").addEventListener("click", alternarModo);
  document.getElementById("esqueci").addEventListener("click", esqueciSenha);
}

iniciar();
