"""Junta o motor de cálculo com os dados cadastrados para responder à calculadora.

O motor (app/core/precificacao.py) só conhece números. Aqui os números são tirados
da configuração, das contas, dos materiais e dos serviços.
"""

from dataclasses import dataclass

from app.core import precificacao as p
from app.db.repositorio import Repositorio
from app.models.schemas import Analise, AnaliseServico, Material, Resumo, Servico


def analisar(
    meta: float,
    horas: float,
    taxa_cartao: float,
    material: float,
    outros_gastos: float,
    minutos: float,
    preco_cobrado: float,
) -> Analise:
    """Calcula tudo sobre um atendimento. Arredonda para centavos só no final."""
    gasto = p.gasto_por_atendimento(material, outros_gastos)
    parte = p.parte_da_meta(meta, horas, minutos)
    minimo = p.preco_minimo(gasto, parte, taxa_cartao)
    sobra = p.sobra_por_atendimento(preco_cobrado, gasto, taxa_cartao)
    taxa_no_preco = preco_cobrado * taxa_cartao / 100

    return Analise(
        material=p.arredondar_moeda(material),
        outros_gastos=p.arredondar_moeda(outros_gastos),
        gasto=p.arredondar_moeda(gasto),
        parte_da_meta=p.arredondar_moeda(parte),
        taxa_no_minimo=p.arredondar_moeda(minimo * taxa_cartao / 100),
        preco_minimo=p.arredondar_moeda(minimo),
        capacidade=p.capacidade_mensal(horas, minutos),
        preco_cobrado=p.arredondar_moeda(preco_cobrado),
        taxa_no_preco=p.arredondar_moeda(taxa_no_preco),
        valor_liquido=p.arredondar_moeda(preco_cobrado - taxa_no_preco),
        sobra=p.arredondar_moeda(sobra),
        ganho_por_hora=p.arredondar_moeda(p.ganho_por_hora(sobra, minutos)),
        atendimentos_necessarios=p.atendimentos_necessarios(meta, sobra) if sobra > 0 else None,
        desconto_maximo=p.arredondar_moeda(p.desconto_maximo(preco_cobrado, minimo)),
    )


@dataclass
class Contexto:
    """Dados do mês lidos uma vez só, para não consultar o banco a cada serviço."""

    meta: float
    horas: float
    total_contas: float
    taxa_cartao: float
    materiais: dict[int, Material]


def carregar_contexto(repo: Repositorio) -> Contexto:
    config = repo.configuracao
    total_contas = sum(c.valor for c in repo.contas.listar())
    return Contexto(
        meta=p.meta_mensal(config.salario, total_contas, config.reserva),
        horas=p.horas_de_atendimento(config.dias_por_mes, config.horas_por_dia),
        total_contas=total_contas,
        taxa_cartao=config.taxa_cartao,
        materiais={m.id: m for m in repo.materiais.listar()},
    )


def custo_material_do_servico(servico: Servico, materiais: dict[int, Material]) -> float:
    itens = [
        (p.custo_por_uso(materiais[i.material_id].preco, materiais[i.material_id].rendimento), i.quantidade)
        for i in servico.materiais
        if i.material_id in materiais
    ]
    return p.custo_material(itens)


def analisar_servico(servico: Servico, repo: Repositorio, contexto: Contexto | None = None) -> AnaliseServico:
    contexto = contexto or carregar_contexto(repo)
    analise = analisar(
        meta=contexto.meta,
        horas=contexto.horas,
        taxa_cartao=contexto.taxa_cartao,
        material=custo_material_do_servico(servico, contexto.materiais),
        outros_gastos=servico.outros_gastos,
        minutos=servico.minutos,
        preco_cobrado=servico.preco_cobrado,
    )
    return AnaliseServico(servico_id=servico.id, nome=servico.nome, **analise.model_dump())


def resumo(repo: Repositorio) -> Resumo:
    contexto = carregar_contexto(repo)
    return Resumo(
        meta=p.arredondar_moeda(contexto.meta),
        total_contas=p.arredondar_moeda(contexto.total_contas),
        horas_de_atendimento=contexto.horas,
        valor_da_hora=p.arredondar_moeda(p.valor_da_hora(contexto.meta, contexto.horas)),
        servicos=[analisar_servico(s, repo, contexto) for s in repo.servicos.listar()],
    )
