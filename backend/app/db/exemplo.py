"""Dados de exemplo: manicure a domicílio (os mesmos do protótipo em frontend/js/dados.js)."""

from app.db.repositorio import Repositorio, RepositorioMemoria, apagar_tudo
from app.models.schemas import (
    Configuracao,
    ContaFixaEntrada,
    ItemMaterial,
    MaterialEntrada,
    ServicoEntrada,
)

CONTAS = [
    ("Celular e internet", 80),
    ("DAS MEI", 75.90),
    ("Reposição de alicates e equipamentos", 30),
]

# (nome, embalagem, preço, rendimento) — nos serviços, cada material é indicado pela posição nesta lista (1 = Esmalte)
MATERIAIS = [
    ("Esmalte", "Frasco 8 ml", 12, 20),
    ("Base fortalecedora", "Frasco 8 ml", 18, 30),
    ("Extra brilho", "Frasco 8 ml", 15, 30),
    ("Acetona", "Frasco 500 ml", 14, 50),
    ("Algodão", "Pacote 500 g", 16, 200),
    ("Lixa descartável", "Pacote 50 un", 25, 50),
    ("Palito de laranjeira", "Pacote 100 un", 8, 100),
    ("Luvas descartáveis", "Caixa 100 un", 35, 50),
    ("Removedor de cutícula", "Frasco 100 ml", 12, 40),
    ("Creme hidratante", "Pote 1 kg", 30, 100),
    ("Gel UV", "Pote 15 g", 45, 25),
    ("Tips", "Caixa 500 un", 40, 50),
]

MANICURE = [(1, 1), (2, 1), (3, 1), (4, 1), (5, 2), (6, 1), (7, 1), (8, 1), (9, 1)]

# (nome, minutos, outros gastos, preço cobrado, [(posição do material, quantidade)])
SERVICOS = [
    ("Manicure", 60, 2, 40, MANICURE),
    ("Pedicure", 70, 2, 45, MANICURE + [(10, 1)]),
    ("Pé e mão", 110, 2, 75, [(1, 2), (2, 2), (3, 2), (4, 2), (5, 4), (6, 2), (7, 2), (8, 1), (9, 2), (10, 1)]),
    ("Esmaltação em gel", 80, 2, 70, [(2, 1), (11, 1), (3, 1), (6, 1), (8, 1), (5, 1)]),
    ("Alongamento em gel", 170, 2, 150, [(12, 1), (11, 2), (2, 1), (3, 1), (6, 2), (8, 1), (5, 1)]),
]


def preencher_com_exemplo(repo: Repositorio) -> None:
    """Apaga os dados do usuário e coloca o exemplo da manicure no lugar."""
    apagar_tudo(repo)
    repo.configuracao = Configuracao(salario=2500, reserva=0, dias_por_mes=22, horas_por_dia=6, taxa_cartao=0)
    for nome, valor in CONTAS:
        repo.contas.criar(ContaFixaEntrada(nome=nome, valor=valor))

    # Os ids no Firestore continuam de onde pararam, então guardamos o id real de cada material.
    ids = [
        repo.materiais.criar(MaterialEntrada(nome=nome, embalagem=embalagem, preco=preco, rendimento=rendimento)).id
        for nome, embalagem, preco, rendimento in MATERIAIS
    ]
    for nome, minutos, outros, preco, itens in SERVICOS:
        repo.servicos.criar(
            ServicoEntrada(
                nome=nome,
                minutos=minutos,
                outros_gastos=outros,
                preco_cobrado=preco,
                materiais=[ItemMaterial(material_id=ids[posicao - 1], quantidade=q) for posicao, q in itens],
            )
        )


def criar_repositorio_exemplo() -> RepositorioMemoria:
    repo = RepositorioMemoria()
    preencher_com_exemplo(repo)
    return repo
