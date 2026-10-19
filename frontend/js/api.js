// Conversa com a API: envia o token de login, trata erros e avisa quando o servidor está "acordando".

// No plano gratuito, a API dorme depois de 15 minutos sem uso e leva até 1 minuto para acordar.
const AVISO_DEMORA_MS = 4000;
let pedidosLentos = 0;

function mostrarAvisoDemora(mostrar) {
  let aviso = document.getElementById("aviso-demora");
  if (!aviso) {
    aviso = document.createElement("div");
    aviso.id = "aviso-demora";
    aviso.className = "aviso-demora shadow";
    aviso.setAttribute("role", "status");
    aviso.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
      Conectando ao servidor… no primeiro acesso do dia, isso pode levar até 1 minuto.`;
    document.body.appendChild(aviso);
  }
  aviso.hidden = !mostrar;
}

// Transforma a resposta de erro da API numa frase em português.
function mensagemDeErro(corpo, status) {
  const detalhe = corpo && corpo.detail;
  if (typeof detalhe === "string") return detalhe;
  if (Array.isArray(detalhe) && detalhe.length) {
    const campo = detalhe[0].loc ? detalhe[0].loc[detalhe[0].loc.length - 1] : "";
    return `Valor inválido${campo ? ` no campo "${campo}"` : ""}: ${detalhe[0].msg}`;
  }
  return `Erro ${status} ao falar com o servidor.`;
}

async function api(caminho, { metodo = "GET", corpo } = {}) {
  const token = await obterToken();
  const temporizador = setTimeout(() => {
    pedidosLentos++;
    mostrarAvisoDemora(true);
  }, AVISO_DEMORA_MS);

  let resposta;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.");
  } finally {
    clearTimeout(temporizador);
    if (pedidosLentos > 0) {
      pedidosLentos--;
      if (pedidosLentos === 0) mostrarAvisoDemora(false);
    }
  }

  if (resposta.status === 401) {
    await sair();
    return new Promise(() => {});
  }
  if (resposta.status === 204) return null;

  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new Error(mensagemDeErro(dados, resposta.status));
  return dados;
}

// Mostra um erro da API para o usuário sem quebrar a página.
function avisarErro(erro) {
  alert(erro.message || "Algo deu errado. Tente de novo.");
}

// Espera o usuário parar de digitar antes de salvar (evita um pedido por tecla).
function aoPararDeDigitar(funcao, espera = 600) {
  let temporizador;
  return (...argumentos) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => funcao(...argumentos), espera);
  };
}
