from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Gestão de Valor API",
    description="API do sistema de precificação para prestadores de serviços.",
    version="0.1.0",
    license_info={"name": "GPL-3.0", "url": "https://www.gnu.org/licenses/gpl-3.0.html"},
)

# Em produção, trocar "*" pelo endereço do frontend publicado.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Sistema"])
def health():
    """Verifica se a API está no ar."""
    return {"status": "ok"}
