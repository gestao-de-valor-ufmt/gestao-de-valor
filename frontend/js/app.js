// Verifica se a API está respondendo e mostra o resultado na página inicial.
async function verificarApi() {
  const status = document.getElementById("status-api");
  if (!status) return;
  try {
    const resposta = await fetch(`${API_URL}/health`);
    status.textContent = resposta.ok ? "API online ✔" : "API com problema";
  } catch {
    status.textContent = "API offline";
  }
}

verificarApi();
