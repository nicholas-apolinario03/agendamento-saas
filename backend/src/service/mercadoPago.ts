import axios from "axios";
import { randomUUID } from "crypto";

const mercadoPagoApi = axios.create({
    baseURL: "https://api.mercadopago.com",
    headers: {
        Authorization:
            `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        "Content-Type":
            "application/json"
    }
});

/*
 * API separada para cobranças avulsas do upgrade.
 */
const mercadoPagoPaymentApi = axios.create({
    baseURL: "https://api.mercadopago.com",
    headers: {
        Authorization:
            `Bearer ${
                process.env.MERCADO_PAGO_PAYMENT_ACCESS_TOKEN ||
                process.env.MERCADO_PAGO_ACCESS_TOKEN
            }`,
        "Content-Type":
            "application/json"
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
    const resposta =
        await mercadoPagoApi.post(
            "/preapproval_plan",
            {
                reason:
                    nome,

                external_reference:
                    referencia,

                auto_recurring: {
                    frequency:
                        1,

                    frequency_type:
                        "months",

                    transaction_amount:
                        preco,

                    currency_id:
                        "BRL"
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
    const resposta =
        await mercadoPagoApi.get(
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
    deviceId?: string;
};

/**
 * Cria uma assinatura individual associada ao plano.
 *
 * Os dados reais do cartão NÃO chegam neste serviço.
 * O frontend usa MercadoPago.js e envia somente o CardToken.
 *
 * O Device ID é enviado no header X-meli-session-id
 * para enriquecer a análise antifraude do Mercado Pago.
 */
export async function criarAssinaturaMercadoPago({
    planoMercadoPagoId,
    cardTokenId,
    empresaId,
    planoId,
    email,
    deviceId
}: CriarAssinaturaMercadoPago) {
    const resposta =
        await mercadoPagoApi.post(
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

                status:
                    "authorized"
            },

            {
                headers: {
                    ...(deviceId
                        ? {
                            "X-meli-session-id":
                                deviceId
                        }
                        : {})
                }
            }
        );

    return resposta.data;
}


// ======================================================
// ASSINATURA COM CHECKOUT HOSPEDADO
// ======================================================

type CriarAssinaturaHospedadaMercadoPago = {
    nomePlano: string;
    preco: number;
    empresaId: number;
    planoId: number;
    email: string;
};

/**
 * Cria uma assinatura SEM preapproval_plan_id e SEM CardToken.
 *
 * O Mercado Pago recebe a recorrência diretamente em
 * auto_recurring e devolve um init_point para que o
 * comprador finalize o pagamento no checkout hospedado.
 *
 * O external_reference continua identificando
 * empresa + plano no Neweris.
 */
export async function criarAssinaturaHospedadaMercadoPago({
    nomePlano,
    preco,
    empresaId,
    planoId,
    email
}: CriarAssinaturaHospedadaMercadoPago) {
    const resposta =
        await mercadoPagoApi.post(
            "/preapproval",
            {
                reason:
                    `NewerisBook ${nomePlano}`,

                payer_email:
                    email,

                external_reference:
                    `NEWERIS_EMPRESA_${empresaId}_PLANO_${planoId}`,

                back_url:
                    `${process.env.FRONTEND_URL}/dashboard`,

                auto_recurring: {
                    frequency:
                        1,

                    frequency_type:
                        "months",

                    transaction_amount:
                        preco,

                    currency_id:
                        "BRL"
                },

                /*
                 * Sem meio de pagamento definido.
                 * O comprador concluirá o pagamento
                 * pelo init_point retornado pelo MP.
                 */
                status:
                    "pending"
            }
        );

    return resposta.data;
}


export async function buscarAssinaturaMercadoPago(
    assinaturaId: string
) {
    const resposta =
        await mercadoPagoApi.get(
            `/preapproval/${assinaturaId}`
        );

    return resposta.data;
}

// ======================================================
// FATURAS / COBRANÇAS RECORRENTES
// ======================================================

export async function buscarFaturaMercadoPago(
    authorizedPaymentId: string
) {
    const resposta =
        await mercadoPagoApi.get(
            `/authorized_payments/${authorizedPaymentId}`
        );

    return resposta.data;
}

// ======================================================
// GERENCIAMENTO DA ASSINATURA
// ======================================================

export async function alterarValorAssinaturaMercadoPago(
    assinaturaId: string,
    novoValor: number
) {
    const resposta =
        await mercadoPagoApi.put(
            `/preapproval/${assinaturaId}`,
            {
                auto_recurring: {
                    transaction_amount:
                        novoValor,

                    currency_id:
                        "BRL"
                }
            }
        );

    return resposta.data;
}

export async function atualizarReferenciaAssinaturaMercadoPago(
    assinaturaId: string,
    empresaId: number,
    planoId: number
) {
    const resposta =
        await mercadoPagoApi.put(
            `/preapproval/${assinaturaId}`,
            {
                external_reference:
                    `NEWERIS_EMPRESA_${empresaId}_PLANO_${planoId}`
            }
        );

    return resposta.data;
}

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
    const resposta =
        await mercadoPagoApi.put(
            `/preapproval/${assinaturaId}`,
            {
                external_reference:
                    `NEWERIS_EMPRESA_${empresaId}_PLANO_${planoId}`,

                auto_recurring: {
                    transaction_amount:
                        novoValor,

                    currency_id:
                        "BRL"
                }
            }
        );

    return resposta.data;
}

export async function cancelarAssinaturaMercadoPago(
    assinaturaId: string
) {
    const resposta =
        await mercadoPagoApi.put(
            `/preapproval/${assinaturaId}`,
            {
                status:
                    "canceled"
            }
        );

    return resposta.data;
}

// ======================================================
// COBRANÇA PROPORCIONAL DE UPGRADE
// ======================================================

type CriarPagamentoUpgradeMercadoPago = {
    cardTokenId: string;
    valor: number;
    paymentMethodId: string;
    installments: number;
    issuerId?: string | number;
    email: string;
    empresaId: number;
    planoAtualId: number;
    planoNovoId: number;
    deviceId?: string;
};

export async function criarPagamentoUpgradeMercadoPago({
    cardTokenId,
    valor,
    paymentMethodId,
    installments,
    issuerId,
    email,
    empresaId,
    planoAtualId,
    planoNovoId,
    deviceId
}: CriarPagamentoUpgradeMercadoPago) {
    const payerEmail =
        process.env.MERCADO_PAGO_TEST_PAYER_EMAIL ||
        email;

    const body: any = {
        transaction_amount:
            valor,

        token:
            cardTokenId,

        description:
            "Upgrade de assinatura NewerisBook",

        installments,

        payment_method_id:
            paymentMethodId,

        payer: {
            email:
                payerEmail
        },

        external_reference:
            `NEWERIS_UPGRADE_EMPRESA_${empresaId}_DE_${planoAtualId}_PARA_${planoNovoId}`,

        binary_mode:
            true
    };

    if (
        issuerId !== undefined &&
        issuerId !== null &&
        String(issuerId).length > 0
    ) {
        body.issuer_id =
            issuerId;
    }

    const resposta =
        await mercadoPagoPaymentApi.post(
            "/v1/payments",

            body,

            {
                headers: {
                    "X-Idempotency-Key":
                        randomUUID(),

                    ...(deviceId
                        ? {
                            "X-meli-session-id":
                                deviceId
                        }
                        : {})
                }
            }
        );

    return resposta.data;
}

// ======================================================
// BUSCAR COBRANÇAS DA ASSINATURA
// ======================================================

export async function buscarCobrancasAssinaturaMercadoPago(
    assinaturaId: string
) {
    const resposta =
        await mercadoPagoApi.get(
            "/authorized_payments/search",
            {
                params: {
                    preapproval_id:
                        assinaturaId
                }
            }
        );

    return resposta.data;
}
