import nodemailer, {
    type Transporter,
} from "nodemailer";

export type DadosEmail = {
    para: string;
    assunto: string;
    html: string;
    texto?: string;
    responderPara?: string;
};

type ConfiguracaoSmtp = {
    host: string;
    port: number;
    secure: boolean;
    email: string;
    senha: string;
    nomeRemetente: string;
};

function obterConfiguracaoSmtp():
    ConfiguracaoSmtp {
    const host =
        process.env.SMTP_HOST;

    const portaTexto =
        process.env.SMTP_PORT;

    const secureTexto =
        process.env.SMTP_SECURE;

    const email =
        process.env.SMTP_EMAIL;

    const senha =
        process.env.SMTP_SENHA_APP;

    const nomeRemetente =
        process.env.EMAIL_NOME_REMETENTE ??
        "New Horizon";

    if (!host) {
        throw new Error(
            "SMTP_HOST não configurado"
        );
    }

    if (!portaTexto) {
        throw new Error(
            "SMTP_PORT não configurado"
        );
    }

    if (!email) {
        throw new Error(
            "SMTP_EMAIL não configurado"
        );
    }

    if (!senha) {
        throw new Error(
            "SMTP_SENHA_APP não configurada"
        );
    }

    const port =
        Number(portaTexto);

    if (
        Number.isNaN(port) ||
        port <= 0
    ) {
        throw new Error(
            "SMTP_PORT inválida"
        );
    }

    const secure =
        secureTexto === "true";

    return {
        host,
        port,
        secure,
        email,
        senha,
        nomeRemetente,
    };
}

let transportador:
    Transporter | null = null;

function obterTransportador() {
    if (transportador) {
        return transportador;
    }

    const configuracao =
        obterConfiguracaoSmtp();

    transportador =
        nodemailer.createTransport({
            host:
                configuracao.host,

            port:
                configuracao.port,

            secure:
                configuracao.secure,

            auth: {
                user:
                    configuracao.email,

                pass:
                    configuracao.senha,
            },
        });

    return transportador;
}

export async function verificarConexaoEmail() {
    const transporter =
        obterTransportador();

    await transporter.verify();

    return true;
}

export async function enviarEmail({
    para,
    assunto,
    html,
    texto,
    responderPara,
}: DadosEmail) {
    if (!para?.trim()) {
        throw new Error(
            "Destinatário do e-mail não informado"
        );
    }

    if (!assunto?.trim()) {
        throw new Error(
            "Assunto do e-mail não informado"
        );
    }

    if (!html?.trim()) {
        throw new Error(
            "Conteúdo HTML do e-mail não informado"
        );
    }

    const configuracao =
        obterConfiguracaoSmtp();

    const transporter =
        obterTransportador();

    const resultado =
        await transporter.sendMail({
            from: {
                name:
                    configuracao
                        .nomeRemetente,

                address:
                    configuracao.email,
            },

            to:
                para.trim(),

            replyTo:
                responderPara?.trim() ||
                undefined,

            subject:
                assunto.trim(),

            text:
                texto,

            html,
        });

    return {
        messageId:
            resultado.messageId,

        accepted:
            resultado.accepted,

        rejected:
            resultado.rejected,

        response:
            resultado.response,
    };
}