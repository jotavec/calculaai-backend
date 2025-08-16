// server.js
'use strict';

// Carrega .env localmente quando rodando fora de provedor gerenciado
try { require('dotenv').config(); } catch (_) {}

const http = require('http');
const app = require('./app'); // importa seu app.js que exporta o express()

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  console.log(`[server] API online em http://${HOST}:${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
});

/* ==================== Tratamento de sinais/erros ==================== */
function shutdown(code = 0) {
  console.log('[server] Encerrando servidor...');
  server.close(err => {
    if (err) {
      console.error('[server] Erro ao fechar servidor:', err);
      process.exit(1);
    }
    process.exit(code);
  });

  // Se demorar demais, força encerramento
  setTimeout(() => process.exit(code), 10_000).unref();
}

// Erros não tratados
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught Exception:', err);
});

// Sinais de parada (Render/containers costumam enviar SIGTERM)
process.on('SIGTERM', () => {
  console.log('[server] SIGTERM recebido');
  shutdown(0);
});
process.on('SIGINT', () => {
  console.log('[server] SIGINT recebido (Ctrl+C)');
  shutdown(0);
});
