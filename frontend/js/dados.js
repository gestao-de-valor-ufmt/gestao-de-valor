// Dados de exemplo (mock) e armazenamento no navegador.
// Enquanto o backend não existe, tudo fica salvo no localStorage de quem está navegando.

const CHAVE_ARMAZENAMENTO = "gestao-de-valor:dados";

const DADOS_EXEMPLO = {
  negocio: "Studio Bela Mão (exemplo)",
  configuracao: {
    proLabore: 3000,
    diasPorMes: 22,
    horasPorDia: 6,
    produtividade: 75, // % do tempo realmente vendável
    margem: 20,
    impostos: 0, // MEI paga DAS fixo, que já está nos custos fixos
    taxaCartao: 4,
    incluirMaoDeObra: true, // false = modo simples: insumos + custos miúdos + margem
    margemMinima: 0, // menor margem aceita ao dar desconto (pode ser negativa)
  },
  custosFixos: [
    { id: 1, nome: "Aluguel do espaço", categoria: "Estrutura", valor: 900 },
    { id: 2, nome: "Energia elétrica", categoria: "Contas", valor: 180 },
    { id: 3, nome: "Internet", categoria: "Contas", valor: 100 },
    { id: 4, nome: "Água", categoria: "Contas", valor: 60 },
    { id: 5, nome: "Celular", categoria: "Contas", valor: 60 },
    { id: 6, nome: "DAS MEI", categoria: "Impostos", valor: 75.9 },
    { id: 7, nome: "Material de limpeza", categoria: "Estrutura", valor: 90 },
    { id: 8, nome: "Depreciação de equipamentos", categoria: "Depreciação", valor: 150 },
    { id: 9, nome: "Divulgação (Instagram)", categoria: "Marketing", valor: 100 },
  ],
  insumos: [
    { id: 1, nome: "Esmalte", embalagem: "Frasco 8 ml", preco: 12, rendimento: 20 },
    { id: 2, nome: "Base fortalecedora", embalagem: "Frasco 8 ml", preco: 18, rendimento: 30 },
    { id: 3, nome: "Extra brilho", embalagem: "Frasco 8 ml", preco: 15, rendimento: 30 },
    { id: 4, nome: "Acetona", embalagem: "Frasco 500 ml", preco: 14, rendimento: 50 },
    { id: 5, nome: "Algodão", embalagem: "Pacote 500 g", preco: 16, rendimento: 200 },
    { id: 6, nome: "Lixa descartável", embalagem: "Pacote 50 un", preco: 25, rendimento: 50 },
    { id: 7, nome: "Palito de laranjeira", embalagem: "Pacote 100 un", preco: 8, rendimento: 100 },
    { id: 8, nome: "Luvas descartáveis", embalagem: "Caixa 100 un", preco: 35, rendimento: 50 },
    { id: 9, nome: "Removedor de cutícula", embalagem: "Frasco 100 ml", preco: 12, rendimento: 40 },
    { id: 10, nome: "Creme hidratante", embalagem: "Pote 1 kg", preco: 30, rendimento: 100 },
    { id: 11, nome: "Gel UV", embalagem: "Pote 15 g", preco: 45, rendimento: 25 },
    { id: 12, nome: "Tips", embalagem: "Caixa 500 un", preco: 40, rendimento: 50 },
  ],
  servicos: [
    {
      id: 1, nome: "Manicure", minutos: 40, custosMiudos: 1.5,
      insumos: [
        { insumoId: 1, quantidade: 1 }, { insumoId: 2, quantidade: 1 }, { insumoId: 3, quantidade: 1 },
        { insumoId: 4, quantidade: 1 }, { insumoId: 5, quantidade: 2 }, { insumoId: 6, quantidade: 1 },
        { insumoId: 7, quantidade: 1 }, { insumoId: 8, quantidade: 1 }, { insumoId: 9, quantidade: 1 },
      ],
    },
    {
      id: 2, nome: "Pedicure", minutos: 50, custosMiudos: 2,
      insumos: [
        { insumoId: 1, quantidade: 1 }, { insumoId: 2, quantidade: 1 }, { insumoId: 3, quantidade: 1 },
        { insumoId: 4, quantidade: 1 }, { insumoId: 5, quantidade: 2 }, { insumoId: 6, quantidade: 1 },
        { insumoId: 7, quantidade: 1 }, { insumoId: 8, quantidade: 1 }, { insumoId: 9, quantidade: 1 },
        { insumoId: 10, quantidade: 1 },
      ],
    },
    {
      id: 3, nome: "Pé e mão", minutos: 90, custosMiudos: 3,
      insumos: [
        { insumoId: 1, quantidade: 2 }, { insumoId: 2, quantidade: 2 }, { insumoId: 3, quantidade: 2 },
        { insumoId: 4, quantidade: 2 }, { insumoId: 5, quantidade: 4 }, { insumoId: 6, quantidade: 2 },
        { insumoId: 7, quantidade: 2 }, { insumoId: 8, quantidade: 1 }, { insumoId: 9, quantidade: 2 },
        { insumoId: 10, quantidade: 1 },
      ],
    },
    {
      id: 4, nome: "Esmaltação em gel", minutos: 60, custosMiudos: 2.5,
      insumos: [
        { insumoId: 2, quantidade: 1 }, { insumoId: 11, quantidade: 1 }, { insumoId: 3, quantidade: 1 },
        { insumoId: 6, quantidade: 1 }, { insumoId: 8, quantidade: 1 }, { insumoId: 5, quantidade: 1 },
      ],
    },
    {
      id: 5, nome: "Alongamento em gel", minutos: 150, custosMiudos: 4,
      insumos: [
        { insumoId: 12, quantidade: 1 }, { insumoId: 11, quantidade: 2 }, { insumoId: 2, quantidade: 1 },
        { insumoId: 3, quantidade: 1 }, { insumoId: 6, quantidade: 2 }, { insumoId: 8, quantidade: 1 },
        { insumoId: 5, quantidade: 1 },
      ],
    },
  ],
};

function carregarDados() {
  try {
    const salvo = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (salvo) return completarCampos(JSON.parse(salvo));
  } catch {
    // Navegador sem acesso ao localStorage: segue com os dados de exemplo.
  }
  return structuredClone(DADOS_EXEMPLO);
}

// Dados salvos por versões antigas do protótipo não têm os campos novos.
function completarCampos(dados) {
  dados.configuracao = { ...DADOS_EXEMPLO.configuracao, ...dados.configuracao };
  for (const servico of dados.servicos) servico.custosMiudos ??= 0;
  return dados;
}

function salvarDados(dados) {
  try {
    localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(dados));
  } catch {
    // Sem armazenamento: as alterações valem só até recarregar a página.
  }
}

function restaurarExemplo() {
  try {
    localStorage.removeItem(CHAVE_ARMAZENAMENTO);
  } catch {}
  location.reload();
}

function proximoId(lista) {
  return lista.reduce((maior, item) => Math.max(maior, item.id), 0) + 1;
}
