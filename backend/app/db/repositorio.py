"""Armazenamento dos dados.

Por enquanto tudo fica na memória do servidor e se perde quando ele reinicia.
Na próxima etapa, um RepositorioFirestore com os mesmos métodos substitui este,
sem mudar nada nos endpoints: eles só conhecem a função obter_repositorio().
"""

from typing import Annotated, Generic, TypeVar

from fastapi import Depends
from pydantic import BaseModel

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


class Colecao(Generic[Entrada, Registro]):
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
    def __init__(self, configuracao: Configuracao):
        self.configuracao = configuracao
        self.contas: Colecao[ContaFixaEntrada, ContaFixa] = Colecao(ContaFixa)
        self.materiais: Colecao[MaterialEntrada, Material] = Colecao(Material)
        self.servicos: Colecao[ServicoEntrada, Servico] = Colecao(Servico)

    def material_em_uso(self, material_id: int) -> bool:
        return any(
            item.material_id == material_id
            for servico in self.servicos.listar()
            for item in servico.materiais
        )


_repositorio: RepositorioMemoria | None = None


def obter_repositorio() -> RepositorioMemoria:
    """Dependência do FastAPI: entrega o repositório para os endpoints.

    Na primeira chamada, carrega os dados de exemplo (manicure a domicílio).
    """
    global _repositorio
    if _repositorio is None:
        from app.db.exemplo import criar_repositorio_exemplo

        _repositorio = criar_repositorio_exemplo()
    return _repositorio


# Atalho para os endpoints: "repo: Repo" recebe o repositório automaticamente.
Repo = Annotated[RepositorioMemoria, Depends(obter_repositorio)]
