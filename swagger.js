// swagger.js (CalculaAI) — arquivo completo
// Gera a especificação OpenAPI e expõe para o Swagger UI

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Base da API (ex.: "/api")
const API_PREFIX = process.env.API_PREFIX || '/api';

// URL pública do backend (Render) ou localhost
// Render expõe RENDER_EXTERNAL_URL em runtime.
// Se não existir, tentamos BACKEND_PUBLIC_URL e por fim localhost.
const PUBLIC_URL =
  process.env.SWAGGER_SERVER_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  process.env.BACKEND_PUBLIC_URL ||
  'http://localhost:3000';

// Config do Swagger/OpenAPI
const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'CalculaAI API',
      version: '1.0.0',
      description: 'Documentação da API do CalculaAI (Precificador)',
    },
    servers: [
      {
        url: `${PUBLIC_URL}${API_PREFIX}`,
        description: 'api - API base (local/Render)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },

  // IMPORTANTÍSSIMO: varrer TODAS as rotas e controladores
  apis: [
    './index.js',
    './app.js',
    './src/**/*.js',          // todas as rotas/controllers dentro de src
    './src/**/**/*.js',       // caso tenha subpastas mais profundas
    './**/*.routes.js',       // se você usa convenção *.routes.js
  ],
};

// Gera a spec
const swaggerSpec = swaggerJsdoc(options);

// Exporta para uso no app.js / index.js
module.exports = { swaggerUi, swaggerSpec };
