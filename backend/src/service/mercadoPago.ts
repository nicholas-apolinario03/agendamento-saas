import axios from "axios";

const mercadoPagoApi = axios.create({
    baseURL: "https://api.mercadopago.com",
    headers: {
        Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
    },
});

type CriarPlanoMercadoPago = {
    nome: string;
    preco: number;
    referencia: string;
};

export async function criarPlanoMercadoPago({
    nome,
    preco,
    referencia,
}: CriarPlanoMercadoPago) {

    const resposta = await mercadoPagoApi.post("/preapproval_plan", {
        reason: nome,

        external_reference: referencia,

        auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: preco,
            currency_id: "BRL",
        },

        back_url: `${process.env.URL_FRONTEND}/dashboard`,
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
type CriarAssinaturaMercadoPago = {
    planoMercadoPagoId: string;
    cardTokenId: string;
    email: string;
    referencia: string;
};

export async function criarAssinaturaMercadoPago({
    planoMercadoPagoId,
    cardTokenId,
    email,
    referencia
}: CriarAssinaturaMercadoPago) {

    const resposta = await mercadoPagoApi.post(
        "/preapproval",
        {
            preapproval_plan_id: planoMercadoPagoId,

            payer_email: email,

            card_token_id: cardTokenId,

            external_reference: referencia,

            back_url:
                `${process.env.FRONTEND_URL}/dashboard`,

            status: "authorized"
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
export async function criarAssinaturaPendenteMercadoPago({
    planoMercadoPagoId,
    empresaId,
    planoId,
}: {
    planoMercadoPagoId: string;
    empresaId: number;
    planoId: number;
}) {

    const resposta = await mercadoPagoApi.post("/preapproval", {
        preapproval_plan_id: planoMercadoPagoId,

        external_reference:
            `NEWERIS_EMPRESA_${empresaId}_PLANO_${planoId}`,

        back_url:
            `${process.env.FRONTEND_URL}/dashboard`,

        status: "pending"
    });

    return resposta.data;
}