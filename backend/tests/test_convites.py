"""Testes do formato dos códigos de convite."""

import pytest

from app.db.convites import ALFABETO, FORMATO, gerar_codigo, normalizar


def test_codigo_gerado_tem_o_formato_certo():
    for _ in range(200):
        assert FORMATO.match(gerar_codigo())


def test_codigo_sem_caracteres_que_confundem():
    for confuso in "0O1IL":
        assert confuso not in ALFABETO


@pytest.mark.parametrize("digitado", ["GV-7K3M-Q9XP", "gv-7k3m-q9xp", "GV7K3MQ9XP", " gv 7k3m q9xp ", "7K3M-Q9XP"])
def test_normalizar_aceita_variacoes(digitado):
    assert normalizar(digitado) == "GV-7K3M-Q9XP"
