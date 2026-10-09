"""Materiais: o que se compra para os atendimentos e quanto custa cada uso."""

from fastapi import APIRouter, HTTPException, status

from app.db.repositorio import Repo
from app.models.schemas import Material, MaterialEntrada

router = APIRouter(prefix="/materiais", tags=["Materiais"])


def _nao_encontrado(id: int) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"Material {id} não encontrado.")


@router.get("", response_model=list[Material], summary="Listar materiais")
def listar_materiais(repo: Repo):
    return repo.materiais.listar()


@router.post("", response_model=Material, status_code=status.HTTP_201_CREATED, summary="Cadastrar material")
def criar_material(dados: MaterialEntrada, repo: Repo):
    return repo.materiais.criar(dados)


@router.put("/{id}", response_model=Material, summary="Editar material")
def atualizar_material(id: int, dados: MaterialEntrada, repo: Repo):
    material = repo.materiais.atualizar(id, dados)
    if material is None:
        raise _nao_encontrado(id)
    return material


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Apagar material")
def remover_material(id: int, repo: Repo):
    """Não deixa apagar um material usado em algum serviço."""
    if repo.materiais.obter(id) is None:
        raise _nao_encontrado(id)
    if repo.material_em_uso(id):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Este material é usado em algum serviço. Remova-o do serviço antes.",
        )
    repo.materiais.remover(id)
