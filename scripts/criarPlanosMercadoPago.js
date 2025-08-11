// scripts/criarPlanosMercadoPago.js
/**
 * Cria planos (preapproval_plan) no Mercado Pago em ambiente de TESTE.
 * Rode: node scripts/criarPlanosMercadoPago.js
 */

require("dotenv").config();
const axios = require("axios");

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || "";
const RETURN_URL = process.env.MP_RETURN_URL || "";

if (!ACCESS_TOKEN) {
  console.error("[ERRO] MERCADOPAGO_ACCESS_TOKEN não encontrado no .env");
  process.exit(1);
}

function isValidHttpsUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

async function criarPlano({ nome, preco, descricao }) {
  try {
    const body = {
      reason: nome,
      auto_recurring: {
        frequency: 1,               // mensal
        frequency_type: "months",
        transaction_amount: preco,  // 39.9 / 59.9 etc
        currency_id: "BRL",
      },
      description: descricao,
      status: "active",
    };

    if (isValidHttpsUrl(RETURN_URL)) {
      body.back_url = RETURN_URL;
      console.log(`↪️  Usando back_url: ${RETURN_URL}`);
    } else {
      console.log("↪️  Sem back_url (MP_RETURN_URL ausente/inválida); criando plano mesmo assim.");
    }

    const { data } = await axios.post(
      "https://api.mercadopago.com/preapproval_plan",
      body,
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
    const payload = err.response?.data || { message: err.message, status: err.response?.status };
    console.error(`❌ Erro ao criar plano "${nome}":`, JSON.stringify(payload, null, 2));
    throw err;
  }
}

(async function main() {
  console.log("▶️  Criando planos...");
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
    console.log("\nCole esses IDs no TabelaPlanos.jsx.");
  } catch {
    // Erro já logado acima
  }
})();
