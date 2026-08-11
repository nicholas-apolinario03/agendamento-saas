import axios from "axios";

const mercadoPagoApi = axios.create({
    baseURL: "https://api.mercadopago.com",
    headers: {
        Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
    }
});

// ======================================================
// PLANOS
// ======================================================

type CriarPlanoMercadoPago = {
    nome: string;
    preco: number;
    referencia: string;
};

export async function criarPlanoMercadoPago({
    nome,
    preco,
    referencia
}: CriarPlanoMercadoPago) {
    const resposta = await mercadoPagoApi.post("/preapproval_plan", {
        reason: nome,

        // Identifica o plano no nosso sistema.
        // Não identifica a empresa que fará a assinatura.
        external_reference: referencia,

        auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: preco,
            currency_id: "BRL"
        },

        back_url: `${process.env.FRONTEND_URL}/dashboard`
    });

    return resposta.data;
}

export async function buscarPlanoMercadoPago(
    mercadoPagoPlanoId: string
) {
    const resposta = await mercadoPagoApi.get(
        `/preapproval_plan/${mercadoPagoPlanoId}`
    );

    return resposta.data;
}

// ======================================================
// ASSINATURAS
// ======================================================

type CriarAssinaturaPendenteMercadoPago = {
    planoMercadoPagoId: string;
    empresaId: number;
    planoId: number;
    email: string;
};

/**
 * Cria uma assinatura individual no Mercado Pago.
 *
 * O ponto mais importante deste fluxo é o external_reference:
 *
 * NEWERIS_EMPRESA_10_PLANO_2
 *
 * Quando o Mercado Pago enviar o webhook, buscamos a assinatura
 * e recuperamos essa referência para descobrir qual empresa e
 * qual plano devem ser atualizados no nosso banco.
 */
export async function criarAssinaturaPendenteMercadoPago({
    planoMercadoPagoId,
    empresaId,
    planoId,
    email
}: CriarAssinaturaPendenteMercadoPago) {
    const resposta = await mercadoPagoApi.post("/preapproval", {
        preapproval_plan_id: planoMercadoPagoId,

        payer_email: email,

        external_reference:
            `NEWERIS_EMPRESA_${empresaId}_PLANO_${planoId}`,

        back_url:
            `${process.env.FRONTEND_URL}/dashboard`,

        status: "pending"
    });

    return resposta.data;
}

export async function buscarAssinaturaMercadoPago(
    assinaturaId: string
) {
    const resposta = await mercadoPagoApi.get(
        `/preapproval/${assinaturaId}`
    );

    return resposta.data;
}