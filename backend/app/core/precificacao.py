"""Motor de cálculo de precificação.

Funções puras: recebem números e devolvem números, sem acessar banco de dados nem internet.
As fórmulas estão explicadas em docs/formulas.md.

Precisão numérica: os cálculos usam float com precisão total e o arredondamento
para centavos acontece só no final, com a função arredondar_moeda().
"""

import math
from decimal import ROUND_HALF_UP, Decimal


def arredondar_moeda(valor: float) -> float:
    """Arredonda um valor em reais para centavos, com a regra comercial (0,5 sobe).

    O round() do Python usa outra regra ("arredondamento bancário") e ainda sofre
    com a representação binária do float: round(2.675, 2) dá 2.67, e não 2.68.
    Converter para texto e depois para Decimal evita esses dois problemas.
    """
    return float(Decimal(str(valor)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _limpar_residuo(valor: float) -> float:
    """Remove resíduos minúsculos do float antes de arredondar para inteiro.

    Sem isso, uma conta que deveria dar exatamente 100 pode dar 100.00000000000001,
    e math.ceil() devolveria 101.
    """
    return round(valor, 9)


def custo_por_uso(preco_embalagem: float, rendimento: float) -> float:
    """Quanto custa cada uso de um insumo.

    Exemplo: esmalte de R$ 12,00 que rende 20 aplicações custa R$ 0,60 por uso.
    """
    if rendimento <= 0:
        raise ValueError("O rendimento precisa ser maior que zero.")
    if preco_embalagem < 0:
        raise ValueError("O preço da embalagem não pode ser negativo.")
    return preco_embalagem / rendimento


def horas_produtivas(dias_por_mes: float, horas_por_dia: float, produtividade: float) -> float:
    """Horas do mês que realmente podem ser vendidas.

    produtividade é o percentual do tempo de trabalho que vira atendimento (de 0 a 100),
    descontando limpeza, intervalos e horários vagos.
    """
    if not 0 < produtividade <= 100:
        raise ValueError("A produtividade precisa estar entre 0% e 100%.")
    if dias_por_mes <= 0 or horas_por_dia <= 0:
        raise ValueError("Dias por mês e horas por dia precisam ser maiores que zero.")
    return dias_por_mes * horas_por_dia * (produtividade / 100)


def custo_hora(custos_fixos_mensais: float, pro_labore: float, horas: float) -> float:
    """Custo de uma hora de trabalho (hora técnica).

    Rateia os custos fixos e o pró-labore (salário do dono) pelas horas produtivas do mês.
    """
    if horas <= 0:
        raise ValueError("As horas produtivas precisam ser maiores que zero.")
    return (custos_fixos_mensais + pro_labore) / horas


def custo_insumos(itens: list[tuple[float, float]]) -> float:
    """Soma do custo dos insumos de um serviço.

    itens é uma lista de pares (custo_por_uso, quantidade).
    """
    return sum(custo * quantidade for custo, quantidade in itens)


def custo_mao_de_obra(valor_hora: float, minutos: float) -> float:
    """Custo do tempo gasto no serviço."""
    if minutos <= 0:
        raise ValueError("O tempo do serviço precisa ser maior que zero.")
    return valor_hora * (minutos / 60)


def custo_servico(insumos: float, custos_miudos: float = 0, mao_de_obra: float = 0) -> float:
    """Custo de um atendimento, somando só os componentes escolhidos.

    - insumos: materiais da ficha técnica.
    - custos_miudos: valor fixo por atendimento para gastos pequenos e difíceis de medir
      (gás, detergente, combustível para buscar material).
    - mao_de_obra: tempo × hora técnica. Fica 0 no modo simples, em que o preço
      é só materiais + custos miúdos + margem.
    """
    if min(insumos, custos_miudos, mao_de_obra) < 0:
        raise ValueError("Os componentes do custo não podem ser negativos.")
    return insumos + custos_miudos + mao_de_obra


def preco_sugerido(custo: float, margem: float, impostos: float, taxa_cartao: float) -> float:
    """Preço de venda pelo método do markup divisor.

    Os percentuais incidem sobre o preço final, por isso se divide em vez de
    multiplicar: preço = custo / (1 - percentuais / 100).
    A margem pode ser negativa (vender abaixo do custo de propósito, por exemplo
    numa troca de serviços); impostos e taxas não.
    """
    percentuais = margem + impostos + taxa_cartao
    if percentuais >= 100:
        raise ValueError("Margem, impostos e taxas somados precisam ser menores que 100%.")
    if min(impostos, taxa_cartao) < 0:
        raise ValueError("Impostos e taxas não podem ser negativos.")
    return custo / (1 - percentuais / 100)


def desconto_maximo(preco: float, preco_minimo: float) -> float:
    """Maior desconto, em %, que mantém o preço igual ou acima do preço mínimo.

    O preço mínimo é o preco_sugerido() calculado com a margem mínima que o
    usuário aceita. Resultado negativo significa que o preço atual já está
    abaixo do mínimo, ou seja, não há espaço para desconto.
    """
    if preco <= 0:
        raise ValueError("O preço precisa ser maior que zero.")
    return (preco - preco_minimo) / preco * 100


def margem_efetiva(custo: float, preco: float, impostos: float, taxa_cartao: float) -> float:
    """Margem de lucro, em % do preço, que sobra quando se cobra um preço qualquer.

    Serve para avaliar um preço com desconto: é a conta inversa de preco_sugerido().
    """
    if preco <= 0:
        raise ValueError("O preço precisa ser maior que zero.")
    return (1 - custo / preco) * 100 - impostos - taxa_cartao


def ponto_equilibrio(
    custo_mensal_total: float,
    preco: float,
    custos_diretos: float,
    impostos: float,
    taxa_cartao: float,
) -> int:
    """Quantos atendimentos no mês são necessários para cobrir todos os custos.

    custo_mensal_total é a soma dos custos fixos com o pró-labore.
    custos_diretos é o que cada atendimento gasta: insumos + custos miúdos.
    O custo variável inclui só custos diretos, impostos e taxas: a parte fixa já
    está em custo_mensal_total e não pode ser contada duas vezes.
    O resultado é arredondado para cima, porque não existe meio atendimento.
    """
    custo_variavel = custos_diretos + preco * (impostos + taxa_cartao) / 100
    margem_contribuicao = preco - custo_variavel
    if margem_contribuicao <= 0:
        raise ValueError("O preço não cobre nem os custos variáveis do serviço.")
    return math.ceil(_limpar_residuo(custo_mensal_total / margem_contribuicao))


def capacidade_mensal(horas: float, minutos_por_servico: float) -> int:
    """Quantos atendimentos cabem nas horas produtivas do mês."""
    if minutos_por_servico <= 0:
        raise ValueError("O tempo do serviço precisa ser maior que zero.")
    return math.floor(_limpar_residuo(horas * 60 / minutos_por_servico))
