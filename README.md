# Gestão de Valor

Metodologia didática e sistema de precificação para prestadores de serviços — Seminário Integrador BCT/UFMT (Campus Cuiabá).

Ferramenta gratuita e de código aberto para ajudar MEIs e profissionais autônomos a calcular o preço dos seus serviços com base nos custos reais, em vez de "achismo".

## Funcionalidades previstas

- **Seu mês**: salário desejado, contas fixas (DAS, celular, aluguel) e horas de atendimento.
- **Materiais**: o que se compra para os atendimentos, com cálculo do custo por uso.
- **Serviços**: "cardápio" com material, deslocamento, tempo e preço cobrado de cada serviço.
- **Valor da hora**: rateio do salário e das contas pelas horas de atendimento (hora técnica).
- **Calculadora**: preço mínimo, atendimentos necessários no mês (ponto de equilíbrio) e desconto máximo.

Protótipo publicado: https://gestao-de-valor-ufmt.github.io/gestao-de-valor/

## Tecnologias

| Camada | Tecnologia | Hospedagem (gratuita) |
|---|---|---|
| Backend | Python + FastAPI | Render |
| Banco de dados | Google Cloud Firestore | Firebase (plano Spark) |
| Autenticação | Firebase Authentication | Firebase (plano Spark) |
| Frontend | HTML, CSS (Bootstrap 5), JavaScript | Firebase Hosting |

## Estrutura do projeto

```
backend/
  app/
    core/      # motor de cálculo (fórmulas puras)
    routers/   # endpoints da API, um arquivo por tela
    models/    # schemas Pydantic
    services/  # junta o motor de cálculo com os dados cadastrados
    db/        # armazenamento (memória por enquanto; Firestore em seguida)
    main.py    # ponto de entrada da API
  tests/       # testes automáticos (pytest)
frontend/
  css/         # estilos globais
  js/          # scripts
  index.html
docs/          # minuta, fórmulas, manual e material didático
```

## Como rodar localmente

### Backend

Requisito: Python 3.11 ou superior.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/Mac
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

- API: http://localhost:8000
- Documentação (Swagger): http://localhost:8000/docs
- Resumo dos endpoints: [docs/api.md](docs/api.md)
- Estrutura do banco de dados: [docs/banco-de-dados.md](docs/banco-de-dados.md)

Sem configurar nada, a API guarda os dados na memória e exige login. Para usar o Firestore ou
testar sem login, copie `backend/.env.example` para `backend/.env` e ajuste os valores. A chave
do Firebase (`firebase-service-account.json`) é pedida a quem administra o projeto e **nunca** vai
para o GitHub.

Rodar os testes:

```bash
cd backend
pytest
```

### Frontend

Use a extensão **Live Server** do VS Code (porta 5500) para abrir a pasta `frontend/`. O site exige
login pelo Firebase (endereços `localhost` e `127.0.0.1` já estão autorizados).

- Rodando em `localhost`, o site chama a API local (`http://localhost:8000`). Suba a API antes.
- No endereço publicado, o site chama a API no Render (`https://gestao-de-valor-api.onrender.com`).

Essa escolha fica em `frontend/js/config.js`.

## Endereços publicados

| O quê | Endereço |
|---|---|
| Site | https://gestao-de-valor-ufmt.github.io/gestao-de-valor/ |
| API | https://gestao-de-valor-api.onrender.com |
| Documentação da API (Swagger) | https://gestao-de-valor-api.onrender.com/docs |

No plano gratuito do Render, a API "dorme" depois de 15 minutos sem uso; o primeiro acesso
depois disso leva até 1 minuto.

## Como contribuir

Leia o [CONTRIBUTING.md](CONTRIBUTING.md) antes de começar.

## Equipe

- Elize Josefa Ferreira dos Santos
- Everton Antonio Geraldi
- Douglas da Silva
- Fábio Estácio dos Santos
- Fernando Muniz da Cruz
- Joilson Frederico F. dos Santos

## Licença

[GNU General Public License v3.0](LICENSE)
