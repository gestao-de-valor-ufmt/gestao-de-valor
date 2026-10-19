// Página "Seu mês": salário, contas fixas, tempo de atendimento e taxa da maquininha.
// Tudo é salvo na API; a meta e o valor da hora vêm do resumo calculado no servidor.

const CAMPOS_CONFIG = ["salario", "reserva", "dias_por_mes", "horas_por_dia", "taxa_cartao"];
const ID_DO_CAMPO = {
  salario: "salario", reserva: "reserva", dias_por_mes: "diasPorMes", horas_por_dia: "horasPorDia", taxa_cartao: "taxaCartao",
};

let configuracao = null;
let contas = [];

function montarTabela() {
  document.getElementById("tabela-custos").innerHTML = contas.map((c) => `
    <tr>
      <td>${escapar(c.nome)}</td>
      <td class="text-end">${moeda(c.valor)}</td>
      <td class="text-end" style="width: 2rem">
        <button class="btn btn-sm btn-link text-danger p-0" onclick="removerConta(${c.id})" aria-label="Remover ${escapar(c.nome)}">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`).join("") || `<tr><td colspan="3" class="text-secondary">Nenhuma conta cadastrada.</td></tr>`;
  document.getElementById("total-custos").textContent = moeda(contas.reduce((soma, c) => soma + c.valor, 0));
}

async function montarResumo() {
  try {
    const resumo = await api("/calculadora/resumo");
    document.getElementById("res-salario").textContent = moeda(configuracao.salario);
    document.getElementById("res-contas").textContent = moeda(resumo.total_contas);
    document.getElementById("res-reserva").textContent = moeda(configuracao.reserva);
    document.getElementById("res-meta").textContent = moeda(resumo.meta);
    document.getElementById("res-hora").innerHTML =
      `Você atende <strong>${numero(resumo.horas_de_atendimento)} horas</strong> por mês. Para bater a meta, cada hora
       atendendo precisa render <strong>${moeda(resumo.valor_da_hora)}</strong>, além do material.`;
  } catch (erro) {
    document.getElementById("res-hora").textContent = erro.message;
  }
}

function avisarSalvo() {
  const aviso = document.getElementById("salvo");
  aviso.hidden = false;
  clearTimeout(avisarSalvo.temporizador);
  avisarSalvo.temporizador = setTimeout(() => (aviso.hidden = true), 2000);
}

const salvarConfiguracao = aoPararDeDigitar(async () => {
  try {
    configuracao = await api("/configuracao", { metodo: "PUT", corpo: configuracao });
    avisarSalvo();
    await montarResumo();
  } catch (erro) {
    avisarErro(erro);
  }
});

async function removerConta(id) {
  try {
    await api(`/contas/${id}`, { metodo: "DELETE" });
    contas = contas.filter((c) => c.id !== id);
    montarTabela();
    await montarResumo();
  } catch (erro) {
    avisarErro(erro);
  }
}

async function adicionarConta(nome, valor) {
  const conta = await api("/contas", { metodo: "POST", corpo: { nome, valor } });
  contas.push(conta);
  montarTabela();
  await montarResumo();
}

async function acaoDaConta(caminho, metodo, confirmacao) {
  if (!confirm(confirmacao)) return;
  try {
    await api(caminho, { metodo });
    location.reload();
  } catch (erro) {
    avisarErro(erro);
  }
}

