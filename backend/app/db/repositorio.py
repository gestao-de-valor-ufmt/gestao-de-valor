"""Armazenamento dos dados de cada usuário.

Dois jeitos de guardar, com os mesmos métodos:
- RepositorioMemoria: na memória do servidor (testes e desenvolvimento).
- RepositorioFirestore: no Google Cloud Firestore (produção).

A variável ARMAZENAMENTO escolhe qual usar (veja app/config.py). Os endpoints só
conhecem a função obter_repositorio(), que já entrega o repositório do usuário logado.

Estrutura no Firestore (uma "pasta" por usuário):
    usuarios/{uid}                → configuração do mês e contadores de id
    usuarios/{uid}/contas/{id}    → contas fixas
    usuarios/{uid}/materiais/{id} → materiais
    usuarios/{uid}/servicos/{id}  → serviços
"""

from datetime import datetime, timezone
from typing import Annotated, Generic, Protocol, TypeVar

from fastapi import Depends
from pydantic import BaseModel

from app.auth import Usuario, UsuarioLiberado
from app.config import configuracoes
from app.models.schemas import (
    Configuracao,
    ContaFixa,
    ContaFixaEntrada,
    Material,
    MaterialEntrada,
    Servico,
    ServicoEntrada,
)

Entrada = TypeVar("Entrada", bound=BaseModel)
Registro = TypeVar("Registro", bound=BaseModel)


def configuracao_inicial() -> Configuracao:
    """Configuração de quem acabou de criar a conta."""
    return Configuracao(salario=0, reserva=0, dias_por_mes=22, horas_por_dia=8, taxa_cartao=0)


class Colecao(Protocol[Entrada, Registro]):
    def listar(self) -> list[Registro]: ...
    def obter(self, id: int) -> Registro | None: ...
    def criar(self, dados: Entrada) -> Registro: ...
    def atualizar(self, id: int, dados: Entrada) -> Registro | None: ...
    def remover(self, id: int) -> bool: ...


class Repositorio(Protocol):
    configuracao: Configuracao
    contas: Colecao[ContaFixaEntrada, ContaFixa]
    materiais: Colecao[MaterialEntrada, Material]
    servicos: Colecao[ServicoEntrada, Servico]

    def aceite_privacidade(self) -> dict | None: ...
    def registrar_aceite(self, versao: str) -> dict: ...
    def apagar_conta(self) -> None: ...


def material_em_uso(repo: Repositorio, material_id: int) -> bool:
    return any(
        item.material_id == material_id
        for servico in repo.servicos.listar()
        for item in servico.materiais
    )


def apagar_tudo(repo: Repositorio) -> None:
    """Apaga serviços, materiais e contas, e volta a configuração ao início."""
    for colecao in (repo.servicos, repo.materiais, repo.contas):
        for registro in colecao.listar():
            colecao.remover(registro.id)
    repo.configuracao = configuracao_inicial()


# ---------- Memória ----------


class ColecaoMemoria(Generic[Entrada, Registro]):
    """Lista de registros com id, como uma tabela simples."""

    def __init__(self, modelo: type[Registro]):
        self._modelo = modelo
        self._itens: dict[int, Registro] = {}
        self._proximo_id = 1

    def listar(self) -> list[Registro]:
        return list(self._itens.values())

    def obter(self, id: int) -> Registro | None:
        return self._itens.get(id)

    def criar(self, dados: Entrada) -> Registro:
        registro = self._modelo(id=self._proximo_id, **dados.model_dump())
        self._itens[registro.id] = registro
        self._proximo_id += 1
        return registro

    def atualizar(self, id: int, dados: Entrada) -> Registro | None:
        if id not in self._itens:
            return None
        registro = self._modelo(id=id, **dados.model_dump())
        self._itens[id] = registro
        return registro

    def remover(self, id: int) -> bool:
        return self._itens.pop(id, None) is not None


class RepositorioMemoria:
    def __init__(self, configuracao: Configuracao | None = None):
        self.configuracao = configuracao or configuracao_inicial()
        self.contas: ColecaoMemoria[ContaFixaEntrada, ContaFixa] = ColecaoMemoria(ContaFixa)
        self.materiais: ColecaoMemoria[MaterialEntrada, Material] = ColecaoMemoria(Material)
        self.servicos: ColecaoMemoria[ServicoEntrada, Servico] = ColecaoMemoria(Servico)
        self._aceite: dict | None = None

    def aceite_privacidade(self) -> dict | None:
        return self._aceite

    def registrar_aceite(self, versao: str) -> dict:
        if not self._aceite or self._aceite["versao"] != versao:
            self._aceite = {"versao": versao, "aceito_em": datetime.now(timezone.utc)}
        return self._aceite

    def apagar_conta(self) -> None:
        apagar_tudo(self)
        self._aceite = None


# ---------- Firestore ----------


