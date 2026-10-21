"""Códigos de convite: cada código vale para uma única conta e não vence.

Estrutura no Firestore:
    convites/{codigo} → criado_em, nota, usado_por (uid ou nulo), usado_em

Quem resgata um código ganha a marca "convite" no próprio token de login (custom claim
do Firebase). Assim a API confere o convite sem ler o banco a cada pedido.
Os códigos são gerados pelo script backend/scripts/convites.py.
"""

import re
import secrets
from datetime import datetime, timezone

from app.config import configuracoes

# Sem 0/O, 1/I/L e U/V, que se confundem ao digitar
ALFABETO = "23456789ABCDEFGHJKMNPQRSTWXYZ"
FORMATO = re.compile(r"^GV-[2-9A-HJKMNP-TW-Z]{4}-[2-9A-HJKMNP-TW-Z]{4}$")


class ConviteInvalido(Exception):
    """Código que não existe."""


class ConviteJaUsado(Exception):
    """Código que já foi usado por outra conta."""


def gerar_codigo() -> str:
    parte = lambda: "".join(secrets.choice(ALFABETO) for _ in range(4))  # noqa: E731
    return f"GV-{parte()}-{parte()}"


def normalizar(codigo: str) -> str:
    """Aceita o código com ou sem traços, em minúsculas ou com espaços: 'gv 7k3m q9xp' → 'GV-7K3M-Q9XP'."""
    letras = re.sub(r"[^0-9A-Za-z]", "", codigo).upper()
    if letras.startswith("GV"):
        letras = letras[2:]
    return f"GV-{letras[:4]}-{letras[4:]}" if len(letras) == 8 else codigo.strip().upper()


# ---------- Memória (testes e desenvolvimento) ----------

_memoria: dict[str, dict] = {}


def criar_em_memoria(codigo: str, nota: str = "") -> None:
    _memoria[codigo] = {"criado_em": datetime.now(timezone.utc), "nota": nota, "usado_por": None, "usado_em": None}


def _resgatar_memoria(codigo: str, uid: str) -> None:
    convite = _memoria.get(codigo)
    if convite is None:
        raise ConviteInvalido
    if convite["usado_por"] not in (None, uid):
        raise ConviteJaUsado
    if convite["usado_por"] is None:
        convite.update(usado_por=uid, usado_em=datetime.now(timezone.utc))


# ---------- Firestore ----------

def _resgatar_firestore(codigo: str, uid: str) -> None:
    from google.cloud import firestore

    from app.db.firebase import cliente_firestore

    cliente = cliente_firestore()
    convite_ref = cliente.collection("convites").document(codigo)
    usuario_ref = cliente.collection("usuarios").document(uid)

    @firestore.transactional
    def resgatar(transacao):
        convite = convite_ref.get(transaction=transacao)
        if not convite.exists:
            raise ConviteInvalido
        usado_por = (convite.to_dict() or {}).get("usado_por")
        if usado_por not in (None, uid):
            raise ConviteJaUsado
        if usado_por is None:
            agora = datetime.now(timezone.utc)
            transacao.update(convite_ref, {"usado_por": uid, "usado_em": agora})
            transacao.set(usuario_ref, {"convite": {"codigo": codigo, "usado_em": agora}}, merge=True)

    resgatar(cliente.transaction())


def resgatar(codigo: str, uid: str) -> None:
    """Marca o código como usado por esta conta. Usar de novo o próprio código não dá erro.

    A transação garante que duas pessoas não usem o mesmo código ao mesmo tempo.
    """
    codigo = normalizar(codigo)
    if not FORMATO.match(codigo):
        raise ConviteInvalido
    if configuracoes.armazenamento == "firestore":
        _resgatar_firestore(codigo, uid)
    else:
        _resgatar_memoria(codigo, uid)
