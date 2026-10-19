"""Testes do login: token obrigatório e separação dos dados de cada usuário.

O Firebase de verdade não é chamado: a verificação do token é simulada, e o
"token" de teste é o próprio uid do usuário.
"""

import firebase_admin.auth
import pytest
from fastapi.testclient import TestClient

import app.auth
import app.db.firebase
import app.db.repositorio
from app.config import Configuracoes
from app.main import app as api


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(app.auth, "configuracoes", Configuracoes("memoria", True, ["*"]))
    monkeypatch.setattr(app.db.firebase, "iniciar_firebase", lambda: None)
    monkeypatch.setattr(app.db.repositorio, "_memoria", {})

    def verificar(token):
        if token.startswith("valido-"):
            return {"uid": token.removeprefix("valido-")}
        raise ValueError("token inválido")

    monkeypatch.setattr(firebase_admin.auth, "verify_id_token", verificar)
    return TestClient(api)


def login(uid: str) -> dict:
    return {"Authorization": f"Bearer valido-{uid}"}


def test_sem_token_responde_401(client):
    resposta = client.get("/servicos")
    assert resposta.status_code == 401
    assert resposta.json()["detail"] == "Faça login para continuar."


def test_token_invalido_responde_401(client):
    resposta = client.get("/servicos", headers={"Authorization": "Bearer qualquer-coisa"})
    assert resposta.status_code == 401
    assert "expirada" in resposta.json()["detail"]


def test_token_valido_identifica_o_usuario(client):
    assert client.get("/conta", headers=login("ana")).json()["uid"] == "ana"


def test_excluir_conta_apaga_dados_e_login(client, monkeypatch):
    excluidos = []
    monkeypatch.setattr(firebase_admin.auth, "delete_user", excluidos.append)
    client.post("/contas", json={"nome": "Aluguel da Ana", "valor": 500}, headers=login("ana"))

    assert client.delete("/conta", headers=login("ana")).status_code == 204
    assert excluidos == ["ana"]
    # Os dados da Bia continuam lá
    assert len(client.get("/servicos", headers=login("bia")).json()) == 5
    # Se a Ana voltar com o mesmo token, começa do zero (aqui, a memória refaz o exemplo)
    assert "Aluguel da Ana" not in [c["nome"] for c in client.get("/contas", headers=login("ana")).json()]


def test_nao_exclui_conta_sem_login(client):
    assert client.delete("/conta").status_code == 401


def test_cada_usuario_ve_so_os_proprios_dados(client):
    client.post("/contas", json={"nome": "Aluguel da Ana", "valor": 500}, headers=login("ana"))

    contas_ana = [c["nome"] for c in client.get("/contas", headers=login("ana")).json()]
    contas_bia = [c["nome"] for c in client.get("/contas", headers=login("bia")).json()]

    assert "Aluguel da Ana" in contas_ana
    assert "Aluguel da Ana" not in contas_bia


def test_simulacao_e_rendimento_funcionam_sem_login(client):
    simulacao = client.post("/calculadora/simular", json={
        "salario": 0, "dias_por_mes": 22, "horas_por_dia": 6, "material": 10, "minutos": 60, "preco_cobrado": 50,
    })
    rendimento = client.post("/calculadora/rendimento", json={"duracao": 2, "atendimentos_por_periodo": 10})
    assert simulacao.status_code == 200
    assert rendimento.status_code == 200


def test_health_funciona_sem_login(client):
    assert client.get("/health").status_code == 200
