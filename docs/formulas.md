# Fórmulas de precificação (RASCUNHO para validação do grupo)

> Este documento precisa ser revisado e aprovado pelo grupo **antes** de programarmos o motor de cálculo (`backend/app/core/`).

## 1. Custo do insumo por uso

```
custo_por_uso = preço_pago_na_embalagem / rendimento_em_usos
```

Exemplo: esmalte de R$ 12,00 que rende 20 aplicações → R$ 0,60 por aplicação.

## 2. Custo da hora técnica

```
custo_hora = (total_custos_fixos_mensais + pró_labore_desejado) / horas_produtivas_no_mês
```

- **Custos fixos**: aluguel, internet, energia, MEI (DAS), depreciação de equipamentos etc.
- **Depreciação mensal** de um equipamento = `valor_do_equipamento / vida_útil_em_meses`.
- **Horas produtivas**: somente as horas realmente vendáveis (descontar deslocamento, limpeza, tempo ocioso).

## 3. Custo do serviço (ficha técnica)

```
custo_serviço = Σ(custo_por_uso × quantidade de cada insumo) + (custo_hora × tempo_em_horas)
```

## 4. Preço de venda (markup divisor)

```
preço = custo_serviço / (1 − (%margem_lucro + %impostos + %taxas_cartão))
```

Exemplo: custo R$ 30,00, margem 20%, impostos 6%, taxa de cartão 4% → 30 / 0,70 = **R$ 42,86**.

## 5. Ponto de equilíbrio (break-even)

```
quantidade_equilíbrio = custos_fixos_mensais / (preço − custo_variável_unitário)
```

- **Custo variável unitário** = insumos do serviço + impostos e taxas sobre o preço.

## ⚠️ Pontos em aberto

1. **Não contar custo fixo duas vezes**: se os custos fixos já entram no preço via hora técnica (item 2), o ponto de equilíbrio (item 5) precisa ser interpretado com cuidado. Decidir qual abordagem usar:
   - **(a)** Hora técnica inclui custos fixos → o break-even mostra quantos serviços cobrem os custos fixos e o pró-labore.
   - **(b)** Hora técnica inclui só o pró-labore → os custos fixos entram apenas no break-even.
2. Pró-labore entra como custo fixo ou separado?
3. Impostos do MEI (DAS) são valor fixo mensal, não percentual. Tratar como custo fixo?
