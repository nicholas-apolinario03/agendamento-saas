type EmailTesteParams = {
    nomeDestinatario: string;
};

export function montarEmailTeste({
    nomeDestinatario,
}: EmailTesteParams) {
    const texto = [
        `Olá, ${nomeDestinatario}.`,
        "",
        "Este é um teste de envio de e-mail do sistema New Horizon.",
        "",
        "Se esta mensagem chegou, a configuração do Gmail com Nodemailer está funcionando.",
    ].join("\n");

    const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
            <head>
                <meta charset="UTF-8" />

                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                />

                <title>
                    Teste de e-mail
                </title>
            </head>

            <body
                style="
                    margin: 0;
                    padding: 0;
                    background-color: #f5f5f5;
                    font-family: Arial, sans-serif;
                    color: #111827;
                "
            >
                <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                        width: 100%;
                        background-color: #f5f5f5;
                        padding: 32px 16px;
                    "
                >
                    <tr>
                        <td align="center">
                            <table
                                role="presentation"
                                width="100%"
                                cellspacing="0"
                                cellpadding="0"
                                border="0"
                                style="
                                    width: 100%;
                                    max-width: 560px;
                                    background-color: #ffffff;
                                    border-radius: 16px;
                                    overflow: hidden;
                                    border: 1px solid #e5e7eb;
                                "
                            >
                                <tr>
                                    <td
                                        style="
                                            padding: 32px;
                                        "
                                    >
                                        <p
                                            style="
                                                margin: 0 0 12px;
                                                color: #6b7280;
                                                font-size: 14px;
                                            "
                                        >
                                            New Horizon
                                        </p>

                                        <h1
                                            style="
                                                margin: 0 0 20px;
                                                font-size: 26px;
                                                line-height: 1.25;
                                            "
                                        >
                                            Teste de envio concluído
                                        </h1>

                                        <p
                                            style="
                                                margin: 0 0 16px;
                                                color: #374151;
                                                font-size: 16px;
                                                line-height: 1.6;
                                            "
                                        >
                                            Olá,
                                            <strong>
                                                ${nomeDestinatario}
                                            </strong>.
                                        </p>

                                        <p
                                            style="
                                                margin: 0;
                                                color: #374151;
                                                font-size: 16px;
                                                line-height: 1.6;
                                            "
                                        >
                                            Se esta mensagem chegou,
                                            a configuração do Gmail com
                                            Nodemailer está funcionando.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
    `;

    return {
        texto,
        html,
    };
}