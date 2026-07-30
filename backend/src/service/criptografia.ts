import crypto from "crypto";

const ALGORITMO = "aes-256-gcm";
const TAMANHO_IV = 12;
const TAMANHO_TAG = 16;

function obterChaveCriptografia() {
    const chaveHex =
        process.env.WHATSAPP_ENCRYPTION_KEY;

    if (!chaveHex) {
        throw new Error(
            "WHATSAPP_ENCRYPTION_KEY não configurada"
        );
    }

    if (!/^[a-fA-F0-9]{64}$/.test(chaveHex)) {
        throw new Error(
            "WHATSAPP_ENCRYPTION_KEY deve possuir 64 caracteres hexadecimais"
        );
    }

    return Buffer.from(chaveHex, "hex");
}

export function criptografarTexto(
    texto: string
) {
    if (!texto) {
        throw new Error(
            "O texto para criptografia não pode estar vazio"
        );
    }

    const chave =
        obterChaveCriptografia();

    const iv =
        crypto.randomBytes(TAMANHO_IV);

    const cifra =
        crypto.createCipheriv(
            ALGORITMO,
            chave,
            iv
        );

    const textoCriptografado =
        Buffer.concat([
            cifra.update(
                texto,
                "utf8"
            ),
            cifra.final(),
        ]);

    const tagAutenticacao =
        cifra.getAuthTag();

    return [
        iv.toString("hex"),
        tagAutenticacao.toString("hex"),
        textoCriptografado.toString("hex"),
    ].join(":");
}

export function descriptografarTexto(
    conteudoCriptografado: string
) {
    const partes =
        conteudoCriptografado.split(":");

    if (partes.length !== 3) {
        throw new Error(
            "Conteúdo criptografado inválido"
        );
    }

    const [
        ivHex,
        tagHex,
        conteudoHex,
    ] = partes;

    const iv =
        Buffer.from(ivHex, "hex");

    const tagAutenticacao =
        Buffer.from(tagHex, "hex");

    const conteudo =
        Buffer.from(
            conteudoHex,
            "hex"
        );

    if (
        iv.length !== TAMANHO_IV ||
        tagAutenticacao.length !== TAMANHO_TAG
    ) {
        throw new Error(
            "Conteúdo criptografado inválido"
        );
    }

    const chave =
        obterChaveCriptografia();

    const decifrador =
        crypto.createDecipheriv(
            ALGORITMO,
            chave,
            iv
        );

    decifrador.setAuthTag(
        tagAutenticacao
    );

    const textoOriginal =
        Buffer.concat([
            decifrador.update(
                conteudo
            ),
            decifrador.final(),
        ]);

    return textoOriginal.toString(
        "utf8"
    );
}