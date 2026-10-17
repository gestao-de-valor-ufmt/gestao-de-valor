"""Ações sobre a conta inteira do usuário: carregar o exemplo ou começar do zero."""

from fastapi import APIRouter, status

from app.auth import Usuario
from app.db.exemplo import preencher_com_exemplo
from app.db.repositorio import Repo, apagar_tudo

router = APIRouter(prefix="/conta", tags=["Conta"])


@router.get("", summary="Quem está logado")
def quem_sou(uid: Usuario):
    """Devolve o identificador (uid) do usuário do token."""
    return {"uid": uid}


@router.post("/exemplo", status_code=status.HTTP_204_NO_CONTENT, summary="Carregar o exemplo da manicure")
def carregar_exemplo(repo: Repo):
    """Apaga os dados do usuário e coloca o exemplo da manicure a domicílio no lugar."""
    preencher_com_exemplo(repo)


@router.delete("/dados", status_code=status.HTTP_204_NO_CONTENT, summary="Apagar todos os meus dados")
def apagar_dados(repo: Repo):
    """Apaga contas, materiais e serviços, e volta a configuração do mês ao início."""
    apagar_tudo(repo)
