const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

router.get('/buscar-nome-codbarras/:codBarras', async (req, res) => {
  const { codBarras } = req.params;
  if (!codBarras) return res.status(400).json({ erro: "Código de barras obrigatório" });
  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${codBarras}.json`;
    const response = await fetch(url);
    if (!response.ok) return res.status(404).json({ erro: "Produto não encontrado" });
    const data = await response.json();

    const nome = data.product?.product_name ||
                 data.product?.generic_name ||
                 (data.product?.brands_tags && data.product.brands_tags[0]) ||
                 "";

    res.json({ nome });
  } catch (e) {
    res.status(500).json({ erro: "Erro na busca do produto" });
  }
});

module.exports = router;