function iniciarFormularios() {
  document.getElementById("form-custo").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await adicionarConta(
        document.getElementById("custo-nome").value.trim(),
        Number(document.getElementById("custo-valor").value),
      );
      e.target.reset();
      bootstrap.Modal.getInstance(document.getElementById("modal-custo")).hide();
    } catch (erro) {
      avisarErro(erro);
    }
  });

  // Equipamentos: quanto guardar por mês para trocar quando estragar (valor ÷ meses de uso).
  const depValor = document.getElementById("dep-valor");
  const depMeses = document.getElementById("dep-meses");
  const porMes = () => (Number(depMeses.value) > 0 ? Number(depValor.value) / Number(depMeses.value) : null);
  for (const input of [depValor, depMeses]) {
    input.addEventListener("input", () => (document.getElementById("dep-resultado").textContent = moeda(porMes())));
  }
  document.getElementById("form-depreciacao").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const nome = document.getElementById("dep-nome").value.trim();
      await adicionarConta(`Reposição: ${nome}`, Math.round(porMes() * 100) / 100);
      e.target.reset();
      document.getElementById("dep-resultado").textContent = "—";
      bootstrap.Modal.getInstance(document.getElementById("modal-depreciacao")).hide();
    } catch (erro) {
      avisarErro(erro);
    }
  });

  document.getElementById("carregar-exemplo").addEventListener("click", () => acaoDaConta(
    "/conta/exemplo", "POST", "Seus dados atuais serão apagados e trocados pelo exemplo da manicure. Continuar?"));
  document.getElementById("apagar-dados").addEventListener("click", () => acaoDaConta(
    "/conta/dados", "DELETE", "Apagar todas as suas contas, materiais e serviços e começar do zero? Isso não pode ser desfeito."));

  document.getElementById("baixar-dados").addEventListener("click", baixarMeusDados);

  const confirmar = document.getElementById("confirmar-exclusao");
  confirmar.addEventListener("input", () => {
    document.getElementById("botao-excluir").disabled = confirmar.value.trim().toUpperCase() !== "EXCLUIR";
  });
  document.getElementById("modal-excluir").addEventListener("show.bs.modal", () => {
    confirmar.value = "";
    document.getElementById("botao-excluir").disabled = true;
  });
  document.getElementById("form-excluir").addEventListener("submit", excluirConta);
}

// Direito de acesso (LGPD): junta tudo o que está guardado num arquivo para a pessoa baixar.
async function baixarMeusDados() {
  const botao = document.getElementById("baixar-dados");
  botao.disabled = true;
  try {
    const [conta, configuracaoAtual, contasAtuais, materiais, servicos] = await Promise.all([
      api("/conta"), api("/configuracao"), api("/contas"), api("/materiais"), api("/servicos"),
    ]);
    const usuario = autenticacao.currentUser;
    const dados = {
      exportado_em: new Date().toISOString(),
      conta: { uid: conta.uid, email: usuario.email, nome: usuario.displayName, privacidade: conta.privacidade },
      configuracao: configuracaoAtual,
      contas_fixas: contasAtuais,
      materiais,
      servicos,
    };
    const arquivo = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(arquivo);
    link.download = "meus-dados-gestao-de-valor.json";
    link.click();
    URL.revokeObjectURL(link.href);
  } catch (erro) {
    avisarErro(erro);
  } finally {
    botao.disabled = false;
  }
}

// Direito de eliminação (LGPD): apaga os dados e o login, e volta para a tela de entrada.
async function excluirConta(evento) {
  evento.preventDefault();
  const botao = document.getElementById("botao-excluir");
  botao.disabled = true;
  botao.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Excluindo…`;
  try {
    await api("/conta", { metodo: "DELETE" });
    await autenticacao.signOut();
    location.replace("login.html?conta=excluida");
  } catch (erro) {
    avisarErro(erro);
    botao.disabled = false;
    botao.textContent = "Excluir minha conta";
  }
}

async function iniciar() {
  await exigirLogin();
  iniciarFormularios();
  document.getElementById("tabela-custos").innerHTML =
    `<tr><td colspan="3" class="text-secondary"><span class="spinner-border spinner-border-sm me-2"></span>Carregando…</td></tr>`;

  try {
    [configuracao, contas] = await Promise.all([api("/configuracao"), api("/contas")]);
  } catch (erro) {
    avisarErro(erro);
    return;
  }

  for (const campo of CAMPOS_CONFIG) {
    const input = document.getElementById(ID_DO_CAMPO[campo]);
    input.value = configuracao[campo];
    input.addEventListener("input", () => {
      const valor = Number(input.value) || 0;
      // Dias e horas precisam ser maiores que zero: até lá, só marca o campo e não salva.
      const invalido = (campo === "dias_por_mes" || campo === "horas_por_dia") && valor <= 0;
      input.classList.toggle("is-invalid", invalido);
      if (invalido) return;
      configuracao[campo] = Math.max(0, valor);
      salvarConfiguracao();
    });
  }
  montarTabela();
  await montarResumo();
}

iniciar();
