// src/routes/mercadopagoRoutes.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.warn("[MercadoPago] MERCADOPAGO_ACCESS_TOKEN não definido no .env");
}

/**
 * Devolve o init_point de um preapproval_plan (plano de assinatura).
 * Request:  POST /api/mercadopago/criar-assinatura
 * Body:     { planoId: string }
 * Response: { init_point, plan: { id, reason, amount, currency, frequency, frequency_type } }
 *
 * Observação:
 *  - Não exigimos cartão no back. O cliente finaliza o pagamento no checkout do Mercado Pago.
 */
router.post("/criar-assinatura", async (req, res) => {
  try {
    const { planoId } = req.body;

    if (!planoId) {
      return res.status(400).json({ error: "Campo obrigatório: planoId" });
    }

    // Busca os dados do plano para pegar o init_point
    const { data: plan } = await axios.get(
      `https://api.mercadopago.com/preapproval_plan/${encodeURIComponent(planoId)}`,
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    // init_point normalmente vem no objeto do plano
    const initPoint = plan.init_point;

    if (!initPoint) {
      return res.status(500).json({
        error: "init_point não retornado pelo Mercado Pago para este plano.",
      });
    }

    // Dados úteis para o front
    const info = {
      id: plan.id,
      reason: plan.reason,
      amount: plan.auto_recurring?.transaction_amount,
      currency: plan.auto_recurring?.currency_id,
      frequency: plan.auto_recurring?.frequency,
      frequency_type: plan.auto_recurring?.frequency_type,
    };

    return res.json({ init_point: initPoint, plan: info });
  } catch (error) {
    const payload = error.response?.data || { message: error.message };
    console.error("[MP criar-assinatura via plano] Erro:", payload);
    res.status(500).json({ error: payload });
  }
});

module.exports = router;
