"""Testes do motor de cálculo.

O cenário de referência é a manicure a domicílio do protótipo (frontend/js/dados.js).
Os valores esperados batem com o que o protótipo mostra na tela.
"""

import pytest

from app.core.precificacao import (
    arredondar_moeda,
    atendimentos_necessarios,
    capacidade_mensal,
    custo_material,
    custo_por_uso,
    desconto_maximo,
    gasto_por_atendimento,
    horas_de_atendimento,
    meta_mensal,
    parte_da_meta,
    preco_minimo,
    sobra_por_atendimento,
    valor_da_hora,
)

# ---------- Cenário de referência: manicure a domicílio ----------

CONTAS_FIXAS = 80 + 75.90 + 30  # celular e internet, DAS MEI, reposição de equipamentos
SALARIO = 2500

# (preço da embalagem, rendimento, quantidade usada na manicure)
MATERIAL_MANICURE = [
    (12, 20, 1),   # esmalte
    (18, 30, 1),   # base fortalecedora
    (15, 30, 1),   # extra brilho
    (14, 50, 1),   # acetona
    (16, 200, 2),  # algodão
    (25, 50, 1),   # lixa
    (8, 100, 1),   # palito
    (35, 50, 1),   # luvas
    (12, 40, 1),   # removedor de cutícula
]


def test_cenario_completo_manicure():
    meta = meta_mensal(SALARIO, CONTAS_FIXAS)
    horas = horas_de_atendimento(dias_por_mes=22, horas_por_dia=6)
    material = custo_material([(custo_por_uso(p, r), q) for p, r, q in MATERIAL_MANICURE])
    gasto = gasto_por_atendimento(material, outros_gastos=2)  # R$ 2 de deslocamento
    parte = parte_da_meta(meta, horas, minutos=60)
    minimo = preco_minimo(gasto, parte)

    assert meta == pytest.approx(2685.90)
    assert horas == 132
    assert arredondar_moeda(valor_da_hora(meta, horas)) == 20.35
    assert arredondar_moeda(material) == 3.72
    assert arredondar_moeda(gasto) == 5.72
    assert arredondar_moeda(minimo) == 26.07
    assert capacidade_mensal(horas, 60) == 132

    # Cobrando R$ 40, como no exemplo do protótipo
    sobra = sobra_por_atendimento(40, gasto)
    assert arredondar_moeda(sobra) == 34.28
    assert atendimentos_necessarios(meta, sobra) == 79
    assert arredondar_moeda(desconto_maximo(40, minimo)) == 13.93


def test_caso_real_sem_contas_nem_salario():
    """Manicure que gasta R$ 10, cobra R$ 50 e não definiu salário nem contas.

    Cada atendimento deixa R$ 40; com 100 atendimentos, sobram R$ 4.000.
    """
    sobra = sobra_por_atendimento(50, 10)
    assert sobra == 40
    assert 100 * sobra == 4000
    assert atendimentos_necessarios(meta_mensal(0), sobra) == 0


def test_cobrando_o_minimo_precisa_lotar_a_agenda():
    """No preço mínimo, os atendimentos necessários são exatamente os que cabem no mês."""
    meta = meta_mensal(SALARIO, CONTAS_FIXAS)
    horas = horas_de_atendimento(22, 6)
    gasto = 5.72
    minimo = preco_minimo(gasto, parte_da_meta(meta, horas, 60), taxa_cartao=4)
    sobra = sobra_por_atendimento(minimo, gasto, taxa_cartao=4)
    assert atendimentos_necessarios(meta, sobra) == capacidade_mensal(horas, 60)


# ---------- Fórmula por fórmula ----------

def test_meta_mensal():
    assert meta_mensal(2000) == 2000
    assert meta_mensal(2000, contas_fixas=300, reserva=100) == 2400


def test_meta_mensal_negativa():
    with pytest.raises(ValueError):
        meta_mensal(-1)


def test_horas_de_atendimento():
    assert horas_de_atendimento(20, 8) == 160


@pytest.mark.parametrize("dias, horas", [(0, 8), (20, 0), (-1, 8)])
def test_horas_de_atendimento_invalidas(dias, horas):
    with pytest.raises(ValueError):
        horas_de_atendimento(dias, horas)


