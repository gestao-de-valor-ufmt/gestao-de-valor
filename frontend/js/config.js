// Endereço da API. Local: uvicorn na porta 8000. Em produção, trocar pelo endereço do Render.
const API_URL = location.hostname === "localhost" || location.hostname === "127.0.0.1"
  ? "http://localhost:8000"
  : "https://gestao-de-valor-api.onrender.com";
