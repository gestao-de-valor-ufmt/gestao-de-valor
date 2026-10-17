# Banco de dados

O sistema usa o **Google Cloud Firestore**, um banco de dados **NoSQL orientado a documentos**,
no plano gratuito (Spark) do Firebase, com os dados guardados em São Paulo (`southamerica-east1`).

## Por que NoSQL e como os dados se relacionam

No Firestore não há tabelas nem chaves estrangeiras como num banco SQL. Os dados ficam em
**documentos** (parecidos com um JSON) organizados em **coleções**. Os relacionamentos são
representados de duas formas:

1. **Hierarquia (subcoleções):** tudo o que pertence a um usuário fica "dentro" do documento dele.
   Isso garante, pela própria estrutura, que um usuário nunca enxerga os dados de outro.
2. **Referência por id:** um serviço guarda os ids dos materiais que usa (`material_id`), como uma
   chave estrangeira. A API confere se o material existe antes de salvar o serviço e não deixa
   apagar um material que esteja em uso.

## Estrutura

```
usuarios/                          (coleção)
└── {uid}                          (documento: um por usuário, id = uid do Firebase Authentication)
    ├── configuracao               (mapa: o "Seu mês")
    ├── proximos_ids               (mapa: contador de ids de cada subcoleção)
    │
    ├── contas/                    (subcoleção)
    │   └── {id}                   (documento: uma conta fixa)
    ├── materiais/                 (subcoleção)
    │   └── {id}                   (documento: um material)
    └── servicos/                  (subcoleção)
        └── {id}                   (documento: um serviço)
            └── materiais[]        (lista: material_id + quantidade → referência a materiais/{id})
```

## Campos de cada documento

### `usuarios/{uid}`

| Campo | Tipo | Descrição |
|---|---|---|
| `configuracao.salario` | número | Quanto quer ganhar por mês (R$) |
| `configuracao.reserva` | número | Reserva mensal para emergências e investimentos (R$) |
| `configuracao.dias_por_mes` | número | Dias de trabalho por mês |
| `configuracao.horas_por_dia` | número | Horas atendendo por dia, com deslocamento |
| `configuracao.taxa_cartao` | número | Taxa da maquininha (%) |
| `proximos_ids.contas` / `.materiais` / `.servicos` | número | Próximo id a usar em cada subcoleção |

### `usuarios/{uid}/contas/{id}`

| Campo | Tipo | Descrição |
|---|---|---|
| `nome` | texto | Ex.: "DAS MEI" |
| `valor` | número | Valor por mês (R$) |

### `usuarios/{uid}/materiais/{id}`

| Campo | Tipo | Descrição |
|---|---|---|
| `nome` | texto | Ex.: "Esmalte" |
| `embalagem` | texto | Ex.: "Frasco 8 ml" |
| `preco` | número | Preço pago na embalagem (R$) |
| `rendimento` | número | Quantos usos a embalagem rende |

O **custo por uso** (`preco / rendimento`) não é guardado: a API calcula na hora.

### `usuarios/{uid}/servicos/{id}`

| Campo | Tipo | Descrição |
|---|---|---|
| `nome` | texto | Ex.: "Manicure" |
| `minutos` | número | Tempo do atendimento, com deslocamento |
| `outros_gastos` | número | Deslocamento, gás, detergente… (R$) |
| `preco_cobrado` | número | Quanto cobra hoje (R$) |
| `materiais` | lista | Itens `{material_id, quantidade}` |

## Decisões de modelagem

- **Ids numéricos com contador por usuário.** O Firestore gera ids aleatórios, mas números
  sequenciais são mais simples para a API e para o site. O contador fica em `proximos_ids` e é
  atualizado dentro de uma **transação**, para dois cadastros simultâneos nunca pegarem o mesmo número.
- **Resultados não são guardados.** Preço mínimo, atendimentos necessários e desconto são
  calculados a cada consulta. Assim, mudar o preço de um material atualiza tudo na hora, sem
  risco de valores desatualizados no banco.
- **Leituras agrupadas.** Para montar o painel, a API lê a configuração, as contas e os materiais
  uma única vez e reaproveita para todos os serviços.

## Segurança

- O banco fica **fechado para acesso direto** (arquivo [`firestore.rules`](../firestore.rules)).
  Nem o site nem qualquer outra pessoa consegue ler ou gravar sem passar pela API.
- A API acessa o banco com a **chave da conta de serviço**, que fica fora do repositório
  (arquivo local ignorado pelo Git; no servidor, uma variável de ambiente secreta).
- Cada pedido à API traz o **token de login** do Firebase Authentication. A API confere o token
  e usa o `uid` dele para escolher a "pasta" `usuarios/{uid}`. O uid nunca vem do site, então
  ninguém consegue pedir os dados de outra pessoa.
