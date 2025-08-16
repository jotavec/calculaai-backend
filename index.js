// index.js
'use strict';

// Carrega .env LOCALMENTE apenas se o ambiente não injetou DATABASE_URL.
// Em produção (Render/PM2), as envs vêm do sistema.
try {
  if (!process.env.DATABASE_URL) {
    require('dotenv').config();
  }
} catch (_) {}

const app = require('./app');

const HOST = process.env.HOST || '0.0.0.0'; // aceita conexões externas (Render/EC2/Docker)
const PORT = Number(process.env.PORT) || 3000;

let server;

function start() {
  server = app.listen(PORT, HOST, () => {
    console.log(
      `🚀 Server listening on http://${HOST}:${PORT} (env=${process.env.NODE_ENV || 'development'})`
    );
  });

  // Trata erros comuns de bind
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Porta ${PORT} já está em uso.`);
    } else {
      console.error('❌ Erro no HTTP server:', err);
    }
    process.exit(1);
  });
}

function shutdown(signal) {
  console.log(`\n${signal} recebido — encerrando com graça...`);
  if (!server) process.exit(0);

  // Para de aceitar novas conexões e encerra as existentes
  server.close((err) => {
    if (err) {
      console.error('Erro ao fechar o HTTP server:', err);
      process.exit(1);
    }
    console.log('✅ HTTP server fechado. Até mais!');
    process.exit(0);
  });

  // Se travar, força saída
  setTimeout(() => {
    console.warn('⏱️ Saída forçada após 10s');
    process.exit(1);
  }, 10_000).unref();
}

// Sinais do SO (PM2/containers)
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Crash-safety: loga erros não tratados
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  // Opcional: derrubar para reinício limpo pelo orquestrador
  shutdown('uncaughtException');
});

// Inicia
start();

// Exporta se quiser usar em testes
module.exports = { start, shutdown };
