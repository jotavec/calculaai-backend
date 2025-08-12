const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @swagger
 * tags:
 *   - name: EncargosSobreVenda
 *     description: Configuração de impostos, taxas e encargos incidentes sobre a venda do usuário
 *
 * components:
 *   schemas:
 *     EncargoItem:
 *       type: object
 *       properties:
 *         percent: { type: number, example: 3.5 }
 *         value:   { type: number, example: 120.00 }
 *
 *     EncargosSobreVendaPayload:
 *       type: object
 *       properties:
 *         icms:           { $ref: '#/components/schemas/EncargoItem' }
 *         iss:            { $ref: '#/components/schemas/EncargoItem' }
 *         pisCofins:      { $ref: '#/components/schemas/EncargoItem' }
 *         irpjCsll:       { $ref: '#/components/schemas/EncargoItem' }
 *         ipi:            { $ref: '#/components/schemas/EncargoItem' }
 *         debito:         { $ref: '#/components/schemas/EncargoItem' }
 *         credito:        { $ref: '#/components/schemas/EncargoItem' }
 *         boleto:         { $ref: '#/components/schemas/EncargoItem' }
 *         pix:            { $ref: '#/components/schemas/EncargoItem' }
 *         gateway:        { $ref: '#/components/schemas/EncargoItem' }
 *         marketing:      { $ref: '#/components/schemas/EncargoItem' }
 *         delivery:       { $ref: '#/components/schemas/EncargoItem' }
 *         saas:           { $ref: '#/components/schemas/EncargoItem' }
 *         colaboradores:  { $ref: '#/components/schemas/EncargoItem' }
 *         creditoParcelado:
 *           type: array
 *           description: Parcelas de cartão de crédito com percentuais específicos
 *           items:
 *             type: object
 *             properties:
 *               parcelas: { type: integer, example: 3 }
 *               percent:  { type: number,  example: 5.2 }
 *         outros:
 *           type: array
 *           description: Lista livre de outros encargos
 *           items:
 *             type: object
 *             properties:
 *               nome:    { type: string,  example: "Taxa de plataforma" }
 *               percent: { type: number,  example: 1.2 }
 *               value:   { type: number,  example: 0 }
 *
 *     EncargosSobreVendaResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/EncargosSobreVendaPayload'
 *         - type: object
 *           properties:
 *             id:        { type: string, format: uuid, nullable: true }
 *             createdAt: { type: string, format: date-time, nullable: true }
 *             updatedAt: { type: string, format: date-time, nullable: true }
 */

/**
 * @swagger
 * /encargos-sobre-venda:
 *   get:
 *     tags: [EncargosSobreVenda]
 *     summary: Retorna os encargos sobre venda do usuário autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Configuração atual (valores zerados se ainda não existir)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EncargosSobreVendaResponse'
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.userId;
    let registro = await prisma.encargosSobreVenda.findFirst({ where: { userId } });
    if (!registro) {
      return res.json({
        icms: { percent: 0, value: 0 },
        iss: { percent: 0, value: 0 },
        pisCofins: { percent: 0, value: 0 },
        irpjCsll: { percent: 0, value: 0 },
        ipi: { percent: 0, value: 0 },
        debito: { percent: 0, value: 0 },
        credito: { percent: 0, value: 0 },
        boleto: { percent: 0, value: 0 },
        pix: { percent: 0, value: 0 },
        gateway: { percent: 0, value: 0 },
        marketing: { percent: 0, value: 0 },
        delivery: { percent: 0, value: 0 },
        saas: { percent: 0, value: 0 },
        colaboradores: { percent: 0, value: 0 },
        creditoParcelado: [],
        outros: [],
        id: null,
        createdAt: null,
        updatedAt: null
      });
    }
    const { data, createdAt, updatedAt, id } = registro;
    const base = data || {};
    res.json({ ...base, id, createdAt, updatedAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /encargos-sobre-venda:
 *   post:
 *     tags: [EncargosSobreVenda]
 *     summary: Cria ou atualiza os encargos sobre venda do usuário autenticado
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EncargosSobreVendaPayload'
 *     responses:
 *       200:
 *         description: Salvo com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const payload = req.body;

    let registro = await prisma.encargosSobreVenda.findFirst({ where: { userId } });
    if (registro) {
      await prisma.encargosSobreVenda.update({
        where: { id: registro.id },
        data: { data: payload }
      });
    } else {
      await prisma.encargosSobreVenda.create({
        data: { userId, data: payload }
      });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
