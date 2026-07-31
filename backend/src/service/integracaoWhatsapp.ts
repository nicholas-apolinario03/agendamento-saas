import {
    criptografarTexto,
} from "./criptografia";

type ConcluirIntegracaoParams = {
    empresaId: number;
    code: string;
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

type RespostaMetaSimples = {
    success?: boolean;

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
        process.env.META_APP_ID?.trim();

    const appSecret =
        process.env.META_APP_SECRET?.trim();

    const redirectUri =
        process.env.META_REDIRECT_URI?.trim();

    const versaoGraph =
        process.env
            .META_GRAPH_API_VERSION
            ?.trim() ??
        "v24.0";

    const systemUserToken =
        process.env
            .META_SYSTEM_USER_TOKEN
            ?.trim();

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

    if (!redirectUri) {
        throw new Error(
            "META_REDIRECT_URI não configurada"
        );
    }

    let urlRedirect: URL;

    try {
        urlRedirect =
            new URL(redirectUri);
    } catch {
        throw new Error(
            "META_REDIRECT_URI inválida"
        );
    }

    if (
        urlRedirect.protocol !==
        "https:"
    ) {
        throw new Error(
            "META_REDIRECT_URI deve utilizar HTTPS"
        );
    }

    return {
        appId,
        appSecret,
        redirectUri,
        versaoGraph,
        systemUserToken,
    };
}

async function trocarCodePorToken(
    code: string
) {
    const {
        appId,
        appSecret,
        redirectUri,
        versaoGraph,
    } = obterConfiguracaoMeta();

    const parametros =
        new URLSearchParams({
            client_id: appId,
            client_secret: appSecret,
            redirect_uri:
                redirectUri,
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
            "Erro ao trocar o código por token:",
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
        systemUserToken,
    } = obterConfiguracaoMeta();

    /*
     * A Meta recomenda autenticar o debug_token
     * com um token que tenha permissão para
     * inspecionar o token retornado.
     *
     * Usamos o token de usuário do sistema quando
     * ele estiver configurado. Caso contrário,
     * usamos o App Access Token.
     */
    const tokenParaDebug =
        systemUserToken ??
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
                    `Bearer ${tokenParaDebug}`,
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
            "Erro no debug_token:",
            JSON.stringify(
                dados,
                null,
                2
            )
        );

        throw new Error(
            dados.error?.message ??
            "O token retornado pela Meta é inválido"
        );
    }

    if (
        dados.data.app_id &&
        dados.data.app_id !== appId
    ) {
        throw new Error(
            "O token retornado pertence a outro aplicativo Meta"
        );
    }

    const escopoWhatsApp =
        dados.data
            .granular_scopes
            ?.find(
                (item) =>
                    item.scope ===
                    "whatsapp_business_management"
            );

    const wabaIds =
        escopoWhatsApp
            ?.target_ids ??
        [];

    if (wabaIds.length === 0) {
        console.error(
            "Nenhuma WABA encontrada no token:",
            JSON.stringify(
                dados,
                null,
                2
            )
        );

        throw new Error(
            "Nenhuma conta do WhatsApp Business foi compartilhada durante o cadastro"
        );
    }

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
        `${wabaId}/phone_numbers?fields=` +
        encodeURIComponent(campos);

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
            "Erro ao consultar números da WABA:",
            JSON.stringify(
                dados,
                null,
                2
            )
        );

        throw new Error(
            dados.error?.message ??
            "Não foi possível consultar os números do WhatsApp"
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

                "Content-Type":
                    "application/json",
            },
        });

    const dados =
        await resposta.json() as
            RespostaMetaSimples;

    if (
        !resposta.ok ||
        dados.success !== true
    ) {
        console.error(
            "Erro ao inscrever a WABA no webhook:",
            JSON.stringify(
                dados,
                null,
                2
            )
        );

        throw new Error(
            dados.error?.message ??
            "Não foi possível inscrever a conta no webhook"
        );
    }
}

export async function concluirIntegracaoWhatsApp({
    empresaId,
    code,
}: ConcluirIntegracaoParams) {
    if (
        !Number.isInteger(empresaId) ||
        empresaId <= 0
    ) {
        throw new Error(
            "Empresa inválida"
        );
    }

    const codigoLimpo =
        code.trim();

    if (!codigoLimpo) {
        throw new Error(
            "Código de autorização não informado"
        );
    }

    const accessToken =
        await trocarCodePorToken(
            codigoLimpo
        );

    const wabaId =
        await descobrirWabaId(
            accessToken
        );

    const numeros =
        await buscarNumerosDaWaba(
            wabaId,
            accessToken
        );

    /*
     * Neste primeiro momento, cada integração
     * utilizará o primeiro número disponível
     * dentro da WABA compartilhada.
     */
    const numeroSelecionado =
        numeros[0];

    if (!numeroSelecionado?.id) {
        throw new Error(
            "A Meta não retornou o Phone Number ID"
        );
    }

    await inscreverWabaNoWebhook(
        wabaId,
        accessToken
    );

    const accessTokenCriptografado =
        criptografarTexto(
            accessToken
        );

    return {
        wabaId,

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