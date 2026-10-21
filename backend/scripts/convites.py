"""Gerenciador de convites do Gestão de Valor (uso da equipe, no computador).

Precisa da chave do Firebase em backend/firebase-service-account.json (veja backend/.env.example).
Rode de dentro da pasta backend, com o ambiente virtual ativado:

    python scripts/convites.py gerar --quantidade 10 --nota "evento 25/10"
    python scripts/convites.py listar
    python scripts/convites.py contas
    python scripts/convites.py liberar --email pessoa@exemplo.com
    python scripts/convites.py liberar --todas-existentes

Cada código vale para UMA conta e não vence. Quem usa um código ganha a marca "convite"
no login (custom claim do Firebase), que a API confere a cada pedido.
"""

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Permite importar o pacote "app" rodando o script de dentro de backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()
os.environ.setdefault("GOOGLE_APPLICATION_CREDENTIALS", "./firebase-service-account.json")

from firebase_admin import auth  # noqa: E402

from app.db.convites import gerar_codigo  # noqa: E402
from app.db.firebase import cliente_firestore, iniciar_firebase  # noqa: E402

LIBERADO_MANUALMENTE = "LIBERADO-MANUALMENTE"


def _data(valor) -> str:
    return valor.astimezone().strftime("%d/%m/%Y %H:%M") if valor else "-"


def _email(uid: str) -> str:
    try:
        return auth.get_user(uid).email or uid
    except auth.UserNotFoundError:
        return f"{uid} (conta excluída)"


def gerar(quantidade: int, nota: str) -> None:
    colecao = cliente_firestore().collection("convites")
    criados = []
    while len(criados) < quantidade:
        codigo = gerar_codigo()
        referencia = colecao.document(codigo)
        if referencia.get().exists:
            continue  # raríssimo: o código sorteado já existe
        referencia.set({"criado_em": datetime.now(timezone.utc), "nota": nota, "usado_por": None, "usado_em": None})
        criados.append(codigo)
    print(f"{len(criados)} código(s) criado(s){f' ({nota})' if nota else ''}. Cada um vale para uma pessoa:\n")
    for codigo in criados:
        print(f"  {codigo}")


def listar() -> None:
    documentos = sorted(cliente_firestore().collection("convites").stream(), key=lambda d: d.to_dict()["criado_em"])
    if not documentos:
        print("Nenhum código gerado ainda.")
        return
    livres = 0
    for doc in documentos:
        dados = doc.to_dict()
        if dados.get("usado_por"):
            situacao = f"usado por {_email(dados['usado_por'])} em {_data(dados.get('usado_em'))}"
        else:
            situacao = "LIVRE"
            livres += 1
        nota = f" [{dados['nota']}]" if dados.get("nota") else ""
        print(f"{doc.id}  criado {_data(dados['criado_em'])}{nota}  →  {situacao}")
    print(f"\n{len(documentos)} código(s), {livres} livre(s).")


def contas() -> None:
    total = sem_convite = 0
    for usuario in auth.list_users().iterate_all():
        total += 1
        liberada = (usuario.custom_claims or {}).get("convite") is True
        sem_convite += not liberada
        print(f"{'com convite' if liberada else 'SEM CONVITE'}  {usuario.email or usuario.uid}")
    print(f"\n{total} conta(s), {sem_convite} sem convite.")


def _liberar(usuario) -> None:
    marcas = usuario.custom_claims or {}
    if marcas.get("convite") is True:
        print(f"já liberada: {usuario.email}")
        return
    auth.set_custom_user_claims(usuario.uid, {**marcas, "convite": True})
    cliente_firestore().collection("usuarios").document(usuario.uid).set(
        {"convite": {"codigo": LIBERADO_MANUALMENTE, "usado_em": datetime.now(timezone.utc)}}, merge=True
    )
    print(f"liberada: {usuario.email}")


def liberar(email: str | None, todas: bool) -> None:
    if todas:
        for usuario in auth.list_users().iterate_all():
            _liberar(usuario)
    else:
        try:
            _liberar(auth.get_user_by_email(email))
        except auth.UserNotFoundError:
            print(f"Nenhuma conta com o e-mail {email}.")
            return
    print("A liberação vale no próximo acesso (ou em até 1 hora, quando o login se renova).")


def main() -> None:
    parser = argparse.ArgumentParser(description="Convites do Gestão de Valor")
    comandos = parser.add_subparsers(dest="comando", required=True)
    p_gerar = comandos.add_parser("gerar", help="cria códigos novos")
    p_gerar.add_argument("--quantidade", type=int, default=1)
    p_gerar.add_argument("--nota", default="", help="para lembrar a quem foram dados")
    comandos.add_parser("listar", help="mostra os códigos e quem usou cada um")
    comandos.add_parser("contas", help="mostra as contas e se cada uma tem convite")
    p_liberar = comandos.add_parser("liberar", help="libera uma conta sem pedir código")
    grupo = p_liberar.add_mutually_exclusive_group(required=True)
    grupo.add_argument("--email")
    grupo.add_argument("--todas-existentes", action="store_true")
    argumentos = parser.parse_args()

    iniciar_firebase()
    if argumentos.comando == "gerar":
        gerar(max(1, argumentos.quantidade), argumentos.nota)
    elif argumentos.comando == "listar":
        listar()
    elif argumentos.comando == "contas":
        contas()
    else:
        liberar(argumentos.email, argumentos.todas_existentes)


if __name__ == "__main__":
    main()
