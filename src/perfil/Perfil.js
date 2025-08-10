const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

// CADASTRAR USUÁRIO
router.post("/", async (req, res) => {
  const { name, email, password, cpf, telefone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Preencha todos os campos." });
  }

  try {
    // Verifica se já existe usuário com esse email
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email já cadastrado." });
    }

    // Cria hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Cria usuário com CPF e telefone
    const newUser = await prisma.user.create({
      data: { name, email, passwordHash, cpf, telefone },
    });

    res.status(201).json({
      message: "Usuário cadastrado!",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        cpf: newUser.cpf || "",
        telefone: newUser.telefone || "",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao cadastrar usuário." });
  }
});

// BUSCAR USUÁRIO POR EMAIL (exemplo)
// GET /users - retorna todos os usuários (INCLUI CPF e TELEFONE)
router.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        telefone: true,
      },
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar usuários." });
  }
});

// ATUALIZAR USUÁRIO (exemplo com PUT)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, cpf, telefone } = req.body;
  try {
    const updatedUser = await prisma.user.update({
      where: { id: String(id) },
      data: { name, email, cpf, telefone },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        telefone: true,
      },
    });
    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar usuário." });
  }
});

module.exports = router;