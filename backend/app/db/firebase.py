"""Conexão com o Firebase (Firestore e Authentication), feita uma única vez.

A credencial é a chave da conta de serviço: um JSON secreto que nunca vai para o GitHub.
- No computador: arquivo backend/firebase-service-account.json, apontado por
  GOOGLE_APPLICATION_CREDENTIALS no .env.
- No Render: o conteúdo do JSON numa variável secreta FIREBASE_CREDENCIAIS_JSON.
"""

import json
import os
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials, firestore


@lru_cache
def iniciar_firebase() -> firebase_admin.App:
    conteudo = os.getenv("FIREBASE_CREDENCIAIS_JSON")
    if conteudo:
        credencial = credentials.Certificate(json.loads(conteudo))
    else:
        caminho = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if not caminho or not os.path.exists(caminho):
            raise RuntimeError(
                "Credencial do Firebase não encontrada. Defina FIREBASE_CREDENCIAIS_JSON "
                "ou GOOGLE_APPLICATION_CREDENTIALS (veja backend/.env.example)."
            )
        credencial = credentials.Certificate(caminho)
    return firebase_admin.initialize_app(credencial)


@lru_cache
def cliente_firestore():
    iniciar_firebase()
    return firestore.client()
