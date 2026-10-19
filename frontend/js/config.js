// Configurações do site.

// Endereço da API. No computador (localhost), usa a API rodando com uvicorn na porta 8000.
const API_URL = location.hostname === "localhost" || location.hostname === "127.0.0.1"
  ? "http://localhost:8000"
  : "https://gestao-de-valor-api.onrender.com";

// Versão da Política de Privacidade (privacidade.html). Ao mudar a política, aumente o número:
// quem aceitou a versão antiga verá o pedido de novo aceite.
const VERSAO_PRIVACIDADE = "1.0";

// Projeto do Firebase (login). Estes dados NÃO são secretos: só identificam o projeto.
// A proteção vem do token de login conferido pela API e das regras do Firestore.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBg4g4yVwP4OvaLw4grmPgf5D-FnuYIXic",
  authDomain: "gestao-de-valor.firebaseapp.com",
  projectId: "gestao-de-valor",
  storageBucket: "gestao-de-valor.firebasestorage.app",
  messagingSenderId: "799114822802",
  appId: "1:799114822802:web:6f341a53fb591049e0924b",
};
