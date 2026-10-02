# Fórmulas de precificação

Este documento descreve as fórmulas do sistema. A implementação fica em
[`backend/app/core/precificacao.py`](../backend/app/core/precificacao.py) e os testes em
[`backend/tests/test_precificacao.py`](../backend/tests/test_precificacao.py).

## 1. Custo do insumo por uso

```
custo_por_uso = preço_pago_na_embalagem / rendimento_em_usos
```

Exemplo: esmalte de R$ 12,00 que rende 20 aplicações → R$ 0,60 por aplicação.

## 2. Horas produtivas

```
horas_produtivas = dias_por_mês × horas_por_dia × (produtividade / 100)
```

A **produtividade** é o percentual do tempo que realmente vira atendimento. Desconta limpeza,
intervalos, deslocamento e horários vagos.

Exemplo: 22 dias × 6 h × 75% = **99 horas produtivas**.

## 3. Custo da hora técnica

```
custo_hora = (custos_fixos_mensais + pró_labore) / horas_produtivas
```

- **Custos fixos**: o que se paga todo mês, trabalhando ou não: aluguel, energia, internet, DAS do MEI, depreciação de equipamentos.
- **Depreciação mensal** de um equipamento = `valor_pago / vida_útil_em_meses`.
- **Pró-labore**: o salário que o dono do negócio quer tirar para si.

Exemplo: (R$ 1.715,90 + R$ 3.000,00) / 99 h = **R$ 47,64 por hora**.

## 4. Custo do serviço (ficha técnica)

```
custo_serviço = insumos + custos_miúdos + mão_de_obra

insumos      = Σ(custo_por_uso × quantidade)
mão_de_obra  = custo_hora × (minutos / 60)
```

- **Custos miúdos**: um valor fixo em R$ **por serviço** para gastos pequenos e difíceis de medir,
  como gás, detergente ou combustível para buscar material. Cada serviço tem o seu, porque um
  alongamento gasta mais que uma manicure.

Exemplo (manicure, 40 min, sem custos miúdos): R$ 3,72 de insumos + R$ 31,76 de mão de obra = **R$ 35,48**.

### Modo completo e modo simples

O usuário escolhe se a hora de trabalho entra no custo:

| | Modo completo (padrão) | Modo simples |
|---|---|---|
| Insumos | ✅ | ✅ |
| Custos miúdos | ✅ | ✅ |
| Mão de obra (hora técnica) | ✅ | ❌ (vale 0) |
| Margem, impostos e taxas | ✅ | ✅ |

O modo simples é como muitos microempreendedores calculam na prática: material + "uma
gordura" + lucro. Nesse modo, as contas fixas e o salário precisam sair da margem de lucro.
Por isso o **ponto de equilíbrio continua sendo calculado com os custos fixos e o pró-labore**:
ele mostra se a margem escolhida sustenta o negócio.

Exemplo (manicure, modo simples, R$ 2,00 de custos miúdos, margem de 60%): o preço cai para
R$ 15,89, mas seriam necessários **495 atendimentos** no mês, e só cabem 148 na agenda.

## 5. Preço de venda (markup divisor)

```
preço = custo_serviço / (1 − (%margem + %impostos + %taxa_cartão) / 100)
```

Os percentuais incidem sobre o **preço final**, por isso se **divide** em vez de multiplicar.
Somar 30% ao custo (`custo × 1,30`) daria um preço menor que o necessário.

Exemplo (manicure): R$ 35,48 / (1 − 0,24) = **R$ 46,68**.

Para MEI, o percentual de impostos costuma ser 0%, porque o DAS é um valor fixo e já entra nos custos fixos.

## 6. Ponto de equilíbrio

```
custo_variável      = insumos + custos_miúdos + preço × (%impostos + %taxa_cartão) / 100
margem_contribuição = preço − custo_variável
ponto_equilíbrio    = ⌈ (custos_fixos + pró_labore) / margem_contribuição ⌉
```

É quantos atendimentos no mês são necessários para pagar todos os custos e o pró-labore.
O resultado é arredondado **para cima** (⌈ ⌉), porque não existe meio atendimento.

Exemplo (manicure): R$ 4.715,90 / R$ 41,09 = **115 atendimentos**.

### Capacidade mensal

```
capacidade = ⌊ horas_produtivas × 60 / minutos_do_serviço ⌋
```

É quantos atendimentos cabem no mês, arredondado **para baixo**. Comparar com o ponto de
equilíbrio mostra se a meta é viável: a manicure precisa de 115 dos 148 possíveis (78%).

## 7. Desconto máximo

O usuário define a **margem mínima** que aceita, ou seja, o menor lucro com que topa trabalhar.
O preço mínimo é o próprio markup divisor calculado com essa margem:

```
preço_mínimo    = custo_serviço / (1 − (%margem_mínima + %impostos + %taxa_cartão) / 100)
desconto_máximo = (preço − preço_mínimo) / preço × 100
```

- **Margem mínima de 0%**: o desconto vai até o ponto de não ter lucro nem prejuízo.
- **Margem mínima negativa**: aceita prejuízo de propósito, por exemplo numa troca de
  produtos ou serviços em vez de pagamento em dinheiro.
- **Desconto máximo negativo**: o preço atual já está abaixo do mínimo, então não há espaço para desconto.

Exemplo (manicure, margem mínima de 0%): preço mínimo de **R$ 36,96**, desconto máximo de
**20,83%** sobre os R$ 46,68.

### Simular um desconto

Para avaliar um desconto qualquer, o sistema faz a conta inversa do markup e calcula a margem
que sobra no preço com desconto:

```
margem_efetiva = (1 − custo_serviço / preço_com_desconto) × 100 − %impostos − %taxa_cartão
```

O desconto está dentro do limite quando `margem_efetiva ≥ margem_mínima`.

## Decisões tomadas

1. **Custos fixos e pró-labore entram na hora técnica.** É o que a minuta define ("rateio das
   despesas fixas para determinar o custo exato da hora de trabalho").
2. **Sem contagem dupla no ponto de equilíbrio.** O custo variável usa só insumos, impostos e
   taxas. A parte fixa já está no numerador (custos fixos + pró-labore).
3. **DAS do MEI é custo fixo**, não percentual sobre a venda.
4. **Pró-labore é informado separado** dos custos fixos, para o usuário enxergar o próprio salário.
5. **Hora de trabalho é opcional** (modo simples), mas o ponto de equilíbrio sempre considera os
   custos fixos e o pró-labore.
6. **Custos miúdos são um valor por serviço**, não um valor único para todos.
7. **A margem é sempre calculada sobre o preço final** (markup divisor), também no modo simples.
8. **A margem mínima do desconto é escolhida pelo usuário** e pode ser negativa.

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
- Arredondar no meio do caminho acumularia erro. Por exemplo, arredondar a hora técnica para
  R$ 47,64 antes de calcular a mão de obra pode mudar o centavo do preço final.
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
