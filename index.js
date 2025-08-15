// index.js

// Carrega .env só em ambiente local e NUNCA sobrescreve variáveis do servidor.
// Em produção (PM2/NGINX), as envs vêm do sistema.
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const app = require('./app');

const HOST = process.env.HOST || '0.0.0.0';   // 0.0.0.0 p/ aceitar conexões externas (EC2/Docker)
const PORT = Number(process.env.PORT) || 3000;

let server;

function start() {
  server = app.listen(PORT, HOST, () => {
    console.log(
      `🚀 Server listening on http://${HOST}:${PORT} (env=${process.env.NODE_ENV || 'development'})`
    );
  });
}

function shutdown(signal) {
  console.log(`\n${signal} recebido — encerrando com graça...`);
  if (!server) process.exit(0);

  // Para de aceitar novas conexões e encerra as existentes
  server.close(err => {
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

// Crash-safety: loga erros não tratados (sem derrubar o processo de cara)
process.on('unhandledRejection', reason => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION:', err);
  // Fecha com graça; PM2 pode reiniciar conforme sua config
  shutdown('uncaughtException');
});

// Inicia
start();

// Exporta se você quiser reusar em testes
module.exports = { start, shutdown };
