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
async function exigirLogin() {
  const usuario = await usuarioAtual();
  if (!usuario) {
    const voltar = encodeURIComponent(location.pathname.split("/").pop() + location.search + location.hash);
    location.replace(`login.html?voltar=${voltar}`);
    return new Promise(() => {}); // a página para aqui enquanto o navegador troca de endereço
  }
  return usuario;
}

async function obterToken() {
  const usuario = autenticacao.currentUser || (await usuarioAtual());
  return usuario ? usuario.getIdToken() : null;
}

async function sair() {
  await autenticacao.signOut();
  location.href = "login.html";
}
