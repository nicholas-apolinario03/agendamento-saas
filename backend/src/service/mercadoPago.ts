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
    const resposta = await mercadoPagoApi.post(
        "/preapproval_plan",
        {
            reason: nome,

            external_reference: referencia,

            auto_recurring: {
                frequency: 1,
                frequency_type: "months",
                transaction_amount: preco,
                currency_id: "BRL"
            },

            back_url:
                `${process.env.FRONTEND_URL}/dashboard`
        }
    );

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

type CriarAssinaturaMercadoPago = {
    planoMercadoPagoId: string;
    cardTokenId: string;
    empresaId: number;
    planoId: number;
    email: string;
};

/**
 * Cria uma assinatura individual associada ao plano.
 *
 * Os dados reais do cartão NÃO chegam neste serviço.
 * O frontend usa MercadoPago.js e envia somente o CardToken.
 */
export async function criarAssinaturaMercadoPago({
    planoMercadoPagoId,
    cardTokenId,
    empresaId,
    planoId,
    email
}: CriarAssinaturaMercadoPago) {
    const resposta = await mercadoPagoApi.post(
        "/preapproval",
        {
            preapproval_plan_id:
                planoMercadoPagoId,

            payer_email:
                email,

            card_token_id:
                cardTokenId,

            external_reference:
                `NEWERIS_EMPRESA_${empresaId}_PLANO_${planoId}`,

            back_url:
                `${process.env.FRONTEND_URL}/dashboard`,

            /*
             * Para assinatura associada a um plano,
             * o Mercado Pago exige status authorized
             * quando card_token_id é enviado.
             */
            status:
                "authorized"
        }
    );

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


// ======================================================
// FATURAS / COBRANÇAS RECORRENTES
// ======================================================

/**
 * Busca a fatura ("authorized payment") gerada pela assinatura.
 *
 * O webhook subscription_authorized_payment envia o ID dessa
 * fatura em data.id. Os detalhes ficam disponíveis em:
 *
 * GET /authorized_payments/{id}
 */
export async function buscarFaturaMercadoPago(
    authorizedPaymentId: string
) {
    const resposta = await mercadoPagoApi.get(
        `/authorized_payments/${authorizedPaymentId}`
    );

    return resposta.data;
}


// ======================================================
// GERENCIAMENTO DA ASSINATURA
// ======================================================

/**
 * Altera o valor que será usado nas próximas cobranças
 * da assinatura existente.
 *
 * Não cria uma segunda assinatura.
 */
export async function alterarValorAssinaturaMercadoPago(
    assinaturaId: string,
    novoValor: number
) {
    const resposta = await mercadoPagoApi.put(
        `/preapproval/${assinaturaId}`,
        {
            auto_recurring: {
                transaction_amount: novoValor,
                currency_id: "BRL"
            }
        }
    );

    return resposta.data;
}

/**
 * Atualiza a referência usada para sincronizar a assinatura
 * do Mercado Pago com empresa/plano do Neweris.
 */
export async function atualizarReferenciaAssinaturaMercadoPago(
    assinaturaId: string,
    empresaId: number,
    planoId: number
) {
    const resposta = await mercadoPagoApi.put(
        `/preapproval/${assinaturaId}`,
        {
            external_reference:
                `NEWERIS_EMPRESA_${empresaId}_PLANO_${planoId}`
        }
    );

    return resposta.data;
}

/**
 * Upgrade imediato:
 * altera o valor e a referência da MESMA assinatura.
 */
export async function fazerUpgradeAssinaturaMercadoPago({
    assinaturaId,
    novoValor,
    empresaId,
    planoId
}: {
    assinaturaId: string;
    novoValor: number;
    empresaId: number;
    planoId: number;
}) {
    const resposta = await mercadoPagoApi.put(
        `/preapproval/${assinaturaId}`,
        {
            external_reference:
                `NEWERIS_EMPRESA_${empresaId}_PLANO_${planoId}`,

            auto_recurring: {
                transaction_amount: novoValor,
                currency_id: "BRL"
            }
        }
    );

    return resposta.data;
}

/**
 * Cancela novas cobranças da assinatura.
 *
 * A documentação atual do Mercado Pago usa "canceled".
 */
export async function cancelarAssinaturaMercadoPago(
    assinaturaId: string
) {
    const resposta = await mercadoPagoApi.put(
        `/preapproval/${assinaturaId}`,
        {
            status: "canceled"
        }
    );

    return resposta.data;
}