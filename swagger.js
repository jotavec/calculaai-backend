// swagger.js
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  // A chave correta é "definition"
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Precificador',
      version: '1.0.0',
      description: 'CRUD de usuários com Prisma + Express',
    },
    // ajuda o Swagger UI a montar URLs relativas corretamente
    servers: [{ url: '/' }],
  },
  // IMPORTANTÍSSIMO: usar caminhos absolutos e UMA única chave `apis`
  apis: [
    path.join(__dirname, 'app.js'),
    path.join(__dirname, 'src', '**', '*.js'),
  ],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerUi, swaggerSpec };
