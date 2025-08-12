// src/routes/buscarNomeCodBarras.js (ou o arquivo que você já usa) — COMPLETO
const express = require('express');
const router = express.Router();
// import dinâmico para evitar erro em ambientes sem ESM
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

/**
 * @swagger
 * tags:
 *   - name: Produtos
 *     description: Utilidades para produtos (busca por código de barras)
 *
 * components:
 *   schemas:
 *     BuscaNomePorBarrasResponse:
 *       type: object
 *       properties:
 *         nome:
 *           type: string
 *           description: Nome encontrado para o código de barras (pode ser vazio)
 *       example:
 *         nome: "Refrigerante Cola 350ml"
 *     ErroResponse:
 *       type: object
 *       properties:
 *         erro:
 *           type: string
 *       example:
 *         erro: "Produto não encontrado"
 */

/**
 * @swagger
 * /buscar-nome-codbarras/{codBarras}:
 *   get:
 *     tags: [Produtos]
 *     summary: Retorna um nome provável do produto a partir do código de barras
 *     description: Consulta a API pública do OpenFoodFacts e retorna o nome (ou string vazia).
 *     parameters:
 *       - in: path
 *         name: codBarras
 *         required: true
 *         schema:
 *           type: string
 *         description: Código de barras (EAN/UPC)
 *     responses:
 *       200:
 *         description: Nome obtido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BuscaNomePorBarrasResponse'
 *       400:
 *         description: Código de barras ausente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroResponse'
 *       404:
 *         description: Produto não encontrado na base pública
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroResponse'
 *       500:
 *         description: Erro na consulta externa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroResponse'
 */
router.get('/buscar-nome-codbarras/:codBarras', async (req, res) => {
  const { codBarras } = req.params;
  if (!codBarras) return res.status(400).json({ erro: "Código de barras obrigatório" });

  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${codBarras}.json`;
    const response = await fetch(url, { timeout: 8000 });

    if (!response.ok) {
      return res.status(404).json({ erro: "Produto não encontrado" });
    }

    const data = await response.json();

    const nome =
      data?.product?.product_name ||
      data?.product?.generic_name ||
      (Array.isArray(data?.product?.brands_tags) && data.product.brands_tags[0]) ||
      "";

    return res.json({ nome });
  } catch (e) {
    console.error('[GET /buscar-nome-codbarras/:codBarras] Erro:', e?.message || e);
    return res.status(500).json({ erro: "Erro na busca do produto" });
  }
});

module.exports = router;
