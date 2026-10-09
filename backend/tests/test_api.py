"""Testes dos endpoints da API.

Cada teste recebe um repositório novo com os dados de exemplo (manicure a domicílio),
então um teste não interfere no outro.
"""

import pytest
from fastapi.testclient import TestClient

from app.db.exemplo import criar_repositorio_exemplo
from app.db.repositorio import obter_repositorio
from app.main import app


@pytest.fixture
def client():
    repo = criar_repositorio_exemplo()
    app.dependency_overrides[obter_repositorio] = lambda: repo
    yield TestClient(app)
    app.dependency_overrides.clear()


# ---------- Seu mês ----------

def test_obter_configuracao(client):
    config = client.get("/configuracao").json()
    assert config["salario"] == 2500
    assert config["dias_por_mes"] == 22


def test_salvar_configuracao(client):
    nova = {"salario": 3000, "reserva": 200, "dias_por_mes": 20, "horas_por_dia": 8, "taxa_cartao": 3}
    assert client.put("/configuracao", json=nova).json() == nova
    assert client.get("/configuracao").json()["salario"] == 3000


def test_configuracao_invalida(client):
    resposta = client.put("/configuracao", json={"salario": -1, "dias_por_mes": 22, "horas_por_dia": 6})
    assert resposta.status_code == 422


# ---------- Contas fixas ----------

def test_crud_contas(client):
    assert len(client.get("/contas").json()) == 3

    criada = client.post("/contas", json={"nome": "Aluguel", "valor": 500}).json()
    assert criada["id"] == 4

    editada = client.put(f"/contas/{criada['id']}", json={"nome": "Aluguel", "valor": 600}).json()
    assert editada["valor"] == 600

    assert client.delete(f"/contas/{criada['id']}").status_code == 204
    assert client.delete(f"/contas/{criada['id']}").status_code == 404


# ---------- Materiais ----------

def test_material_calcula_custo_por_uso(client):
    criado = client.post("/materiais", json={"nome": "Esmalte novo", "preco": 12, "rendimento": 20}).json()
    assert criado["custo_por_uso"] == 0.60


def test_material_rendimento_zero_e_recusado(client):
    resposta = client.post("/materiais", json={"nome": "X", "preco": 12, "rendimento": 0})
    assert resposta.status_code == 422


def test_nao_apaga_material_em_uso(client):
    resposta = client.delete("/materiais/1")  # esmalte, usado na manicure
    assert resposta.status_code == 409
    assert "usado em algum serviço" in resposta.json()["detail"]


def test_apaga_material_sem_uso(client):
    criado = client.post("/materiais", json={"nome": "Lixa nova", "preco": 10, "rendimento": 10}).json()
    assert client.delete(f"/materiais/{criado['id']}").status_code == 204


# ---------- Serviços ----------

def test_crud_servicos(client):
    novo = {"nome": "Spa dos pés", "minutos": 90, "outros_gastos": 3, "preco_cobrado": 80,
            "materiais": [{"material_id": 10, "quantidade": 2}]}
    criado = client.post("/servicos", json=novo).json()
    assert criado["id"] == 6

    novo["preco_cobrado"] = 90
    assert client.put(f"/servicos/{criado['id']}", json=novo).json()["preco_cobrado"] == 90

    assert client.delete(f"/servicos/{criado['id']}").status_code == 204
    assert client.get(f"/servicos/{criado['id']}/analise").status_code == 404


def test_servico_com_material_inexistente(client):
    resposta = client.post("/servicos", json={
        "nome": "X", "minutos": 30, "materiais": [{"material_id": 999, "quantidade": 1}],
    })
    assert resposta.status_code == 422
    assert "999" in resposta.json()["detail"]


# ---------- Calculadora ----------

def test_analise_da_manicure(client):
    """Os mesmos números do protótipo e dos testes do motor."""
    a = client.get("/servicos/1/analise").json()
    assert a["nome"] == "Manicure"
    assert a["material"] == 3.72
    assert a["gasto"] == 5.72
    assert a["parte_da_meta"] == 20.35
    assert a["preco_minimo"] == 26.07
    assert a["sobra"] == 34.28
    assert a["atendimentos_necessarios"] == 79
    assert a["capacidade"] == 132
    assert a["desconto_maximo"] == 13.93


def test_analise_com_maquininha(client):
    config = client.get("/configuracao").json()
    client.put("/configuracao", json={**config, "taxa_cartao": 5})
    a = client.get("/servicos/1/analise").json()
    assert a["taxa_no_preco"] == 2.00
    assert a["valor_liquido"] == 38.00


def test_analise_preco_abaixo_do_material(client):
    servico = client.get("/servicos").json()[0]
    client.put("/servicos/1", json={**servico, "preco_cobrado": 5})
    a = client.get("/servicos/1/analise").json()
    assert a["atendimentos_necessarios"] is None
    assert a["desconto_maximo"] < 0


def test_resumo_do_painel(client):
    r = client.get("/calculadora/resumo").json()
    assert r["meta"] == 2685.90
    assert r["horas_de_atendimento"] == 132
    assert r["valor_da_hora"] == 20.35
    assert len(r["servicos"]) == 5


def test_simulacao_sem_cadastro():
    """O caso da manicure que cobra R$ 50 e gasta R$ 10, sem salário nem contas."""
    resposta = TestClient(app).post("/calculadora/simular", json={
        "salario": 0, "dias_por_mes": 22, "horas_por_dia": 6,
        "material": 10, "minutos": 60, "preco_cobrado": 50,
    }).json()
    assert resposta["sobra"] == 40
    assert resposta["atendimentos_necessarios"] == 0
    assert resposta["preco_minimo"] == 10


def test_simulacao_taxa_invalida():
    resposta = TestClient(app).post("/calculadora/simular", json={
        "salario": 2500, "dias_por_mes": 22, "horas_por_dia": 6,
        "material": 10, "minutos": 60, "taxa_cartao": 100,
    })
    assert resposta.status_code == 422


@pytest.mark.parametrize("duracao, por_periodo, esperado", [(2, 10, 20), (0.5, 5, 3), (0.1, 1, 1)])
def test_rendimento_estimado(duracao, por_periodo, esperado):
    resposta = TestClient(app).post("/calculadora/rendimento", json={
        "duracao": duracao, "atendimentos_por_periodo": por_periodo,
    })
    assert resposta.json() == {"rendimento_estimado": esperado}
