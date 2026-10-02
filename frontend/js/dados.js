// Dados de exemplo (mock) e armazenamento no navegador.
// Enquanto o backend não existe, tudo fica salvo no localStorage de quem está navegando.

// A versão na chave faz o navegador ignorar dados salvos em formatos antigos do protótipo.
const CHAVE_ARMAZENAMENTO = "gestao-de-valor:dados:v2";

const DADOS_EXEMPLO = {
  negocio: "Manicure a domicílio (exemplo)",
  configuracao: {
    salario: 2500, // quanto quer ganhar por mês
    reserva: 0, // dinheiro extra para emergências e investimentos
    diasPorMes: 22,
    horasPorDia: 6, // horas atendendo clientes, contando o deslocamento
    taxaCartao: 0, // % da maquininha; 0 para quem recebe em dinheiro ou Pix
  },
  custosFixos: [
    { id: 1, nome: "Celular e internet", valor: 80 },
    { id: 2, nome: "DAS MEI", valor: 75.9 },
    { id: 3, nome: "Reposição de alicates e equipamentos", valor: 30 },
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
      id: 1, nome: "Manicure", minutos: 60, outrosGastos: 2, precoCobrado: 40,
      insumos: [
        { insumoId: 1, quantidade: 1 }, { insumoId: 2, quantidade: 1 }, { insumoId: 3, quantidade: 1 },
        { insumoId: 4, quantidade: 1 }, { insumoId: 5, quantidade: 2 }, { insumoId: 6, quantidade: 1 },
        { insumoId: 7, quantidade: 1 }, { insumoId: 8, quantidade: 1 }, { insumoId: 9, quantidade: 1 },
      ],
    },
    {
      id: 2, nome: "Pedicure", minutos: 70, outrosGastos: 2, precoCobrado: 45,
      insumos: [
        { insumoId: 1, quantidade: 1 }, { insumoId: 2, quantidade: 1 }, { insumoId: 3, quantidade: 1 },
        { insumoId: 4, quantidade: 1 }, { insumoId: 5, quantidade: 2 }, { insumoId: 6, quantidade: 1 },
        { insumoId: 7, quantidade: 1 }, { insumoId: 8, quantidade: 1 }, { insumoId: 9, quantidade: 1 },
        { insumoId: 10, quantidade: 1 },
      ],
    },
    {
      id: 3, nome: "Pé e mão", minutos: 110, outrosGastos: 2, precoCobrado: 75,
      insumos: [
        { insumoId: 1, quantidade: 2 }, { insumoId: 2, quantidade: 2 }, { insumoId: 3, quantidade: 2 },
        { insumoId: 4, quantidade: 2 }, { insumoId: 5, quantidade: 4 }, { insumoId: 6, quantidade: 2 },
        { insumoId: 7, quantidade: 2 }, { insumoId: 8, quantidade: 1 }, { insumoId: 9, quantidade: 2 },
        { insumoId: 10, quantidade: 1 },
      ],
    },
    {
      id: 4, nome: "Esmaltação em gel", minutos: 80, outrosGastos: 2, precoCobrado: 70,
      insumos: [
        { insumoId: 2, quantidade: 1 }, { insumoId: 11, quantidade: 1 }, { insumoId: 3, quantidade: 1 },
        { insumoId: 6, quantidade: 1 }, { insumoId: 8, quantidade: 1 }, { insumoId: 5, quantidade: 1 },
      ],
    },
    {
      id: 5, nome: "Alongamento em gel", minutos: 170, outrosGastos: 2, precoCobrado: 150,
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
    if (salvo) return JSON.parse(salvo);
  } catch {
    // Navegador sem acesso ao localStorage: segue com os dados de exemplo.
  }
  return structuredClone(DADOS_EXEMPLO);
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
