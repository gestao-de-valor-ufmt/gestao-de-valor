"""Configurações da API, lidas de variáveis de ambiente (ou do arquivo backend/.env).

ARMAZENAMENTO
    "memoria"   → dados na memória do servidor (padrão; usado nos testes).
    "firestore" → dados no Google Cloud Firestore.

AUTENTICACAO
    "ligada"    → exige o token de login do Firebase em cada pedido (padrão).
    "desligada" → todo pedido vale como o usuário "demo" (só para desenvolvimento).

Credenciais do Firebase (necessárias com ARMAZENAMENTO=firestore ou AUTENTICACAO=ligada):
    FIREBASE_CREDENCIAIS_JSON        → conteúdo do JSON da conta de serviço (usado no Render).
    GOOGLE_APPLICATION_CREDENTIALS   → caminho do arquivo JSON (usado no computador local).

ORIGENS_PERMITIDAS
    Endereços do site que podem chamar a API, separados por vírgula. "*" libera todos.
"""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Configuracoes:
    armazenamento: str
    autenticacao: bool
    origens_permitidas: list[str]


def carregar() -> Configuracoes:
    armazenamento = os.getenv("ARMAZENAMENTO", "memoria").strip().lower()
    if armazenamento not in ("memoria", "firestore"):
        raise RuntimeError(f"ARMAZENAMENTO inválido: {armazenamento!r}. Use 'memoria' ou 'firestore'.")
    autenticacao = os.getenv("AUTENTICACAO", "ligada").strip().lower() != "desligada"
    origens = [o.strip() for o in os.getenv("ORIGENS_PERMITIDAS", "*").split(",") if o.strip()]
    return Configuracoes(armazenamento=armazenamento, autenticacao=autenticacao, origens_permitidas=origens)


configuracoes = carregar()
