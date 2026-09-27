# Como contribuir

Guia passo a passo para os integrantes do grupo trabalharem no projeto sem atrapalhar uns aos outros.

## Regra de ouro

**Ninguém envia código direto para a `main`.** Todo trabalho é feito numa branch própria e entra na `main` por um Pull Request (PR) revisado por outro integrante.

**Nunca envie senhas, chaves ou o arquivo `.env`.** O repositório é público.

## 1. Preparação (só na primeira vez)

1. Crie uma conta no [GitHub](https://github.com) e aceite o convite da organização `gestao-de-valor-ufmt` (chega por e-mail).
2. Instale o [Git](https://git-scm.com/download/win) e o [VS Code](https://code.visualstudio.com/).
3. Configure seu nome e e-mail (use o mesmo e-mail da conta do GitHub):

   ```bash
   git config --global user.name "Seu Nome"
   git config --global user.email "seu-email@exemplo.com"
   ```

4. Baixe o projeto:

   ```bash
   git clone https://github.com/gestao-de-valor-ufmt/gestao-de-valor.git
   cd gestao-de-valor
   ```

## 2. Fluxo de trabalho (toda tarefa)

### a) Atualize sua `main`

```bash
git checkout main
git pull
```

### b) Crie uma branch para a tarefa

```bash
git checkout -b feature/nome-da-tarefa
```

Padrão de nomes:

| Prefixo | Uso | Exemplo |
|---|---|---|
| `feature/` | nova funcionalidade | `feature/cadastro-insumos` |
| `fix/` | correção de erro | `fix/calculo-hora-tecnica` |
| `docs/` | documentação | `docs/manual-usuario` |

### c) Trabalhe e salve (commit) com frequência

```bash
git add .
git commit -m "Adiciona cadastro de insumos"
```

Mensagens de commit: curtas, no imperativo, dizendo **o que** a mudança faz (ex.: "Corrige arredondamento do preço", "Cria tela de custos fixos").

### d) Envie sua branch para o GitHub

```bash
git push -u origin feature/nome-da-tarefa
```

### e) Abra o Pull Request

1. No GitHub, aparecerá o botão **Compare & pull request**. Clique nele.
2. Descreva o que foi feito e, se houver, cite a issue (ex.: `Fecha #12`).
3. Peça revisão a um colega.

### f) Revisão e merge

- Quem revisa lê o código, testa se possível e aprova ou pede ajustes.
- Para ajustar, basta fazer novos commits na mesma branch e dar `git push`. O PR se atualiza sozinho.
- Depois de aprovado, clique em **Squash and merge** e apague a branch.

### g) Volte para a `main` e recomece

```bash
git checkout main
git pull
```

## 3. Conflitos

Se o GitHub avisar que há conflito com a `main`:

```bash
git checkout main
git pull
git checkout feature/nome-da-tarefa
git merge main
```

Abra os arquivos marcados no VS Code, escolha o que manter, e depois:

```bash
git add .
git commit -m "Resolve conflito com a main"
git push
```

Na dúvida, peça ajuda no grupo antes de apagar o código de alguém.

## 4. Organização das tarefas

- Cada tarefa é uma **Issue** no GitHub.
- O andamento fica no quadro **Projects** da organização (A fazer → Em andamento → Em revisão → Concluído).
- Antes de começar uma tarefa, atribua a issue a você para ninguém fazer a mesma coisa.

## 5. Padrões de código

- **Python**: siga a PEP 8. Nomes de variáveis e funções em português, sem acento (ex.: `custo_hora`, `calcular_preco`).
- **Fórmulas** ficam em `backend/app/core/` e **toda fórmula precisa de teste** em `backend/tests/`.
- **Frontend**: use as classes do Bootstrap e o arquivo `frontend/css/estilo.css`. Evite CSS dentro do HTML.
- Rode `pytest` antes de abrir o PR. Os testes também rodam automaticamente no GitHub.
