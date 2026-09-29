// Fórmulas de precificação (espelho de docs/formulas.md).
// No sistema final, estes cálculos serão feitos pela API em Python.

function custoPorUso(insumo) {
  return insumo.rendimento > 0 ? insumo.preco / insumo.rendimento : 0;
}

function totalCustosFixos(dados) {
  return dados.custosFixos.reduce((soma, c) => soma + c.valor, 0);
}

// Custos fixos + pró-labore: o que o negócio precisa cobrir todo mês.
function custoMensalTotal(dados) {
  return totalCustosFixos(dados) + dados.configuracao.proLabore;
}

function horasProdutivas(dados) {
  const { diasPorMes, horasPorDia, produtividade } = dados.configuracao;
  return diasPorMes * horasPorDia * (produtividade / 100);
}

function custoHora(dados) {
  const horas = horasProdutivas(dados);
  return horas > 0 ? custoMensalTotal(dados) / horas : 0;
}

function custoInsumosServico(servico, dados) {
  return servico.insumos.reduce((soma, item) => {
    const insumo = dados.insumos.find((i) => i.id === item.insumoId);
    return insumo ? soma + custoPorUso(insumo) * item.quantidade : soma;
  }, 0);
}

function custoMaoDeObra(servico, dados) {
  return custoHora(dados) * (servico.minutos / 60);
}

function custoServico(servico, dados) {
  return custoInsumosServico(servico, dados) + custoMaoDeObra(servico, dados);
}

// Markup divisor. Retorna null quando os percentuais somam 100% ou mais.
function precoSugerido(custo, margem, impostos, taxaCartao) {
  const divisor = 1 - (margem + impostos + taxaCartao) / 100;
  return divisor > 0 ? custo / divisor : null;
}

// Resultado completo de um serviço, com os percentuais informados (ou os da configuração).
function analisarServico(servico, dados, percentuais = dados.configuracao) {
  const { margem, impostos, taxaCartao } = percentuais;
  const insumos = custoInsumosServico(servico, dados);
  const maoDeObra = custoMaoDeObra(servico, dados);
  const custo = insumos + maoDeObra;
  const preco = precoSugerido(custo, margem, impostos, taxaCartao);
  const capacidade = Math.floor((horasProdutivas(dados) * 60) / servico.minutos);

  if (preco === null) {
    return { insumos, maoDeObra, custo, preco: null, capacidade };
  }

  const impostosETaxas = preco * ((impostos + taxaCartao) / 100);
  const custoVariavel = insumos + impostosETaxas;
  const margemContribuicao = preco - custoVariavel;
  const pontoEquilibrio = Math.ceil(custoMensalTotal(dados) / margemContribuicao);
  const lucro = preco * (margem / 100);

  return {
    insumos, maoDeObra, custo, preco, impostosETaxas, custoVariavel,
    margemContribuicao, pontoEquilibrio, capacidade, lucro,
  };
}
