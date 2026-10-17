from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import configuracoes
from app.routers import calculadora, conta, configuracao, contas, materiais, servicos

app = FastAPI(
    title="Gestão de Valor API",
    description=(
        "API do sistema de precificação para prestadores de serviços.\n\n"
        "**Login:** os endpoints com cadeado exigem o token de login do Firebase. "
        "Clique em **Authorize** e cole o token (sem a palavra Bearer). "
        "A simulação e a estimativa de rendimento funcionam sem login.\n\n"
        "Cada usuário vê e altera só os próprios dados."
    ),
    version="0.3.0",
    license_info={"name": "GPL-3.0", "url": "https://www.gnu.org/licenses/gpl-3.0.html"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=configuracoes.origens_permitidas,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(conta.router)
app.include_router(configuracao.router)
app.include_router(contas.router)
app.include_router(materiais.router)
app.include_router(servicos.router)
app.include_router(calculadora.router)


@app.exception_handler(ValueError)
def erro_de_calculo(request: Request, erro: ValueError):
    """As validações do motor de cálculo viram resposta 422 com a mensagem em português."""
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, content={"detail": str(erro)})


@app.get("/health", tags=["Sistema"], summary="Verificar se a API está no ar")
def health():
    """Verifica se a API está no ar."""
    return {"status": "ok", "armazenamento": configuracoes.armazenamento}
