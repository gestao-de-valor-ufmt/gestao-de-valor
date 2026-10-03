"""Motor de cálculo de precificação.

Funções puras: recebem números e devolvem números, sem acessar banco de dados nem internet.
As fórmulas estão explicadas em docs/formulas.md.

A lógica responde a três perguntas do microempreendedor:
1. Quanto preciso cobrar, no mínimo, para ganhar o que quero no mês?
2. Cobrando o que cobro hoje, quantos atendimentos preciso fazer no mês?
3. Quanto posso dar de desconto sem mexer no meu salário?

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


# ---------- O mês do profissional ----------

def meta_mensal(salario: float, contas_fixas: float = 0, reserva: float = 0) -> float:
    """Quanto o negócio precisa render no mês, além dos gastos de cada atendimento.

    - salario: quanto a pessoa quer ganhar para si (pró-labore).
    - contas_fixas: o que se paga todo mês, trabalhando ou não (DAS, celular, aluguel...).
    - reserva: dinheiro extra para emergências e para investir no negócio.
    """
    if min(salario, contas_fixas, reserva) < 0:
        raise ValueError("Salário, contas e reserva não podem ser negativos.")
    return salario + contas_fixas + reserva


def horas_de_atendimento(dias_por_mes: float, horas_por_dia: float) -> float:
    """Horas do mês em que a pessoa está de fato atendendo clientes."""
    if dias_por_mes <= 0 or horas_por_dia <= 0:
        raise ValueError("Dias por mês e horas por dia precisam ser maiores que zero.")
    return dias_por_mes * horas_por_dia


def valor_da_hora(meta: float, horas: float) -> float:
    """Quanto cada hora de atendimento precisa render para bater a meta do mês."""
    if horas <= 0:
        raise ValueError("As horas de atendimento precisam ser maiores que zero.")
    return meta / horas


# ---------- O atendimento ----------

def custo_por_uso(preco_embalagem: float, rendimento: float) -> float:
    """Quanto custa cada uso de um material.

    Exemplo: esmalte de R$ 12,00 que rende 20 aplicações custa R$ 0,60 por uso.
    """
    if rendimento <= 0:
        raise ValueError("O rendimento precisa ser maior que zero.")
    if preco_embalagem < 0:
        raise ValueError("O preço da embalagem não pode ser negativo.")
    return preco_embalagem / rendimento


def rendimento_estimado(duracao: float, atendimentos_por_periodo: float) -> float:
    """Estima quantos usos uma embalagem rende pelo tempo que ela dura.

    Para quem não sabe o rendimento: "dura 2 semanas e faço 10 atendimentos
    por semana" → rende cerca de 20. Duração e atendimentos usam a mesma
    unidade de tempo (dias, semanas ou meses).
    """
    if duracao <= 0 or atendimentos_por_periodo <= 0:
        raise ValueError("Duração e atendimentos precisam ser maiores que zero.")
    return duracao * atendimentos_por_periodo


def custo_material(itens: list[tuple[float, float]]) -> float:
    """Soma do material usado num atendimento.

    itens é uma lista de pares (custo_por_uso, quantidade).
    """
    return sum(custo * quantidade for custo, quantidade in itens)


def gasto_por_atendimento(material: float, outros_gastos: float = 0) -> float:
    """Tudo o que sai do bolso a cada atendimento.

    outros_gastos cobre o que é difícil de medir: deslocamento, gás, detergente...
    """
    if min(material, outros_gastos) < 0:
        raise ValueError("Os gastos não podem ser negativos.")
    return material + outros_gastos


def parte_da_meta(meta: float, horas: float, minutos: float) -> float:
    """Quanto um atendimento precisa contribuir para a meta do mês.

    É a meta dividida pelo tempo: um serviço de 2 horas contribui o dobro
    de um serviço de 1 hora.
    """
    if minutos <= 0:
        raise ValueError("O tempo do atendimento precisa ser maior que zero.")
    return valor_da_hora(meta, horas) * (minutos / 60)


def capacidade_mensal(horas: float, minutos: float) -> int:
    """Quantos atendimentos cabem nas horas de atendimento do mês."""
    if minutos <= 0:
        raise ValueError("O tempo do atendimento precisa ser maior que zero.")
    return math.floor(_limpar_residuo(horas * 60 / minutos))


# ---------- As três respostas ----------

def preco_minimo(gasto: float, parte_meta: float, taxa_cartao: float = 0) -> float:
    """Menor preço que cobre os gastos do atendimento e a parte dele na meta do mês.

    A taxa da maquininha é cobrada sobre o preço, por isso se divide:
    preço = (gasto + parte_meta) / (1 - taxa / 100).
    """
    if not 0 <= taxa_cartao < 100:
        raise ValueError("A taxa da maquininha precisa estar entre 0% e 100%.")
    return (gasto + parte_meta) / (1 - taxa_cartao / 100)


def sobra_por_atendimento(preco: float, gasto: float, taxa_cartao: float = 0) -> float:
    """Quanto fica com a pessoa de cada atendimento, depois de pagar gastos e taxa."""
    if not 0 <= taxa_cartao < 100:
        raise ValueError("A taxa da maquininha precisa estar entre 0% e 100%.")
    return preco * (1 - taxa_cartao / 100) - gasto


def atendimentos_necessarios(meta: float, sobra: float) -> int:
    """Quantos atendimentos no mês são necessários para bater a meta.

    Arredonda para cima, porque não existe meio atendimento.
    """
    if sobra <= 0:
        raise ValueError("O preço não cobre nem os gastos do atendimento.")
    return math.ceil(_limpar_residuo(meta / sobra))


def desconto_maximo(preco: float, minimo: float) -> float:
    """Quanto, em R$, dá para descontar sem ficar abaixo do preço mínimo.

    Negativo significa que o preço já está abaixo do mínimo.
    """
    return preco - minimo
