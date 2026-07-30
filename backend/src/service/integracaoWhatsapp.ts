import {
    criptografarTexto,
} from "./criptografia";

type ConcluirIntegracaoParams = {
    empresaId: number;
    code: string;
    wabaId: string;
    phoneNumberId: string;
};

type RespostaTokenMeta = {
    access_token?: string;
    token_type?: string;
    error?: {
        message?: string;
        type?: string;
        code?: number;
        error_subcode?: number;
        fbtrace_id?: string;
    };
};

type DadosNumeroWhatsApp = {
    id?: string;
    display_phone_number?: string;
    verified_name?: string;
    code_verification_status?: string;
    quality_rating?: string;
    error?: {
        message?: string;
        code?: number;
    };
};

function obterConfiguracaoMeta() {
    const appId =
        process.env.META_APP_ID;

    const appSecret =
        process.env.META_APP_SECRET;

    const versaoGraph =
        process.env.META_GRAPH_API_VERSION ??
        "v24.0";

    if (!appId) {
        throw new Error(
            "META_APP_ID não configurado"
        );
    }

    if (!appSecret) {
        throw new Error(
            "META_APP_SECRET não configurado"
        );
    }

    return {
        appId,
        appSecret,
        versaoGraph,
    };
}

async function trocarCodePorToken(
    code: string
) {
    if (!code) {
        throw new Error(
            "Código de autorização não informado"
        );
    }

    const {
        appId,
        appSecret,
        versaoGraph,
    } = obterConfiguracaoMeta();

    const parametros =
        new URLSearchParams({
            client_id: appId,
            client_secret: appSecret,
            code,
        });

    const url =
        `https://graph.facebook.com/` +
        `${versaoGraph}/oauth/access_token?` +
        parametros.toString();

    const resposta =
        await fetch(url, {
            method: "GET",
        });

    const dados =
        await resposta.json() as
            RespostaTokenMeta;

    if (
        !resposta.ok ||
        !dados.access_token
    ) {
        console.error(
            "Erro ao trocar code por token:",
            JSON.stringify(
                dados,
                null,
                2
            )
        );

        throw new Error(
            dados.error?.message ??
            "Não foi possível obter o token da Meta"
        );
    }

    return dados.access_token;
}

async function inscreverWabaNoWebhook(
    wabaId: string,
    accessToken: string
) {
    const {
        versaoGraph,
    } = obterConfiguracaoMeta();

    const url =
        `https://graph.facebook.com/` +
        `${versaoGraph}/` +
        `${wabaId}/subscribed_apps`;

    const resposta =
        await fetch(url, {
            method: "POST",

            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        });

    const dados =
        await resposta.json() as {
            success?: boolean;
            error?: {
                message?: string;
                code?: number;
            };
        };

    if (
        !resposta.ok ||
        dados.success !== true
    ) {
        console.error(
            "Erro ao inscrever WABA:",
            JSON.stringify(
                dados,
                null,
                2
            )
        );

        throw new Error(
            dados.error?.message ??
            "Não foi possível inscrever a WABA no webhook"
        );
    }
}

async function buscarDadosNumero(
    phoneNumberId: string,
    accessToken: string
) {
    const {
        versaoGraph,
    } = obterConfiguracaoMeta();

    const campos = [
        "display_phone_number",
        "verified_name",
        "code_verification_status",
        "quality_rating",
    ].join(",");

    const url =
        `https://graph.facebook.com/` +
        `${versaoGraph}/` +
        `${phoneNumberId}?fields=${campos}`;

    const resposta =
        await fetch(url, {
            method: "GET",

            headers: {
                Authorization:
                    `Bearer ${accessToken}`,
            },
        });

    const dados =
        await resposta.json() as
            DadosNumeroWhatsApp;

    if (!resposta.ok) {
        console.error(
            "Erro ao buscar número:",
            JSON.stringify(
                dados,
                null,
                2
            )
        );

        throw new Error(
            dados.error?.message ??
            "Não foi possível consultar o número do WhatsApp"
        );
    }

    return dados;
}

export async function concluirIntegracaoWhatsApp({
    empresaId,
    code,
    wabaId,
    phoneNumberId,
}: ConcluirIntegracaoParams) {
    if (
        !empresaId ||
        !code ||
        !wabaId ||
        !phoneNumberId
    ) {
        throw new Error(
            "Dados da integração incompletos"
        );
    }

    const accessToken =
        await trocarCodePorToken(
            code
        );

    await inscreverWabaNoWebhook(
        wabaId,
        accessToken
    );

    const dadosNumero =
        await buscarDadosNumero(
            phoneNumberId,
            accessToken
        );

    const accessTokenCriptografado =
        criptografarTexto(
            accessToken
        );

    return {
        wabaId,
        phoneNumberId,

        numeroExibicao:
            dadosNumero
                .display_phone_number ??
            null,

        nomeVerificado:
            dadosNumero
                .verified_name ??
            null,

        accessTokenCriptografado,
    };
}