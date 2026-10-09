"""Serviços: o "cardápio", com material, tempo, deslocamento e preço cobrado."""

from fastapi import APIRouter, HTTPException, status

from app.db.repositorio import Repo
from app.models.schemas import AnaliseServico, Servico, ServicoEntrada
from app.services.analise import analisar_servico

router = APIRouter(prefix="/servicos", tags=["Serviços"])


def _nao_encontrado(id: int) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"Serviço {id} não encontrado.")


def _conferir_materiais(dados: ServicoEntrada, repo: Repo) -> None:
    faltando = [i.material_id for i in dados.materiais if repo.materiais.obter(i.material_id) is None]
    if faltando:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"Material não encontrado: {', '.join(map(str, faltando))}.",
        )


@router.get("", response_model=list[Servico], summary="Listar serviços")
def listar_servicos(repo: Repo):
    return repo.servicos.listar()


@router.post("", response_model=Servico, status_code=status.HTTP_201_CREATED, summary="Cadastrar serviço")
def criar_servico(dados: ServicoEntrada, repo: Repo):
    _conferir_materiais(dados, repo)
    return repo.servicos.criar(dados)


@router.put("/{id}", response_model=Servico, summary="Editar serviço")
def atualizar_servico(id: int, dados: ServicoEntrada, repo: Repo):
    _conferir_materiais(dados, repo)
    servico = repo.servicos.atualizar(id, dados)
    if servico is None:
        raise _nao_encontrado(id)
    return servico


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Apagar serviço")
def remover_servico(id: int, repo: Repo):
    if not repo.servicos.remover(id):
        raise _nao_encontrado(id)


@router.get("/{id}/analise", response_model=AnaliseServico, summary="Analisar preço do serviço")
def analisar(id: int, repo: Repo):
    """Preço mínimo, atendimentos necessários e desconto máximo deste serviço."""
    servico = repo.servicos.obter(id)
    if servico is None:
        raise _nao_encontrado(id)
    return analisar_servico(servico, repo)
