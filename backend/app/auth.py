"""Quem está fazendo o pedido.

O site faz o login pelo Firebase Authentication, recebe um token (JWT) e o envia em
cada pedido no cabeçalho "Authorization: Bearer <token>". Aqui a API confere a
assinatura e a validade do token com o Firebase e descobre o uid da pessoa.

Convite: só usa o sistema quem resgatou um código de convite. Isso fica gravado no
próprio token (custom claim "convite"), então conferir não custa nenhuma leitura no banco.

Com AUTENTICACAO=desligada (só para desenvolvimento), todo pedido vale como "demo", já com convite.
"""

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import configuracoes

USUARIO_DEMO = "demo"
SEM_CONVITE = "Esta conta ainda não tem um convite válido. Informe o seu código de convite."

_bearer = HTTPBearer(auto_error=False, description="Token de login (ID token) do Firebase Authentication.")


@dataclass(frozen=True)
class Sessao:
    uid: str
    tem_convite: bool


def sessao_atual(
    credencial: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> Sessao:
    """Dependência do FastAPI: confere o token e devolve quem fez o pedido, ou responde 401."""
    if not configuracoes.autenticacao:
        return Sessao(uid=USUARIO_DEMO, tem_convite=True)

    if credencial is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Faça login para continuar.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    from firebase_admin import auth

    from app.db.firebase import iniciar_firebase

    iniciar_firebase()
    try:
        dados = auth.verify_id_token(credencial.credentials)
    except Exception:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Sessão inválida ou expirada. Faça login de novo.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Sessao(uid=dados["uid"], tem_convite=dados.get("convite") is True)


def usuario_atual(sessao: Annotated[Sessao, Depends(sessao_atual)]) -> str:
    """O uid de quem fez o pedido, com ou sem convite (para resgatar o convite ou excluir a conta)."""
    return sessao.uid


def usuario_com_convite(sessao: Annotated[Sessao, Depends(sessao_atual)]) -> str:
    """O uid de quem fez o pedido, exigindo convite resgatado; sem ele, responde 403."""
    if not sessao.tem_convite:
        raise HTTPException(status.HTTP_403_FORBIDDEN, SEM_CONVITE)
    return sessao.uid


def login_obrigatorio() -> bool:
    """Se o login do Firebase está em uso (False só em desenvolvimento, com o usuário "demo")."""
    return configuracoes.autenticacao


def liberar_no_login(uid: str) -> None:
    """Grava a marca de convite no login da pessoa (vale a partir do próximo token)."""
    if not login_obrigatorio():
        return
    from firebase_admin import auth

    from app.db.firebase import iniciar_firebase

    iniciar_firebase()
    marcas = auth.get_user(uid).custom_claims or {}
    auth.set_custom_user_claims(uid, {**marcas, "convite": True})


# Atalhos para os endpoints: "uid: Usuario" (qualquer conta logada) e "uid: UsuarioLiberado" (com convite).
SessaoAtual = Annotated[Sessao, Depends(sessao_atual)]
Usuario = Annotated[str, Depends(usuario_atual)]
UsuarioLiberado = Annotated[str, Depends(usuario_com_convite)]
