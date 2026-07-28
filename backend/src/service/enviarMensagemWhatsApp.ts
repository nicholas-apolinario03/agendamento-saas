type EnviarMensagemWhatsAppParams = {
    telefone: string;
    mensagem: string;
};

type RespostaEnvioWhatsApp = {
    messaging_product?: string;
    contacts?: Array<{
        input: string;
        wa_id: string;
    }>;
    messages?: Array<{
        id: string;
    }>;
    error?: {
        message?: string;
        type?: string;
        code?: number;
        error_subcode?: number;
        fbtrace_id?: string;
        error_data?: {
            messaging_product?: string;
            details?: string;
        };
    };
};

function normalizarTelefone(
    telefone: string
) {
    return telefone.replace(/\D/g, "");
}

export async function enviarMensagemWhatsApp({
    telefone,
    mensagem,
}: EnviarMensagemWhatsAppParams) {

    const token =
        process.env.WHATSAPP_TOKEN;

    const phoneNumberId =
        process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token) {
        throw new Error(
            "WHATSAPP_TOKEN não foi configurado"
        );
    }

    if (!phoneNumberId) {
        throw new Error(
            "WHATSAPP_PHONE_NUMBER_ID não foi configurado"
        );
    }

    const telefoneNormalizado =
        normalizarTelefone(telefone);

    if (!telefoneNormalizado) {
        throw new Error(
            "Telefone do destinatário inválido"
        );
    }

    const versaoGraph =
        process.env.META_GRAPH_API_VERSION ??
        "v24.0";

    const url =
        `https://graph.facebook.com/` +
        `${versaoGraph}/` +
        `${phoneNumberId}/messages`;

    const resposta =
        await fetch(url, {
            method: "POST",

            headers: {
                Authorization:
                    `Bearer ${token}`,

                "Content-Type":
                    "application/json",
            },

            body: JSON.stringify({
                messaging_product:
                    "whatsapp",

                recipient_type:
                    "individual",

                to:
                    telefoneNormalizado,

                type:
                    "text",

                text: {
                    preview_url:
                        false,

                    body:
                        mensagem,
                },
            }),
        });

    const dados =
        await resposta.json() as
            RespostaEnvioWhatsApp;

    if (!resposta.ok) {

        console.error(
            "Erro retornado pela Meta:",
            JSON.stringify(
                dados,
                null,
                2
            )
        );

        const detalhes =
            dados.error?.error_data
                ?.details;

        const mensagemErro =
            dados.error?.message ??
            detalhes ??
            "Erro desconhecido da Meta";

        const codigo =
            dados.error?.code;

        throw new Error(
            codigo
                ? `Erro ${codigo}: ${mensagemErro}`
                : mensagemErro
        );
    }

    const mensagemId =
        dados.messages?.[0]?.id;

    console.log(
        "Mensagem enviada pela API do WhatsApp:",
        {
            telefone:
                telefoneNormalizado,

            mensagemId:
                mensagemId ??
                "não informado",
        }
    );

    return {
        mensagemId,
        dados,
    };
}