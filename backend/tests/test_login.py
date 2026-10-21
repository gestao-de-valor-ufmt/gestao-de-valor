"""Testes do login e do convite: token obrigatório, convite obrigatório e separação dos dados.

O Firebase de verdade não é chamado: a verificação do token é simulada.
"valido-<uid>" = conta com convite; "novo-<uid>" = conta recém-criada, ainda sem convite.
Quem resgata um convite passa a ser tratado como "valido-" (a marca vai para o login).
"""

import firebase_admin.auth
import pytest
from fastapi.testclient import TestClient

import app.auth
import app.db.convites
import app.db.firebase
import app.db.repositorio
from app.config import Configuracoes
from app.main import app as api


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(app.auth, "configuracoes", Configuracoes("memoria", True, ["*"]))
    monkeypatch.setattr(app.db.firebase, "iniciar_firebase", lambda: None)
    monkeypatch.setattr(app.db.repositorio, "_memoria", {})
    monkeypatch.setattr(app.db.convites, "_memoria", {})
    liberados = set()

    def verificar(token):
        if token.startswith("valido-"):
            return {"uid": token.removeprefix("valido-"), "convite": True}
        if token.startswith("novo-"):
            uid = token.removeprefix("novo-")
            return {"uid": uid, "convite": True} if uid in liberados else {"uid": uid}
        raise ValueError("token inválido")

    class UsuarioFalso:
        custom_claims = None

    monkeypatch.setattr(firebase_admin.auth, "verify_id_token", verificar)
    monkeypatch.setattr(firebase_admin.auth, "get_user", lambda uid: UsuarioFalso())
    monkeypatch.setattr(firebase_admin.auth, "set_custom_user_claims", lambda uid, marcas: liberados.add(uid))
    return TestClient(api)


def login(uid: str) -> dict:
    return {"Authorization": f"Bearer valido-{uid}"}


def login_novo(uid: str) -> dict:
    return {"Authorization": f"Bearer novo-{uid}"}


# ---------- Convite ----------

def test_conta_sem_convite_nao_usa_o_sistema(client):
    resposta = client.get("/servicos", headers=login_novo("carla"))
    assert resposta.status_code == 403
    assert "convite" in resposta.json()["detail"]
    assert client.get("/conta", headers=login_novo("carla")).json()["convite"] is False


def test_convite_valido_libera_a_conta(client):
    app.db.convites.criar_em_memoria("GV-7K3M-Q9XP")
    # aceita minúsculas e sem traços
    resposta = client.post("/conta/convite", json={"codigo": "gv 7k3m q9xp"}, headers=login_novo("carla"))
    assert resposta.status_code == 200
    assert resposta.json()["convite"] is True
    assert client.get("/servicos", headers=login_novo("carla")).status_code == 200


def test_convite_inexistente(client):
    resposta = client.post("/conta/convite", json={"codigo": "GV-AAAA-BBBB"}, headers=login_novo("carla"))
    assert resposta.status_code == 404


def test_convite_vale_para_uma_conta_so(client):
    app.db.convites.criar_em_memoria("GV-7K3M-Q9XP")
    assert client.post("/conta/convite", json={"codigo": "GV-7K3M-Q9XP"}, headers=login_novo("carla")).status_code == 200
    # a mesma pessoa usar de novo não dá erro
    assert client.post("/conta/convite", json={"codigo": "GV-7K3M-Q9XP"}, headers=login_novo("carla")).status_code == 200
    # outra pessoa, não
    resposta = client.post("/conta/convite", json={"codigo": "GV-7K3M-Q9XP"}, headers=login_novo("davi"))
    assert resposta.status_code == 409
    assert client.get("/servicos", headers=login_novo("davi")).status_code == 403


def test_conta_sem_convite_pode_se_excluir(client, monkeypatch):
    monkeypatch.setattr(firebase_admin.auth, "delete_user", lambda uid: None)
    assert client.delete("/conta", headers=login_novo("carla")).status_code == 204


def test_simulacao_continua_livre_sem_convite(client):
    resposta = client.post("/calculadora/simular", headers=login_novo("carla"), json={
        "salario": 0, "dias_por_mes": 22, "horas_por_dia": 6, "material": 10, "minutos": 60, "preco_cobrado": 50,
    })
    assert resposta.status_code == 200


# ---------- Login ----------


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
