# Fórmulas de precificação

Este documento descreve as fórmulas do sistema. A implementação fica em
[`backend/app/core/precificacao.py`](../backend/app/core/precificacao.py) e os testes em
[`backend/tests/test_precificacao.py`](../backend/tests/test_precificacao.py).

## A ideia em uma frase

Cada atendimento precisa pagar **o que ele gasta** (material e deslocamento) e **um pedaço da
meta do mês** (salário e contas). O tamanho desse pedaço depende do tempo que o atendimento leva.

O sistema responde três perguntas:

1. **Quanto preciso cobrar, no mínimo?**
2. **Cobrando o que cobro hoje, quantos atendimentos preciso fazer no mês?**
3. **Quanto posso dar de desconto sem mexer no meu salário?**

## As perguntas ao usuário

| Pergunta | Onde fica | Exemplo |
|---|---|---|
| Quanto você quer ganhar por mês? | Seu mês / Calculadora | R$ 2.500 |
| Que contas você paga todo mês? | Seu mês | R$ 185,90 (celular, DAS, reposição de equipamentos) |
| Quantos dias e horas por dia você atende? | Seu mês | 22 dias × 6 h |
| Quanto material cada serviço usa? | Materiais / Serviços | R$ 3,72 na manicure |
| Quanto gasta de deslocamento e outros? | Serviços / Calculadora | R$ 2,00 |
| Quanto tempo leva cada atendimento? | Serviços / Calculadora | 60 min, contando o deslocamento |
| Quanto você cobra hoje? | Serviços / Calculadora | R$ 40 |

## 1. Meta do mês

```
meta = salário + contas_fixas + reserva
```

- **Salário**: o que a pessoa quer levar para casa (o "pró-labore").
- **Contas fixas**: o que se paga todo mês, trabalhando ou não: DAS do MEI, celular, aluguel.
  Para equipamentos que se desgastam, guarda-se `valor_pago / meses_de_vida_útil` por mês.
- **Reserva** (opcional): dinheiro para emergências e para investir no negócio.

Exemplo: R$ 2.500 + R$ 185,90 + R$ 0 = **R$ 2.685,90**.

## 2. Quanto cada hora precisa render

```
horas_de_atendimento = dias_por_mês × horas_por_dia
valor_da_hora        = meta / horas_de_atendimento
```

Exemplo: 22 × 6 = 132 h → R$ 2.685,90 / 132 = **R$ 20,35 por hora**.

## 3. Gasto de cada atendimento

```
custo_por_uso = preço_da_embalagem / rendimento_em_usos
material      = Σ(custo_por_uso × quantidade)
gasto         = material + deslocamento_e_outros
```

**Não sabe quanto rende?** A tela de materiais tem uma calculadora rápida que estima o
rendimento pelo tempo que a embalagem dura:

```
rendimento ≈ duração × atendimentos_por_período
```

Exemplo: o esmalte dura 2 semanas e é usado em 10 atendimentos por semana → rende cerca de
**20 atendimentos**. O resultado é arredondado para o inteiro mais próximo (no mínimo 1).

- **Deslocamento e outros**: um valor por serviço para gastos difíceis de medir (gasolina,
  passagem, gás, detergente).

Exemplo (manicure): R$ 3,72 de material + R$ 2,00 de deslocamento = **R$ 5,72**.

## 4. Preço mínimo

```
parte_da_meta = valor_da_hora × (minutos / 60)
preço_mínimo  = (gasto + parte_da_meta) / (1 − taxa_maquininha / 100)
```

A taxa da maquininha é cobrada **sobre o preço**, por isso se divide. Para quem recebe em
dinheiro ou Pix, a taxa é 0 e o preço mínimo é só `gasto + parte_da_meta`.

**Por que dividir, e não somar a taxa:** para receber R$ 40 com taxa de 10%, parece que basta
cobrar R$ 44 (40 + 10%). Mas a maquininha cobra 10% **dos R$ 44**, ou seja, R$ 4,40, e sobram
R$ 39,60: faltam 40 centavos. O certo é R$ 40 / (1 − 0,10) = **R$ 44,44**; 10% disso são
R$ 4,44, e sobram exatamente R$ 40.

A calculadora mostra, para o preço cobrado, quanto a maquininha desconta e quanto a pessoa
recebe de fato (o valor líquido).

Exemplo (manicure, 60 min, sem maquininha): R$ 5,72 + R$ 20,35 = **R$ 26,07**.

## 5. Atendimentos necessários

```
sobra_por_atendimento = preço − preço × taxa_maquininha / 100 − gasto
atendimentos          = ⌈ meta / sobra_por_atendimento ⌉
capacidade            = ⌊ horas_de_atendimento × 60 / minutos ⌋
```

