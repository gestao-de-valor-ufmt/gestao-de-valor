# API do Gestão de Valor

A documentação completa e interativa é gerada automaticamente pelo FastAPI (Swagger):

- Local: http://localhost:8000/docs
- Formato OpenAPI: http://localhost:8000/openapi.json

Este documento resume a organização da API para quem vai desenvolver ou avaliar o projeto.

## Organização do código

```
backend/app/
├── main.py              # cria a API, registra os routers e trata erros
├── core/precificacao.py # motor de cálculo: fórmulas puras (ver docs/formulas.md)
├── models/schemas.py    # formato dos dados que entram e saem (Pydantic)
├── db/repositorio.py    # onde os dados ficam guardados
├── db/exemplo.py        # dados de exemplo (manicure a domicílio)
├── services/analise.py  # junta o motor de cálculo com os dados cadastrados
└── routers/             # endpoints, um arquivo por tela do site
```

O caminho de uma requisição:

```
Site → router (recebe e confere os dados) → services (calcula) → core (fórmulas)
                     ↓
                   db (guarda e lê)
```

## Endpoints

| Tela do site | Método e caminho | O que faz |
|---|---|---|
| Seu mês | `GET /configuracao` | Ver salário, reserva, dias, horas e taxa da maquininha |
| Seu mês | `PUT /configuracao` | Salvar a configuração |
| Seu mês | `GET /contas` | Listar contas fixas |
| Seu mês | `POST /contas` | Cadastrar conta |
| Seu mês | `PUT /contas/{id}` | Editar conta |
| Seu mês | `DELETE /contas/{id}` | Apagar conta |
| Materiais | `GET /materiais` | Listar materiais, com o custo por uso já calculado |
| Materiais | `POST /materiais` | Cadastrar material |
| Materiais | `PUT /materiais/{id}` | Editar material |
| Materiais | `DELETE /materiais/{id}` | Apagar material (recusa se estiver em uso: `409`) |
| Serviços | `GET /servicos` | Listar serviços |
| Serviços | `POST /servicos` | Cadastrar serviço |
| Serviços | `PUT /servicos/{id}` | Editar serviço |
| Serviços | `DELETE /servicos/{id}` | Apagar serviço |
| Calculadora | `GET /servicos/{id}/analise` | Preço mínimo, atendimentos necessários e desconto de um serviço |
| Painel | `GET /calculadora/resumo` | Meta do mês, valor da hora e análise de todos os serviços |
| Calculadora | `POST /calculadora/simular` | Calcula sem cadastrar nada (todos os números no corpo) |
| Materiais | `POST /calculadora/rendimento` | Estima o rendimento pelo tempo que a embalagem dura |
| — | `GET /health` | Verifica se a API está no ar |

## Exemplo: análise da manicure

`GET /servicos/1/analise`

```json
{
  "servico_id": 1,
  "nome": "Manicure",
  "material": 3.72,
  "outros_gastos": 2.0,
  "gasto": 5.72,
  "parte_da_meta": 20.35,
  "taxa_no_minimo": 0.0,
  "preco_minimo": 26.07,
  "capacidade": 132,
  "preco_cobrado": 40.0,
  "taxa_no_preco": 0.0,
  "valor_liquido": 40.0,
  "sobra": 34.28,
  "atendimentos_necessarios": 79,
  "desconto_maximo": 13.93
}
```

## Respostas de erro

| Código | Quando |
|---|---|
| `404` | O id informado não existe |
| `409` | Tentativa de apagar um material usado em algum serviço |
| `422` | Dados inválidos (salário negativo, tempo zero, material inexistente, taxa de 100%…) |

O corpo traz a explicação em português no campo `detail`.

## Valores em dinheiro

Os cálculos usam precisão total e todos os valores em R$ saem arredondados para centavos com
a regra comercial ("0,5 sobe"). Detalhes na seção "Precisão numérica" de [formulas.md](formulas.md).

## Situação atual e próximos passos

- **Armazenamento:** por enquanto os dados ficam **na memória** e voltam ao exemplo da manicure
  quando o servidor reinicia. O próximo passo é guardar no **Google Cloud Firestore**: basta criar
  um repositório com os mesmos métodos de `RepositorioMemoria` e trocar `obter_repositorio()`.
- **Login:** ainda não há usuários. Com o **Firebase Authentication**, cada pessoa verá só os
  próprios dados.
- **Publicação:** a API ainda não está no ar; o plano é publicá-la no **Render**.
