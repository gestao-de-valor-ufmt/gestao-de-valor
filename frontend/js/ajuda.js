// Página de ajuda: carrega o manual (manual/manual.md), converte de Markdown para HTML e monta o sumário.
// Para mudar o texto do manual, edite só o arquivo manual/manual.md.

// Transforma "Seu mês" em "seu-mes", para usar como âncora (#seu-mes) nos links do sumário.
function criarAncora(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function montarSumario(conteudo) {
  const itens = [...conteudo.querySelectorAll("h2")].map((titulo) => {
    titulo.id = criarAncora(titulo.textContent);
    return `<li><a class="link-secondary link-underline-opacity-0" href="#${titulo.id}">${escapar(titulo.textContent)}</a></li>`;
  });
  document.getElementById("sumario").innerHTML = itens.join("");
}

async function carregarManual() {
  const conteudo = document.getElementById("manual");
  try {
    const resposta = await fetch("manual/manual.md", { cache: "no-cache" });
    if (!resposta.ok) throw new Error(resposta.status);
    // breaks: cada quebra de linha do texto vira quebra de linha na página, como num editor comum.
    const html = marked.parse(await resposta.text(), { breaks: true });
    conteudo.innerHTML = DOMPurify.sanitize(html);
    montarSumario(conteudo);
    // Se a página foi aberta num link com âncora (ex.: ajuda.html#calculadora), rola até a seção.
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
  } catch {
    conteudo.innerHTML = `<p class="text-danger">Não foi possível carregar o manual. Verifique sua conexão e recarregue a página.</p>`;
  }
}

carregarManual();