def test_valor_da_hora():
    assert valor_da_hora(3000, 100) == 30


def test_custo_por_uso():
    assert custo_por_uso(12, 20) == pytest.approx(0.60)


def test_custo_por_uso_rendimento_zero():
    with pytest.raises(ValueError):
        custo_por_uso(12, 0)


def test_custo_material():
    assert custo_material([(0.60, 1), (0.08, 2)]) == pytest.approx(0.76)
    assert custo_material([]) == 0


def test_gasto_por_atendimento():
    assert gasto_por_atendimento(10) == 10
    assert gasto_por_atendimento(10, outros_gastos=2) == 12


def test_gasto_negativo():
    with pytest.raises(ValueError):
        gasto_por_atendimento(10, outros_gastos=-2)


def test_parte_da_meta_proporcional_ao_tempo():
    # Meta de R$ 3.000 em 100 h → R$ 30 por hora
    assert parte_da_meta(3000, 100, 60) == pytest.approx(30)
    assert parte_da_meta(3000, 100, 120) == pytest.approx(60)


def test_preco_minimo_sem_taxa():
    assert preco_minimo(10, 20) == 30


def test_preco_minimo_com_taxa_da_maquininha():
    # Com 4% de taxa, R$ 30 líquidos exigem cobrar R$ 31,25
    assert preco_minimo(10, 20, taxa_cartao=4) == pytest.approx(31.25)


@pytest.mark.parametrize("taxa", [-1, 100, 150])
def test_preco_minimo_taxa_invalida(taxa):
    with pytest.raises(ValueError):
        preco_minimo(10, 20, taxa)


def test_somar_a_taxa_ao_preco_nao_basta():
    """Para receber R$ 40 com 10% de taxa, cobrar R$ 44 não é suficiente.

    A maquininha cobra 10% dos R$ 44 (R$ 4,40) e sobram R$ 39,60: faltam 40 centavos.
    Dividir em vez de somar resolve: R$ 40 / 0,90 = R$ 44,44, e 10% disso deixa R$ 40.
    """
    assert arredondar_moeda(sobra_por_atendimento(44, gasto=0, taxa_cartao=10)) == 39.60
    preco = preco_minimo(gasto=40, parte_meta=0, taxa_cartao=10)
    assert arredondar_moeda(preco) == 44.44
    assert sobra_por_atendimento(preco, gasto=0, taxa_cartao=10) == pytest.approx(40)


def test_sobra_por_atendimento_com_taxa():
    assert sobra_por_atendimento(31.25, 10, taxa_cartao=4) == pytest.approx(20)


def test_atendimentos_necessarios_arredonda_para_cima():
    # R$ 1.000 ÷ R$ 30 = 33,3 → precisa de 34 atendimentos
    assert atendimentos_necessarios(1000, 30) == 34


def test_atendimentos_necessarios_preco_nao_cobre_gastos():
    with pytest.raises(ValueError):
        atendimentos_necessarios(1000, 0)


def test_desconto_maximo():
    assert desconto_maximo(50, 40) == 10
    assert desconto_maximo(40, 50) == -10  # preço já abaixo do mínimo


def test_capacidade_mensal():
    assert capacidade_mensal(132, 50) == 158  # 158,4 → só cabem 158 inteiros


# ---------- Precisão numérica (ver docs/formulas.md) ----------

def test_float_tem_erro_de_representacao():
    # Demonstração do problema: o float não representa 0,1 nem 0,2 com exatidão.
    assert 0.1 + 0.2 != 0.3


def test_arredondar_moeda_regra_comercial():
    assert round(2.675, 2) == 2.67  # o round() do Python erra este caso
    assert arredondar_moeda(2.675) == 2.68
    assert arredondar_moeda(0.1 + 0.2) == 0.30
    assert arredondar_moeda(46.675) == 46.68


def test_capacidade_nao_perde_atendimento_por_residuo():
    # 8,2 h × 60 / 6 min deveria dar 82, mas o float calcula 81,99999999999999
    assert capacidade_mensal(8.2, 6) == 82


def test_atendimentos_nao_ganham_atendimento_por_residuo():
    # 0,9 / 0,03 deveria dar 30, mas o float calcula 30,000000000000004
    assert atendimentos_necessarios(0.9, 0.03) == 30
