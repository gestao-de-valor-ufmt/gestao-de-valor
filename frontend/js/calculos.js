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

// Markup divisor. Retorna null quando os percentuais somam 100% ou mais.
function precoSugerido(custo, margem, impostos, taxaCartao) {
  const divisor = 1 - (margem + impostos + taxaCartao) / 100;
  return divisor > 0 ? custo / divisor : null;
}

// Maior desconto (%) que mantém o preço igual ou acima do preço mínimo.
function descontoMaximo(preco, precoMinimo) {
  return ((preco - precoMinimo) / preco) * 100;
}

// Margem de lucro (%) que sobra ao cobrar um preço qualquer (ex.: com desconto).
function margemEfetiva(custo, preco, impostos, taxaCartao) {
  return (1 - custo / preco) * 100 - impostos - taxaCartao;
}

// Resultado completo de um serviço, com a configuração atual.
function analisarServico(servico, dados) {
  const { margem, impostos, taxaCartao, incluirMaoDeObra, margemMinima } = dados.configuracao;
  const insumos = custoInsumosServico(servico, dados);
  const custosMiudos = servico.custosMiudos || 0;
  const maoDeObra = incluirMaoDeObra ? custoMaoDeObra(servico, dados) : 0;
  const custo = insumos + custosMiudos + maoDeObra;
  const preco = precoSugerido(custo, margem, impostos, taxaCartao);
  const capacidade = Math.floor((horasProdutivas(dados) * 60) / servico.minutos);

  if (preco === null) {
    return { insumos, custosMiudos, maoDeObra, custo, preco: null, capacidade };
  }

  const impostosETaxas = preco * ((impostos + taxaCartao) / 100);
  const custoVariavel = insumos + custosMiudos + impostosETaxas;
  const margemContribuicao = preco - custoVariavel;
  // Com margem zero ou negativa no modo simples, o preço nunca paga os custos fixos.
  const pontoEquilibrio = margemContribuicao > 0
    ? Math.ceil(custoMensalTotal(dados) / margemContribuicao)
    : null;
  const lucro = preco * (margem / 100);

  const precoMinimo = precoSugerido(custo, margemMinima, impostos, taxaCartao);
  const desconto = precoMinimo === null ? null : descontoMaximo(preco, precoMinimo);

  return {
    insumos, custosMiudos, maoDeObra, custo, preco, impostosETaxas, custoVariavel,
    margemContribuicao, pontoEquilibrio, capacidade, lucro, precoMinimo, desconto,
  };
}