class ColecaoFirestore(Generic[Entrada, Registro]):
    """Uma subcoleção do usuário no Firestore. O id do documento é o número do registro."""

    def __init__(self, cliente, usuario_ref, nome: str, modelo: type[Registro]):
        self._cliente = cliente
        self._usuario_ref = usuario_ref
        self._ref = usuario_ref.collection(nome)
        self._nome = nome
        self._modelo = modelo

    def _montar(self, documento) -> Registro:
        return self._modelo(id=int(documento.id), **documento.to_dict())

    def listar(self) -> list[Registro]:
        return sorted((self._montar(d) for d in self._ref.stream()), key=lambda r: r.id)

    def obter(self, id: int) -> Registro | None:
        documento = self._ref.document(str(id)).get()
        return self._montar(documento) if documento.exists else None

    def _reservar_id(self) -> int:
        """Pega o próximo id numa transação, para dois cadastros simultâneos não usarem o mesmo número."""
        from google.cloud import firestore

        @firestore.transactional
        def reservar(transacao):
            snapshot = self._usuario_ref.get(transaction=transacao)
            contadores = (snapshot.to_dict() or {}).get("proximos_ids", {}) if snapshot.exists else {}
            proximo = contadores.get(self._nome, 1)
            transacao.set(self._usuario_ref, {"proximos_ids": {self._nome: proximo + 1}}, merge=True)
            return proximo

        return reservar(self._cliente.transaction())

    def criar(self, dados: Entrada) -> Registro:
        id = self._reservar_id()
        self._ref.document(str(id)).set(dados.model_dump())
        return self._modelo(id=id, **dados.model_dump())

    def atualizar(self, id: int, dados: Entrada) -> Registro | None:
        documento = self._ref.document(str(id))
        if not documento.get().exists:
            return None
        documento.set(dados.model_dump())
        return self._modelo(id=id, **dados.model_dump())

    def remover(self, id: int) -> bool:
        documento = self._ref.document(str(id))
        if not documento.get().exists:
            return False
        documento.delete()
        return True


class RepositorioFirestore:
    def __init__(self, cliente, uid: str):
        self._usuario_ref = cliente.collection("usuarios").document(uid)
        self.contas: ColecaoFirestore[ContaFixaEntrada, ContaFixa] = ColecaoFirestore(
            cliente, self._usuario_ref, "contas", ContaFixa
        )
        self.materiais: ColecaoFirestore[MaterialEntrada, Material] = ColecaoFirestore(
            cliente, self._usuario_ref, "materiais", Material
        )
        self.servicos: ColecaoFirestore[ServicoEntrada, Servico] = ColecaoFirestore(
            cliente, self._usuario_ref, "servicos", Servico
        )

    @property
    def configuracao(self) -> Configuracao:
        documento = self._usuario_ref.get()
        dados = (documento.to_dict() or {}).get("configuracao") if documento.exists else None
        return Configuracao(**dados) if dados else configuracao_inicial()

    @configuracao.setter
    def configuracao(self, valor: Configuracao) -> None:
        self._usuario_ref.set({"configuracao": valor.model_dump()}, merge=True)

    def aceite_privacidade(self) -> dict | None:
        documento = self._usuario_ref.get()
        return (documento.to_dict() or {}).get("privacidade") if documento.exists else None

    def registrar_aceite(self, versao: str) -> dict:
        """Guarda a versão da política aceita e quando. Um novo aceite da mesma versão não muda a data."""
        atual = self.aceite_privacidade()
        if atual and atual.get("versao") == versao:
            return atual
        aceite = {"versao": versao, "aceito_em": datetime.now(timezone.utc)}
        self._usuario_ref.set({"privacidade": aceite}, merge=True)
        return aceite

    def apagar_conta(self) -> None:
        """Apaga todos os documentos do usuário, inclusive o documento principal."""
        for colecao in (self.servicos, self.materiais, self.contas):
            for registro in colecao.listar():
                colecao.remover(registro.id)
        self._usuario_ref.delete()


# ---------- Qual usar ----------

_memoria: dict[str, RepositorioMemoria] = {}


def obter_repositorio(uid: UsuarioLiberado) -> Repositorio:
    """Dependência do FastAPI: entrega o repositório do usuário logado, que precisa ter convite."""
    return repositorio_de(uid)


def obter_repositorio_da_conta(uid: Usuario) -> Repositorio:
    """O repositório de qualquer conta logada, mesmo sem convite (usado só para excluir a conta)."""
    return repositorio_de(uid)


def repositorio_de(uid: str) -> Repositorio:
    if configuracoes.armazenamento == "firestore":
        from app.db.firebase import cliente_firestore

        return RepositorioFirestore(cliente_firestore(), uid)

    if uid not in _memoria:
        from app.db.exemplo import preencher_com_exemplo

        _memoria[uid] = RepositorioMemoria()
        preencher_com_exemplo(_memoria[uid])
    return _memoria[uid]


def esquecer_usuario_da_memoria(uid: str) -> None:
    """Depois de excluir a conta, tira o usuário da memória (no Firestore, o documento já foi apagado)."""
    _memoria.pop(uid, None)


# Atalhos para os endpoints: "repo: Repo" recebe o repositório (exige convite);
# "repo: RepoDaConta" não exige, e só serve para excluir a conta.
Repo = Annotated[Repositorio, Depends(obter_repositorio)]
RepoDaConta = Annotated[Repositorio, Depends(obter_repositorio_da_conta)]
