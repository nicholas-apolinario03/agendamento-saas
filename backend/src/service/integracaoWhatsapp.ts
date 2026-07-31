import {
    criptografarTexto,
} from "./criptografia";

type ConcluirIntegracaoParams = {
    empresaId: number;
    code: string;
    wabaId?: string;
    phoneNumberId?: string;
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

type RespostaDebugToken = {
    data?: {
        app_id?: string;
        type?: string;
        application?: string;
        is_valid?: boolean;

        scopes?: string[];

        granular_scopes?: Array<{
            scope?: string;
            target_ids?: string[];
        }>;
    };

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

type RespostaNumerosWaba = {
    data?: DadosNumeroWhatsApp[];

    error?: {
        message?: string;
        type?: string;
        code?: number;
        error_subcode?: number;
        fbtrace_id?: string;
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

async function descobrirWabaId(
    accessToken: string
) {
    const {
        appId,
        appSecret,
        versaoGraph,
    } = obterConfiguracaoMeta();

    /*
     * O app access token é usado apenas para
     * autenticar a chamada ao debug_token.
     */
    const appAccessToken =
        `${appId}|${appSecret}`;

    const parametros =
        new URLSearchParams({
            input_token:
                accessToken,
        });

    const url =
        `https://graph.facebook.com/` +
        `${versaoGraph}/debug_token?` +
        parametros.toString();

    const resposta =
        await fetch(url, {
            method: "GET",

            headers: {
                Authorization:
                    `Bearer ${appAccessToken}`,
            },
        });

    const dados =
        await resposta.json() as
            RespostaDebugToken;

    if (
        !resposta.ok ||
        !dados.data?.is_valid
    ) {
        console.error(
            "Erro ao consultar debug_token:",
            JSON.stringify(
                dados,
                null,
                2
            )
        );

        throw new Error(
            dados.error?.message ??
            "Token retornado pela Meta é inválido"
        );
    }

    const escopoWhatsApp =
        dados.data.granular_scopes
            ?.find(
                (escopo) =>
                    escopo.scope ===
                    "whatsapp_business_management"
            );

    const wabaIds =
        escopoWhatsApp
            ?.target_ids ??
        [];

    if (wabaIds.length === 0) {
        console.error(
            "Debug token sem WABA compartilhada:",
            JSON.stringify(
                dados,
                null,
                2
            )
        );

        throw new Error(
            "Nenhuma conta do WhatsApp Business foi compartilhada pela Meta"
        );
    }

    /*
     * Neste primeiro momento usamos a primeira
     * WABA compartilhada pelo cadastro.
     */
    return wabaIds[0];
}

async function buscarNumerosDaWaba(
    wabaId: string,
    accessToken: string
) {
    const {
        versaoGraph,
    } = obterConfiguracaoMeta();

    const campos = [
        "id",
        "display_phone_number",
        "verified_name",
        "code_verification_status",
        "quality_rating",
    ].join(",");

    const url =
        `https://graph.facebook.com/` +
        `${versaoGraph}/` +
        `${wabaId}/phone_numbers?fields=${campos}`;

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
            RespostaNumerosWaba;

    if (!resposta.ok) {
        console.error(
            "Erro ao buscar números da WABA:",
            JSON.stringify(
                dados,
                null,
                2
            )
        );

        throw new Error(
            dados.error?.message ??
            "Não foi possível consultar os números da WABA"
        );
    }

    const numeros =
        dados.data ?? [];

    if (numeros.length === 0) {
        throw new Error(
            "Nenhum número foi encontrado na conta do WhatsApp Business"
        );
    }

    return numeros;
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

export async function concluirIntegracaoWhatsApp({
    empresaId,
    code,
    wabaId,
    phoneNumberId,
}: ConcluirIntegracaoParams) {
    if (
        !empresaId ||
        !code
    ) {
        throw new Error(
            "Dados da integração incompletos"
        );
    }

    const accessToken =
        await trocarCodePorToken(
            code
        );

    const wabaIdFinal =
        wabaId ||
        await descobrirWabaId(
            accessToken
        );

    const numeros =
        await buscarNumerosDaWaba(
            wabaIdFinal,
            accessToken
        );

    const numeroSelecionado =
        phoneNumberId
            ? numeros.find(
                (numero) =>
                    numero.id ===
                    phoneNumberId
            )
            : numeros[0];

    if (
        !numeroSelecionado ||
        !numeroSelecionado.id
    ) {
        throw new Error(
            "O número selecionado não pertence à WABA compartilhada"
        );
    }

    await inscreverWabaNoWebhook(
        wabaIdFinal,
        accessToken
    );

    const accessTokenCriptografado =
        criptografarTexto(
            accessToken
        );

    return {
        wabaId:
            wabaIdFinal,

        phoneNumberId:
            numeroSelecionado.id,

        numeroExibicao:
            numeroSelecionado
                .display_phone_number ??
            null,

        nomeVerificado:
            numeroSelecionado
                .verified_name ??
            null,

        accessTokenCriptografado,
    };
}