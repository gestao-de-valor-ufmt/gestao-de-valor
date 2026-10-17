"""Quem está fazendo o pedido.

O site faz o login pelo Firebase Authentication, recebe um token (JWT) e o envia em
cada pedido no cabeçalho "Authorization: Bearer <token>". Aqui a API confere a
assinatura e a validade do token com o Firebase e descobre o uid da pessoa.

Com AUTENTICACAO=desligada (só para desenvolvimento), todo pedido vale como "demo".
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import configuracoes

USUARIO_DEMO = "demo"

_bearer = HTTPBearer(auto_error=False, description="Token de login (ID token) do Firebase Authentication.")


def usuario_atual(
    credencial: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> str:
    """Dependência do FastAPI: devolve o uid de quem fez o pedido, ou responde 401."""
    if not configuracoes.autenticacao:
        return USUARIO_DEMO

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
    return dados["uid"]


# Atalho para os endpoints: "uid: Usuario" recebe o uid automaticamente.
Usuario = Annotated[str, Depends(usuario_atual)]
