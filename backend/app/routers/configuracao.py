"""Seu mês: salário, reserva, dias e horas de atendimento, taxa da maquininha."""

from fastapi import APIRouter

from app.db.repositorio import Repo
from app.models.schemas import Configuracao

router = APIRouter(prefix="/configuracao", tags=["Seu mês"])


@router.get("", response_model=Configuracao, summary="Ver configuração do mês")
def obter_configuracao(repo: Repo):
    """Mostra a configuração atual."""
    return repo.configuracao


@router.put("", response_model=Configuracao, summary="Salvar configuração do mês")
def salvar_configuracao(dados: Configuracao, repo: Repo):
    """Substitui a configuração inteira."""
    repo.configuracao = dados
    return repo.configuracao
