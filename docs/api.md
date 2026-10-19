# API do Gestão de Valor

A documentação completa e interativa é gerada automaticamente pelo FastAPI (Swagger):

- Local: http://localhost:8000/docs
- Formato OpenAPI: http://localhost:8000/openapi.json

Este documento resume a organização da API para quem vai desenvolver ou avaliar o projeto.

## Organização do código

``
backend/app/
├── main.py              # cria a API, registra os routers e trata erros
├── config.py            # configurações lidas de variáveis de ambiente
├── auth.py              # confere o token de login do Firebase e descobre o usuário
├── core/precificacao.py # motor de cálculo: fórmulas puras (ver docs/formulas.md)
├── models/schemas.py    # formato dos dados que entram e saem (Pydantic)
├── db/repositorio.py    # onde os dados ficam guardados (memória ou Firestore)
├── db/firebase.py       # conexão com o Firebase
├── db/exemplo.py        # dados de exemplo (manicure a domicílio)
├── services/analise.py  # junta o motor de cálculo com os dados cadastrados
└── routers/             # endpoints, um arquivo por tela do site
``

O caminho de uma requisição:

``
Site → router (recebe e confere os dados) → services (calcula) → core (fórmulas)
                     ↓
                   db (guarda e lê)
``

## Endpoints

| Tela do site | Método e caminho | O que faz |
|---|---|---|
| — | `GET /conta` | Quem está logado (uid) e o aceite da Política de Privacidade |
| Login | `POST /conta/privacidade` | Registra o aceite da Política de Privacidade (versão e data) |
| Seu mês | `POST /conta/exemplo` | Apaga os dados do usuário e carrega o exemplo da manicure |
| Seu mês | `DELETE /conta/dados` | Apaga contas, materiais e serviços (a conta continua) |
| Seu mês | `DELETE /conta` | Exclui a conta de vez: todos os dados e o login (LGPD) |
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

``json
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
``

## Respostas de erro

| Código | Quando |
|---|---|
| `401` | Sem login, ou com o token vencido ou inválido |
| `404` | O id informado não existe |
| `409` | Tentativa de apagar um material usado em algum serviço |
| `422` | Dados inválidos (salário negativo, tempo zero, material inexistente, taxa de 100%…) |

O corpo traz a explicação em português no campo `detail`.

## Valores em dinheiro

Os cálculos usam precisão total e todos os valores em R$ saem arredondados para centavos com
a regra comercial ("0,5 sobe"). Detalhes na seção "Precisão numérica" de [formulas.md](formulas.md).

## Login

Todos os endpoints, menos /calculadora/simular, /calculadora/rendimento e /health, exigem login.

1. O site faz o login pelo **Firebase Authentication** (e-mail e senha, ou conta Google).
2. O Firebase entrega ao site um **token JWT** (o "ID token"), válido por 1 hora e renovado sozinho.
3. O site envia o token em cada pedido: `Authorization: Bearer <token>`.
4. A API confere a assinatura e a validade do token com o Firebase e descobre o `uid` da pessoa.
5. A API lê e grava só em `usuarios/{uid}`. Sem token, ou com token vencido, a resposta é `401`.

No Swagger, clique em **Authorize** e cole um token para testar os endpoints protegidos.

## Configuração

A API lê as configurações de variáveis de ambiente (ou do arquivo `backend/.env`, que não vai
para o GitHub). Modelo em [`backend/.env.example`](../backend/.env.example); explicação de cada
variável em `backend/app/config.py`.

| Variável | Valores | Para quê |
|---|---|---|
| `ARMAZENAMENTO` | `memoria` / `firestore` | Onde guardar os dados |
| `AUTENTICACAO` | `ligada` / `desligada` | Exigir login (desligada só para testes locais, usa o usuário `demo`) |
| `GOOGLE_APPLICATION_CREDENTIALS` | caminho do arquivo | Chave da conta de serviço, no computador |
| `FIREBASE_CREDENCIAIS_JSON` | conteúdo do JSON | Chave da conta de serviço, no servidor |
| `ORIGENS_PERMITIDAS` | endereços separados por vírgula | Sites que podem chamar a API |

O banco de dados está descrito em [banco-de-dados.md](banco-de-dados.md).

## Publicação

A API está no ar no **Render** (plano gratuito): https://gestao-de-valor-api.onrender.com

| Configuração no Render | Valor |
|---|---|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/health` |
| Variáveis | `ARMAZENAMENTO=firestore`, `AUTENTICACAO=ligada`, `ORIGENS_PERMITIDAS`, `PYTHON_VERSION=3.12.8` e a secreta `FIREBASE_CREDENCIAIS_JSON` |

A cada merge na `main`, o Render publica a versão nova sozinho.

## Como o site usa a API

- `frontend/js/auth.js` faz o login com o Firebase e fornece o token.
- `frontend/js/api.js` envia cada pedido com o token, traduz os erros e mostra o aviso
  "Conectando ao servidor…" quando a API demora para acordar.
- A calculadora usa `POST /calculadora/simular` enquanto a pessoa digita (resposta rápida, sem
  gravar) e salva as mudanças com `PUT` quando ela para de digitar.