"""Calculadora: resumo do painel, simulação avulsa e estimativa de rendimento."""

import math

from fastapi import APIRouter

from app.core import precificacao as p
from app.db.repositorio import Repo
from app.models.schemas import Analise, RendimentoEntrada, RendimentoSaida, Resumo, SimulacaoEntrada
from app.services import analise

router = APIRouter(prefix="/calculadora", tags=["Calculadora"])


@router.get("/resumo", response_model=Resumo, summary="Resumo do painel")
def resumo(repo: Repo):
    """Números do painel: meta do mês, valor da hora e a análise de cada serviço."""
    return analise.resumo(repo)


@router.post("/simular", response_model=Analise, summary="Simular sem cadastrar")
def simular(dados: SimulacaoEntrada):
    """Calcula sem cadastrar nada: recebe todos os números de uma vez."""
    meta = p.meta_mensal(dados.salario, dados.contas_fixas, dados.reserva)
    horas = p.horas_de_atendimento(dados.dias_por_mes, dados.horas_por_dia)
    return analise.analisar(
        meta=meta,
        horas=horas,
        taxa_cartao=dados.taxa_cartao,
        material=dados.material,
        outros_gastos=dados.outros_gastos,
        minutos=dados.minutos,
        preco_cobrado=dados.preco_cobrado,
    )


@router.post("/rendimento", response_model=RendimentoSaida, summary="Estimar rendimento de material")
def rendimento(dados: RendimentoEntrada):
    """Estima quanto uma embalagem rende pelo tempo que ela dura."""
    estimado = p.rendimento_estimado(dados.duracao, dados.atendimentos_por_periodo)
    # Arredonda com "0,5 sobe", igual ao Math.round() do site (o round() do Python faria 2,5 → 2).
    return RendimentoSaida(rendimento_estimado=max(1, math.floor(estimado + 0.5)))
