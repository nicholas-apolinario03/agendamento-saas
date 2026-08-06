import {
    createHash,
    randomBytes,
} from "node:crypto";

export type TokenConfirmacao = {
    tokenPublico: string;
    tokenHash: string;
    expiraEm: Date;
};

const DURACAO_TOKEN_HORAS = 24;

export function gerarHashToken(
    token: string
) {
    return createHash("sha256")
        .update(token)
        .digest("hex");
}

export function gerarTokenConfirmacao():
    TokenConfirmacao {
    const tokenPublico =
        randomBytes(32)
            .toString("hex");

    const tokenHash =
        gerarHashToken(
            tokenPublico
        );

    const expiraEm =
        new Date(
            Date.now() +
            DURACAO_TOKEN_HORAS *
            60 *
            60 *
            1000
        );

    return {
        tokenPublico,
        tokenHash,
        expiraEm,
    };
}