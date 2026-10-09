"""Contas fixas: o que se paga todo mês, trabalhando ou não."""

from fastapi import APIRouter, HTTPException, status

from app.db.repositorio import Repo
from app.models.schemas import ContaFixa, ContaFixaEntrada

router = APIRouter(prefix="/contas", tags=["Contas fixas"])


def _nao_encontrada(id: int) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"Conta {id} não encontrada.")


@router.get("", response_model=list[ContaFixa], summary="Listar contas")
def listar_contas(repo: Repo):
    return repo.contas.listar()


@router.post("", response_model=ContaFixa, status_code=status.HTTP_201_CREATED, summary="Cadastrar conta")
def criar_conta(dados: ContaFixaEntrada, repo: Repo):
    return repo.contas.criar(dados)


@router.put("/{id}", response_model=ContaFixa, summary="Editar conta")
def atualizar_conta(id: int, dados: ContaFixaEntrada, repo: Repo):
    conta = repo.contas.atualizar(id, dados)
    if conta is None:
        raise _nao_encontrada(id)
    return conta


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Apagar conta")
def remover_conta(id: int, repo: Repo):
    if not repo.contas.remover(id):
        raise _nao_encontrada(id)
