"""Formato dos dados que entram e saem da API.

O Pydantic confere cada campo automaticamente: se alguém mandar um salário negativo
ou um tempo de atendimento zero, a API responde com erro 422 explicando o problema.
Os mesmos modelos geram a documentação do Swagger (/docs).
"""

from pydantic import BaseModel, Field, computed_field

from app.core.precificacao import arredondar_moeda, custo_por_uso

# ---------- Seu mês ----------


class Configuracao(BaseModel):
    salario: float = Field(ge=0, description="Quanto a pessoa quer ganhar por mês (R$).")
    reserva: float = Field(0, ge=0, description="Reserva mensal para emergências e investimentos (R$).")
    dias_por_mes: float = Field(gt=0, le=31, description="Dias de trabalho por mês.")
    horas_por_dia: float = Field(gt=0, le=24, description="Horas atendendo por dia, contando o deslocamento.")
    taxa_cartao: float = Field(0, ge=0, lt=100, description="Taxa da maquininha (%). 0 para dinheiro ou Pix.")


# ---------- Contas fixas ----------


class ContaFixaEntrada(BaseModel):
    nome: str = Field(min_length=1, max_length=100, examples=["DAS MEI"])
    valor: float = Field(ge=0, description="Valor por mês (R$).", examples=[75.90])


class ContaFixa(ContaFixaEntrada):
    id: int


# ---------- Materiais ----------


class MaterialEntrada(BaseModel):
    nome: str = Field(min_length=1, max_length=100, examples=["Esmalte"])
    embalagem: str = Field("", max_length=100, examples=["Frasco 8 ml"])
    preco: float = Field(ge=0, description="Preço pago na embalagem (R$).", examples=[12])
    rendimento: float = Field(gt=0, description="Quantos usos a embalagem rende.", examples=[20])


class Material(MaterialEntrada):
    id: int

    @computed_field(description="Quanto custa cada uso (R$).")
    @property
    def custo_por_uso(self) -> float:
        return arredondar_moeda(custo_por_uso(self.preco, self.rendimento))


# ---------- Serviços ----------


class ItemMaterial(BaseModel):
    material_id: int
    quantidade: float = Field(gt=0, examples=[1])


class ServicoEntrada(BaseModel):
    nome: str = Field(min_length=1, max_length=100, examples=["Manicure"])
    minutos: float = Field(gt=0, description="Tempo do atendimento, contando o deslocamento.", examples=[60])
    outros_gastos: float = Field(0, ge=0, description="Deslocamento, gás, detergente… (R$).", examples=[2])
    preco_cobrado: float = Field(0, ge=0, description="Quanto a pessoa cobra hoje (R$).", examples=[40])
    materiais: list[ItemMaterial] = Field(default_factory=list)


class Servico(ServicoEntrada):
    id: int


# ---------- Resultados ----------


class Analise(BaseModel):
    """Resposta da calculadora. Valores em R$, já arredondados para centavos."""

    material: float = Field(description="Custo do material de um atendimento.")
    outros_gastos: float
    gasto: float = Field(description="Material + outros gastos.")
    parte_da_meta: float = Field(description="Quanto o atendimento contribui para salário e contas.")
    taxa_no_minimo: float = Field(description="Taxa da maquininha embutida no preço mínimo.")
    preco_minimo: float = Field(description="Cobre pelo menos este valor.")
    capacidade: int = Field(description="Quantos atendimentos cabem no mês.")
    preco_cobrado: float
    taxa_no_preco: float = Field(description="Quanto a maquininha desconta do preço cobrado.")
    valor_liquido: float = Field(description="Quanto a pessoa recebe de fato, depois da maquininha.")
    sobra: float = Field(description="Quanto fica de cada atendimento depois de gastos e taxa.")
    atendimentos_necessarios: int | None = Field(
        description="Atendimentos por mês para bater a meta. Nulo se o preço não cobre os gastos."
    )
    desconto_maximo: float = Field(description="Desconto possível sem mexer no salário. Negativo: preço abaixo do mínimo.")


class AnaliseServico(Analise):
    servico_id: int
    nome: str


class Resumo(BaseModel):
    """Números do painel."""

    meta: float = Field(description="Salário + contas + reserva.")
    total_contas: float
    horas_de_atendimento: float
    valor_da_hora: float = Field(description="Quanto cada hora atendendo precisa render.")
    servicos: list[AnaliseServico]


class SimulacaoEntrada(BaseModel):
    """Todos os dados de uma vez, para calcular sem cadastrar nada."""

    salario: float = Field(ge=0, examples=[2500])
    contas_fixas: float = Field(0, ge=0, examples=[185.90])
    reserva: float = Field(0, ge=0)
    dias_por_mes: float = Field(gt=0, le=31, examples=[22])
    horas_por_dia: float = Field(gt=0, le=24, examples=[6])
    taxa_cartao: float = Field(0, ge=0, lt=100)
    material: float = Field(ge=0, description="Custo do material de um atendimento (R$).", examples=[3.72])
    outros_gastos: float = Field(0, ge=0, examples=[2])
    minutos: float = Field(gt=0, examples=[60])
    preco_cobrado: float = Field(0, ge=0, examples=[40])


class RendimentoEntrada(BaseModel):
    duracao: float = Field(gt=0, description="Quanto tempo a embalagem durou.", examples=[2])
    atendimentos_por_periodo: float = Field(
        gt=0, description="Atendimentos feitos por período (mesma unidade da duração).", examples=[10]
    )


class RendimentoSaida(BaseModel):
    rendimento_estimado: int
