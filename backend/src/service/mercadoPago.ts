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
    empresaId: number;
    email: string;
};

export async function criarAssinaturaMercadoPago({
    planoMercadoPagoId,
    empresaId,
    email
}: CriarAssinaturaMercadoPago) {

    const resposta = await mercadoPagoApi.post("/preapproval", {
        preapproval_plan_id: planoMercadoPagoId,

        payer_email: email,

        external_reference: `EMPRESA_${empresaId}`,

        back_url: `${process.env.FRONTEND_URL}/dashboard`,

        status: "pending"
    });

    return resposta.data;
}