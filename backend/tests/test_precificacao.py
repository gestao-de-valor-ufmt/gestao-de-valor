"""Testes do motor de cálculo.

O cenário de referência é a manicure do protótipo (frontend/js/dados.js).
Os valores esperados batem com o que o protótipo mostra na tela.
"""

import pytest

from app.core.precificacao import (
    arredondar_moeda,
    capacidade_mensal,
    custo_hora,
    custo_insumos,
    custo_mao_de_obra,
    custo_por_uso,
    horas_produtivas,
    ponto_equilibrio,
    preco_sugerido,
)

# ---------- Cenário de referência: manicure ----------

CUSTOS_FIXOS = 900 + 180 + 100 + 60 + 60 + 75.90 + 90 + 150 + 100  # R$ 1.715,90
PRO_LABORE = 3000

# (preço da embalagem, rendimento, quantidade usada na manicure)
INSUMOS_MANICURE = [
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
    horas = horas_produtivas(dias_por_mes=22, horas_por_dia=6, produtividade=75)
    hora = custo_hora(CUSTOS_FIXOS, PRO_LABORE, horas)
    insumos = custo_insumos([(custo_por_uso(p, r), q) for p, r, q in INSUMOS_MANICURE])
    custo = insumos + custo_mao_de_obra(hora, minutos=40)
    preco = preco_sugerido(custo, margem=20, impostos=0, taxa_cartao=4)

    assert horas == pytest.approx(99)
    assert arredondar_moeda(hora) == 47.64
    assert arredondar_moeda(insumos) == 3.72
    assert arredondar_moeda(custo) == 35.48
    assert arredondar_moeda(preco) == 46.68
    assert ponto_equilibrio(CUSTOS_FIXOS + PRO_LABORE, preco, insumos, impostos=0, taxa_cartao=4) == 115
    assert capacidade_mensal(horas, minutos_por_servico=40) == 148


# ---------- Fórmula por fórmula ----------

def test_custo_por_uso():
    assert custo_por_uso(12, 20) == pytest.approx(0.60)


def test_custo_por_uso_rendimento_zero():
    with pytest.raises(ValueError):
        custo_por_uso(12, 0)


def test_horas_produtivas():
    assert horas_produtivas(20, 8, 100) == pytest.approx(160)
    assert horas_produtivas(20, 8, 50) == pytest.approx(80)


@pytest.mark.parametrize("produtividade", [0, -10, 101])
def test_horas_produtivas_percentual_invalido(produtividade):
    with pytest.raises(ValueError):
        horas_produtivas(22, 6, produtividade)


def test_custo_hora():
    assert custo_hora(1000, 3000, 100) == pytest.approx(40)


def test_custo_hora_sem_horas():
    with pytest.raises(ValueError):
        custo_hora(1000, 3000, 0)


def test_custo_insumos():
    assert custo_insumos([(0.60, 1), (0.08, 2)]) == pytest.approx(0.76)
    assert custo_insumos([]) == 0


def test_custo_mao_de_obra():
    assert custo_mao_de_obra(60, 30) == pytest.approx(30)


def test_preco_sugerido_markup_divisor():
    # Exemplo de docs/formulas.md: custo R$ 30, 20% + 6% + 4% = 30% → 30 / 0,70
    assert arredondar_moeda(preco_sugerido(30, 20, 6, 4)) == 42.86


def test_preco_sugerido_sem_percentuais_e_o_proprio_custo():
    assert preco_sugerido(30, 0, 0, 0) == pytest.approx(30)


def test_preco_sugerido_percentuais_100_ou_mais():
    with pytest.raises(ValueError):
        preco_sugerido(30, 60, 30, 10)


def test_ponto_equilibrio():
    # Custos de R$ 1.000, preço R$ 30, insumos R$ 10, sem taxas → sobra R$ 20 por atendimento
    assert ponto_equilibrio(1000, 30, 10, 0, 0) == 50


def test_ponto_equilibrio_arredonda_para_cima():
    # 1000 / 30 = 33,3 → precisa de 34 atendimentos
    assert ponto_equilibrio(1000, 40, 10, 0, 0) == 34


def test_ponto_equilibrio_preco_nao_cobre_custo_variavel():
    with pytest.raises(ValueError):
        ponto_equilibrio(1000, 10, 10, 0, 0)


def test_capacidade_mensal():
    assert capacidade_mensal(99, 40) == 148  # 148,5 → só cabem 148 inteiros


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


def test_ponto_equilibrio_nao_ganha_atendimento_por_residuo():
    # 0,9 / 0,03 deveria dar 30, mas o float calcula 30,000000000000004
    assert ponto_equilibrio(0.9, 0.03, 0, 0, 0) == 30
