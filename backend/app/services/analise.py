"""Junta o motor de cálculo com os dados cadastrados para responder à calculadora.

O motor (app/core/precificacao.py) só conhece números. Aqui os números são tirados
da configuração, das contas, dos materiais e dos serviços.
"""

from app.core import precificacao as p
from app.db.repositorio import RepositorioMemoria
from app.models.schemas import Analise, AnaliseServico, Resumo, Servico


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
        atendimentos_necessarios=p.atendimentos_necessarios(meta, sobra) if sobra > 0 else None,
        desconto_maximo=p.arredondar_moeda(p.desconto_maximo(preco_cobrado, minimo)),
    )


def meta_e_horas(repo: RepositorioMemoria) -> tuple[float, float, float]:
    """Meta do mês, horas de atendimento e total de contas, a partir do que está cadastrado."""
    config = repo.configuracao
    total_contas = sum(c.valor for c in repo.contas.listar())
    meta = p.meta_mensal(config.salario, total_contas, config.reserva)
    horas = p.horas_de_atendimento(config.dias_por_mes, config.horas_por_dia)
    return meta, horas, total_contas


def custo_material_do_servico(servico: Servico, repo: RepositorioMemoria) -> float:
    itens = []
    for item in servico.materiais:
        material = repo.materiais.obter(item.material_id)
        if material is not None:
            itens.append((p.custo_por_uso(material.preco, material.rendimento), item.quantidade))
    return p.custo_material(itens)


def analisar_servico(servico: Servico, repo: RepositorioMemoria) -> AnaliseServico:
    meta, horas, _ = meta_e_horas(repo)
    analise = analisar(
        meta=meta,
        horas=horas,
        taxa_cartao=repo.configuracao.taxa_cartao,
        material=custo_material_do_servico(servico, repo),
        outros_gastos=servico.outros_gastos,
        minutos=servico.minutos,
        preco_cobrado=servico.preco_cobrado,
    )
    return AnaliseServico(servico_id=servico.id, nome=servico.nome, **analise.model_dump())


def resumo(repo: RepositorioMemoria) -> Resumo:
    meta, horas, total_contas = meta_e_horas(repo)
    return Resumo(
        meta=p.arredondar_moeda(meta),
        total_contas=p.arredondar_moeda(total_contas),
        horas_de_atendimento=horas,
        valor_da_hora=p.arredondar_moeda(p.valor_da_hora(meta, horas)),
        servicos=[analisar_servico(s, repo) for s in repo.servicos.listar()],
    )
