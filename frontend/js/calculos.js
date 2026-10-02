// Fórmulas de precificação (espelho de backend/app/core/precificacao.py e docs/formulas.md).
// No sistema final, estes cálculos serão feitos pela API em Python.

function custoPorUso(insumo) {
  return insumo.rendimento > 0 ? insumo.preco / insumo.rendimento : 0;
}

function totalContasFixas(dados) {
  return dados.custosFixos.reduce((soma, c) => soma + c.valor, 0);
}

// Quanto o negócio precisa render no mês, além dos gastos de cada atendimento.
function metaMensal(dados) {
  const { salario, reserva } = dados.configuracao;
  return salario + totalContasFixas(dados) + (reserva || 0);
}

function horasDeAtendimento(dados) {
  const { diasPorMes, horasPorDia } = dados.configuracao;
  return diasPorMes * horasPorDia;
}

function valorDaHora(dados) {
  const horas = horasDeAtendimento(dados);
  return horas > 0 ? metaMensal(dados) / horas : 0;
}

function custoMaterial(servico, dados) {
  return servico.insumos.reduce((soma, item) => {
    const insumo = dados.insumos.find((i) => i.id === item.insumoId);
    return insumo ? soma + custoPorUso(insumo) * item.quantidade : soma;
  }, 0);
}

// Remove resíduos do float antes de arredondar para inteiro (ver docs/formulas.md).
function limparResiduo(valor) {
  return Math.round(valor * 1e9) / 1e9;
}

// Tudo sobre um serviço: preço mínimo, sobra, atendimentos necessários e desconto.
function analisarServico(servico, dados) {
  const taxa = dados.configuracao.taxaCartao || 0;
  const meta = metaMensal(dados);
  const material = custoMaterial(servico, dados);
  const outrosGastos = servico.outrosGastos || 0;
  const gasto = material + outrosGastos;
  const parteDaMeta = valorDaHora(dados) * (servico.minutos / 60);
  const precoMinimo = (gasto + parteDaMeta) / (1 - taxa / 100);
  const taxaNoMinimo = precoMinimo * (taxa / 100);
  const capacidade = Math.floor(limparResiduo((horasDeAtendimento(dados) * 60) / servico.minutos));

  const preco = servico.precoCobrado || 0;
  const taxaNoPreco = preco * (taxa / 100);
  const sobra = preco - taxaNoPreco - gasto;
  const necessarios = sobra > 0 ? Math.ceil(limparResiduo(meta / sobra)) : null;
  const desconto = preco - precoMinimo;

  return {
    meta, material, outrosGastos, gasto, parteDaMeta, precoMinimo, taxaNoMinimo,
    capacidade, preco, taxaNoPreco, sobra, necessarios, desconto,
  };
}
