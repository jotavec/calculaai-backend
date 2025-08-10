const { z } = require('zod');

// Para criação/cadastro
const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

// Para atualização (PUT) — não exige senha e aceita cpf/telefone opcionais
const updateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  cpf: z.string().optional().nullable(),
  telefone: z.string().optional().nullable()
});

module.exports = { userSchema, updateUserSchema };
