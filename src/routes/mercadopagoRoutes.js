// src/routes/mercadopagoRoutes.js
const express = require("express");
const auth = require("../middleware/auth");

const router = express.Router();

const BACK_URL = process.env.MP_RETURN_URL; // já está no .env

if (!BACK_URL) {
  console.warn("[MP] MP_RETURN_URL ausente no .env");
}

/**
 * POST /api/mercadopago/criar-assinatura
 * body: { email: string, planoId: string }
 * -> retorna { url } para redirecionar ao checkout hospedado do Mercado Pago
 */
router.post("/criar-assinatura", auth, async (req, res) => {
  try {
    const { email, planoId } = req.body;

    if (!planoId) {
      return res.status(400).json({ error: "planoId é obrigatório" });
    }

    // URL do checkout de assinaturas do Mercado Pago (Brasil)
    const base = "https://www.mercadopago.com.br/subscriptions/checkout";

    const qs = new URLSearchParams({
      preapproval_plan_id: planoId,
      back_url: BACK_URL,             // para onde o MP retorna após o fluxo
      ...(email ? { payer_email: email } : {}) // opcional, pré-preenche o e-mail
    });

    const url = `${base}?${qs.toString()}`;
    return res.json({ url });
  } catch (err) {
    console.error("[MP checkout assinatura] erro:", err);
    return res.status(500).json({ error: "Falha ao gerar URL de checkout" });
  }
});

module.exports = router;
