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

    const versaoGraph =
        process.env.META_GRAPH_API_VERSION ??
        "v24.0";

    console.log(
        "CONFIGURAÇÃO DO ENVIO:",
        {
            telefoneRecebido:
                telefone,

            phoneNumberId,

            tokenExiste:
                Boolean(token),

            /*
             * Mostra somente o início para confirmar
             * se a variável foi carregada.
             *
             * Nunca mostre o token completo.
             */
            inicioToken:
                token?.slice(0, 6),

            modoTeste:
                process.env
                    .WHATSAPP_MODO_TESTE,

            versaoGraph,
        }
    );

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
        normalizarTelefone(
            telefone
        );

    if (!telefoneNormalizado) {
        throw new Error(
            "Telefone do destinatário inválido"
        );
    }

    if (!mensagem.trim()) {
        throw new Error(
            "A mensagem não pode estar vazia"
        );
    }

    const url =
        `https://graph.facebook.com/` +
        `${versaoGraph}/` +
        `${phoneNumberId}/messages`;

    const corpoRequisicao = {
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
    };

    console.log(
        "TENTANDO ENVIAR RESPOSTA:",
        {
            url,
            telefone:
                telefoneNormalizado,
            mensagem,
        }
    );

    let resposta: Response;

    try {
        resposta =
            await fetch(
                url,
                {
                    method:
                        "POST",

                    headers: {
                        Authorization:
                            `Bearer ${token}`,

                        "Content-Type":
                            "application/json",
                    },

                    body:
                        JSON.stringify(
                            corpoRequisicao
                        ),
                }
            );

    } catch (erro) {

        console.error(
            "ERRO DE CONEXÃO COM A META:",
            erro
        );

        throw new Error(
            erro instanceof Error
                ? `Falha ao acessar a API da Meta: ${erro.message}`
                : "Falha ao acessar a API da Meta"
        );
    }

    let dados:
        RespostaEnvioWhatsApp;

    try {
        dados =
            await resposta.json() as
                RespostaEnvioWhatsApp;

    } catch (erro) {

        console.error(
            "A META RETORNOU UMA RESPOSTA INVÁLIDA:",
            {
                status:
                    resposta.status,

                statusText:
                    resposta.statusText,

                erro,
            }
        );

        throw new Error(
            `Resposta inválida da Meta. Status ${resposta.status}`
        );
    }

    console.log(
        "RESPOSTA DA META:",
        {
            status:
                resposta.status,

            statusText:
                resposta.statusText,

            ok:
                resposta.ok,

            dados,
        }
    );

    if (!resposta.ok) {

        console.error(
            "ERRO RETORNADO PELA META:",
            JSON.stringify(
                dados,
                null,
                2
            )
        );

        const mensagemErro =
            dados.error?.message ??
            dados.error?.error_data
                ?.details ??
            "Erro desconhecido da Meta";

        const codigo =
            dados.error?.code;

        const subcodigo =
            dados.error
                ?.error_subcode;

        const partesErro = [
            codigo
                ? `Erro ${codigo}`
                : null,

            subcodigo
                ? `subcódigo ${subcodigo}`
                : null,

            mensagemErro,
        ].filter(Boolean);

        throw new Error(
            partesErro.join(": ")
        );
    }

    const mensagemId =
        dados.messages?.[0]?.id;

    if (!mensagemId) {

        console.warn(
            "A Meta aceitou a requisição, mas não retornou o ID da mensagem:",
            dados
        );

    } else {

        console.log(
            "Mensagem enviada pela API do WhatsApp:",
            {
                telefone:
                    telefoneNormalizado,

                mensagemId,
            }
        );
    }

    return {
        mensagemId,
        dados,
    };
}