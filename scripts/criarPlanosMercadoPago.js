// scripts/criarPlanosMercadoPago.js
/**
 * Script para criar planos de assinatura (preapproval_plan) no Mercado Pago.
 * Usa o ACCESS TOKEN de TESTE do arquivo .env (MERCADOPAGO_ACCESS_TOKEN).
 * Execute com: node scripts/criarPlanosMercadoPago.js
 */

require("dotenv").config();
const axios = require("axios");

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("[ERRO] MERCADOPAGO_ACCESS_TOKEN não encontrado no .env");
  process.exit(1);
}

// Utilitário: cria um plano e retorna o ID
async function criarPlano({ nome, preco, descricao }) {
  try {
    const { data } = await axios.post(
      "https://api.mercadopago.com/preapproval_plan",
      {
        reason: nome,
        auto_recurring: {
          frequency: 1,               // mensal
          frequency_type: "months",
          transaction_amount: preco,  // ex.: 39.9
          currency_id: "BRL",
        },
        // Precisa ser HTTPS público (não pode localhost)
        back_url: "https://example.com/pagamento-retorno",
        description: descricao,
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Plano "${nome}" criado! ID: ${data.id}`);
    return data.id;
  } catch (err) {
    const payload = err.response?.data || { message: err.message };
    console.error(`❌ Erro ao criar plano "${nome}":`, JSON.stringify(payload, null, 2));
    throw err;
  }
}

(async function main() {
  try {
    const idPadrao = await criarPlano({
      nome: "Padrão",
      preco: 39.9,
      descricao: "Plano Padrão mensal",
    });

    const idPremium = await criarPlano({
      nome: "Premium",
      preco: 59.9,
      descricao: "Plano Premium mensal",
    });

    console.log("\n🧾 IDs criados:");
    console.log("Padrão :", idPadrao);
    console.log("Premium:", idPremium);
  } catch {
    // Erros já foram logados acima
  }
})();
