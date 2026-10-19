"""Ações sobre a conta inteira do usuário: privacidade (LGPD), exemplo, recomeçar e excluir a conta."""

from fastapi import APIRouter, HTTPException, status

from app.auth import Usuario, login_obrigatorio
from app.db.exemplo import preencher_com_exemplo
from app.db.repositorio import Repo, apagar_tudo, esquecer_usuario_da_memoria
from app.models.schemas import Aceite, AceiteEntrada, Conta

router = APIRouter(prefix="/conta", tags=["Conta"])


@router.get("", response_model=Conta, summary="Quem está logado")
def quem_sou(uid: Usuario, repo: Repo):
    """Devolve o identificador (uid) do usuário e o aceite da Política de Privacidade."""
    return Conta(uid=uid, privacidade=repo.aceite_privacidade())


@router.post("/privacidade", response_model=Aceite, summary="Registrar aceite da Política de Privacidade")
def aceitar_privacidade(dados: AceiteEntrada, repo: Repo):
    """Guarda a versão da política aceita e a data, como prova do consentimento (LGPD).

    Aceitar de novo a mesma versão não muda a data do primeiro aceite.
    """
    return repo.registrar_aceite(dados.versao)


@router.post("/exemplo", status_code=status.HTTP_204_NO_CONTENT, summary="Carregar o exemplo da manicure")
def carregar_exemplo(repo: Repo):
    """Apaga os dados do usuário e coloca o exemplo da manicure a domicílio no lugar."""
    preencher_com_exemplo(repo)


@router.delete("/dados", status_code=status.HTTP_204_NO_CONTENT, summary="Apagar todos os meus dados")
def apagar_dados(repo: Repo):
    """Apaga contas, materiais e serviços, e volta a configuração do mês ao início. A conta continua existindo."""
    apagar_tudo(repo)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT, summary="Excluir minha conta")
def excluir_conta(uid: Usuario, repo: Repo):
    """Exclui a conta de vez (direito de eliminação da LGPD).

    Apaga todos os dados guardados no banco e depois o próprio login no Firebase Authentication.
    Não pode ser desfeito.
    """
    repo.apagar_conta()
    esquecer_usuario_da_memoria(uid)

    if login_obrigatorio():
        from firebase_admin import auth

        from app.db.firebase import iniciar_firebase

        iniciar_firebase()
        try:
            auth.delete_user(uid)
        except auth.UserNotFoundError:
            pass  # o login já não existia: nada a fazer
        except Exception:
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                "Seus dados foram apagados, mas não foi possível excluir o login. Tente de novo.",
            )
