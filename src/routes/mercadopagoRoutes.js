// src/routes/mercadopagoRoutes.js
const express = require("express");
const auth = require("../middleware/auth");

const router = express.Router();

const BACK_URL = process.env.MP_RETURN_URL; // já está no .env

if (!BACK_URL) {
  console.warn("[MP] MP_RETURN_URL ausente no .env");
}

/**
 * @swagger
 * tags:
 *   - name: MercadoPago
 *     description: Integração com o checkout de assinaturas do Mercado Pago
 *
 * components:
 *   schemas:
 *     CriarAssinaturaRequest:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "cliente@exemplo.com"
 *         planoId:
 *           type: string
 *           description: ID do plano de assinatura criado no Mercado Pago
 *           example: "2c93808484a0a6f90184a4b3d1e12f25"
 *       required:
 *         - planoId
 *     CriarAssinaturaResponse:
 *       type: object
 *       properties:
 *         url:
 *           type: string
 *           format: uri
 *           example: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=XYZ..."
 */

/**
 * @swagger
 * /mercadopago/criar-assinatura:
 *   post:
 *     tags: [MercadoPago]
 *     summary: Gera a URL de checkout de assinatura do Mercado Pago
 *     description: Retorna a URL para redirecionar o cliente ao checkout hospedado do Mercado Pago para concluir a assinatura.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CriarAssinaturaRequest'
 *     responses:
 *       200:
 *         description: URL de checkout gerada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CriarAssinaturaResponse'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
router.post("/criar-assinatura", auth, async (req, res) => {
  try {
    const { email, planoId } = req.body;

    if (!planoId) {
      return res.status(400).json({ error: "planoId é obrigatório" });
    }

    const base = "https://www.mercadopago.com.br/subscriptions/checkout";

    const qs = new URLSearchParams({
      preapproval_plan_id: planoId,
      back_url: BACK_URL,
      ...(email ? { payer_email: email } : {})
    });

    const url = `${base}?${qs.toString()}`;
    return res.json({ url });
  } catch (err) {
    console.error("[MP checkout assinatura] erro:", err);
    return res.status(500).json({ error: "Falha ao gerar URL de checkout" });
  }
});

module.exports = router;
