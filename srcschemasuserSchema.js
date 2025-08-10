const { z } = require("zod");

// Definição do que esperamos no body de POST /users e PUT /users/:id
const createUserSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
});

module.exports = { createUserSchema };
