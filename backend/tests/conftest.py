"""Preparação comum dos testes: roda tudo na memória, sem Firestore e sem login obrigatório.

As variáveis são definidas antes de a API ser importada; o load_dotenv() não sobrescreve
variáveis que já existem, então um backend/.env local não interfere nos testes.
"""

import os

os.environ["ARMAZENAMENTO"] = "memoria"
os.environ["AUTENTICACAO"] = "desligada"
os.environ["ORIGENS_PERMITIDAS"] = "*"
