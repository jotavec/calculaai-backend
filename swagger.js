// swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'CalculaAI API',
    version: '1.0.0',
    description: 'Documentação da API do CalculaAI (Precificador)',
  },
  // IMPORTANTÍSSIMO: base /api para todas as rotas
  servers: [
    { url: '/api', description: 'API base (local/Render)' },
  ],
  components: {
    securitySchemes: {
      // Usamos cookie httpOnly chamado "token"
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'token',
        description: 'JWT armazenado em cookie httpOnly',
      },
    },
  },
  // Deixa o cookieAuth aplicado por padrão
  security: [{ cookieAuth: [] }],
};

const options = {
  definition: swaggerDefinition,
  // Varre app.js e TODAS as rotas em src/routes
  apis: [
    './app.js',
    './src/routes/**/*.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};
