const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Listar categorias do usuário
exports.getCategorias = async (req, res) => {
  const userId = req.user.id; // Assumindo que você pega o user do token
  const categorias = await prisma.categoria.findMany({ where: { userId } });
  res.json(categorias);
};

// Adicionar categoria
exports.addCategoria = async (req, res) => {
  const userId = req.user.id;
  const { nome } = req.body;
  if (!nome) return res.status(400).json({ error: "Nome obrigatório" });
  const categoria = await prisma.categoria.create({
    data: { nome, userId }
  });
  res.status(201).json(categoria);
};

// Remover categoria
exports.deleteCategoria = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const cat = await prisma.categoria.findFirst({ where: { id: Number(id), userId } });
  if (!cat) return res.status(404).json({ error: "Não encontrado" });
  await prisma.categoria.delete({ where: { id: Number(id) } });
  res.sendStatus(204);
};
// Editar categoria
exports.updateCategoria = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { nome } = req.body;
  if (!nome) return res.status(400).json({ error: "Nome obrigatório" });

  // Verifica se a categoria existe e pertence ao usuário
  const cat = await prisma.categoria.findFirst({ where: { id: Number(id), userId } });
  if (!cat) return res.status(404).json({ error: "Não encontrado" });

  // Atualiza o nome
  const categoriaAtualizada = await prisma.categoria.update({
    where: { id: Number(id) },
    data: { nome },
  });
  res.json(categoriaAtualizada);
};