- Atendimentos é arredondado **para cima** (⌈ ⌉): não existe meio atendimento.
- Capacidade é arredondada **para baixo** (⌊ ⌋): é quantos atendimentos inteiros cabem no mês.
- O cálculo considera que a pessoa faz **só aquele serviço**. A tela deixa isso explícito.

Exemplo (manicure cobrando R$ 40): sobram R$ 34,28 → R$ 2.685,90 / R$ 34,28 = **79 atendimentos**,
dos 132 que cabem no mês.

**Propriedade útil:** cobrando exatamente o preço mínimo, os atendimentos necessários são iguais
à capacidade. Ou seja, o preço mínimo é o preço que exige **lotar a agenda**. Há um teste
automático que confere isso.

**Caso sem meta:** se a pessoa não define salário nem contas, a meta é zero. O sistema mostra
só quanto sobra por cliente. Exemplo: cobra R$ 50 e gasta R$ 10 → sobram R$ 40; com 100
atendimentos, R$ 4.000.

## 6. Desconto máximo

```
desconto_máximo = preço − preço_mínimo
```

Negativo significa que o preço já está abaixo do mínimo e não há espaço para desconto.

Exemplo (manicure): R$ 40 − R$ 26,07 = **R$ 13,93**.

## Histórico: por que a calculadora mudou

A primeira versão usava conceitos de contabilidade: **margem de lucro em %** (markup divisor),
**impostos %** e um **modo simples** sem a hora de trabalho. Ao testar com um caso real (uma
manicure que cobra R$ 50 e gasta R$ 10), a equipe percebeu que:

1. "Margem de 30%" era entendida como "30% a mais que o custo", mas significava "30% do preço
   final". O preço sugerido ficava muito baixo e o resultado parecia errado.
2. O modo simples e o modo completo usavam a palavra "margem" com significados diferentes.
3. Os dados de exemplo (um salão com aluguel) não se pareciam com o público-alvo.

A versão atual troca porcentagens por **valores em reais** e por perguntas do dia a dia. As
fórmulas de base continuam as mesmas: o "valor da hora" é a antiga "hora técnica", e o
"preço mínimo" é o antigo preço sugerido com margem zero.

## Decisões tomadas

1. **Salário e contas entram no preço pelo tempo** de cada atendimento (rateio por hora).
2. **Sem margem em %:** o lucro está no salário e na reserva, informados em reais.
3. **Impostos do MEI entram como conta fixa** (DAS), não como percentual.
4. **A taxa da maquininha é o único percentual**, porque todo mundo a conhece.
5. **Deslocamento e outros gastos são um valor por serviço.**
6. **O tempo do atendimento inclui o deslocamento.**

## Precisão numérica e arredondamento

### O problema

O computador guarda números com casas decimais em **binário** (tipo `float`, padrão IEEE 754).
Assim como 1/3 não tem representação exata em decimal (0,333…), números como 0,1 não têm
representação exata em binário. O resultado são erros minúsculos:

```python
>>> 0.1 + 0.2
0.30000000000000004
>>> round(2.675, 2)
2.67              # deveria ser 2,68
```

### A decisão: `float` com arredondamento no final

O sistema usa `float` em todos os cálculos e arredonda **só no resultado final**. Os motivos:

- Os valores são pequenos (centavos a milhares de reais). O erro do float aparece por volta da
  15ª casa decimal, muito abaixo de um centavo.
- Arredondar no meio do caminho acumularia erro. Por exemplo, arredondar o valor da hora para
  R$ 20,35 antes de calcular o preço pode mudar o centavo do resultado.
- O código fica mais simples do que com o tipo `Decimal`, que faz contas exatas mas exige mais
  cuidado em todas as operações.

### As três proteções do código

1. **Dinheiro arredondado com a regra comercial.** A função `arredondar_moeda()` arredonda para
   centavos com a regra "0,5 sobe" (`ROUND_HALF_UP`). O `round()` do Python não serve para dinheiro:
   usa o "arredondamento bancário" (0,5 vai para o par mais próximo) e ainda erra casos como
   2,675 por causa da representação binária.
2. **Resíduos removidos antes de arredondar para inteiro.** Uma conta que deveria dar 82 pode
   dar 81,99999999999999. Arredondar para baixo daria 81. Por isso o resultado é arredondado
   em 9 casas decimais antes do `floor`/`ceil`.
3. **Testes que comprovam as proteções.** Os testes da seção "Precisão numérica" usam casos reais
   em que o float erra (por exemplo, 8,2 h × 60 / 6 min) e verificam que o sistema acerta.
