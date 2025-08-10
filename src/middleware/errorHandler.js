// src/middleware/errorHandler.js

function errorHandler(err, req, res, next) {
  console.error(err); // opcional: loga no console
  if (err.name === 'ZodError') {
    // já capturamos Zod antes, mas só por segurança:
    const errors = err.errors.map(e => e.message);
    return res.status(400).json({ errors });
  }
  // pra erros do Prisma, podemos mapear pelo código:
  if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
    return res.status(409).json({ error: 'E-mail já cadastrado' });
  }
  // qualquer outro erro:
  res.status(500).json({ error: 'Internal Server Error' });
}

module.exports = errorHandler;

