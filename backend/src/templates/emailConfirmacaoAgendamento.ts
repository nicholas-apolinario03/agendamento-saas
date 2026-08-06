type EmailConfirmacaoAgendamentoParams = {
    nomeCliente: string;
    nomeEmpresa: string;
    nomeServico: string;
    dataFormatada: string;
    horarioFormatado: string;
    urlConfirmacao: string;
};

function escaparHtml(
    valor: string
) {
    return valor
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function montarEmailConfirmacaoAgendamento({
    nomeCliente,
    nomeEmpresa,
    nomeServico,
    dataFormatada,
    horarioFormatado,
    urlConfirmacao,
}: EmailConfirmacaoAgendamentoParams) {
    const clienteSeguro =
        escaparHtml(nomeCliente);

    const empresaSegura =
        escaparHtml(nomeEmpresa);

    const servicoSeguro =
        escaparHtml(nomeServico);

    const dataSegura =
        escaparHtml(dataFormatada);

    const horarioSeguro =
        escaparHtml(horarioFormatado);

    const urlSegura =
        escaparHtml(urlConfirmacao);

    const assunto =
        `Confirme seu agendamento — ${nomeEmpresa}`;

    const texto = [
        `Olá, ${nomeCliente}.`,
        "",
        "Um novo agendamento foi criado para você.",
        "",
        `Empresa: ${nomeEmpresa}`,
        `Serviço: ${nomeServico}`,
        `Data: ${dataFormatada}`,
        `Horário: ${horarioFormatado}`,
        "",
        "Confirme o agendamento acessando:",
        urlConfirmacao,
        "",
        "O link de confirmação é válido por 24 horas.",
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
                <title>Confirmação de agendamento</title>
            </head>
            <body
                style="
                    margin: 0;
                    padding: 0;
                    background-color: #f4f5f7;
                    font-family: Arial, Helvetica, sans-serif;
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
                        background-color: #f4f5f7;
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
                                    max-width: 600px;
                                    overflow: hidden;
                                    border: 1px solid #e5e7eb;
                                    border-radius: 18px;
                                    background-color: #ffffff;
                                "
                            >
                                <tr>
                                    <td
                                        style="
                                            padding: 24px 32px;
                                            border-bottom: 1px solid #e5e7eb;
                                        "
                                    >
                                        <p
                                            style="
                                                margin: 0;
                                                color: #111827;
                                                font-size: 18px;
                                                font-weight: 700;
                                            "
                                        >
                                            New Horizon
                                        </p>
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding: 36px 32px 20px;">
                                        <p
                                            style="
                                                margin: 0 0 12px;
                                                color: #6b7280;
                                                font-size: 14px;
                                            "
                                        >
                                            Confirmação necessária
                                        </p>

                                        <h1
                                            style="
                                                margin: 0 0 20px;
                                                color: #111827;
                                                font-size: 28px;
                                                line-height: 1.25;
                                            "
                                        >
                                            Confirme seu agendamento
                                        </h1>

                                        <p
                                            style="
                                                margin: 0 0 28px;
                                                color: #4b5563;
                                                font-size: 16px;
                                                line-height: 1.6;
                                            "
                                        >
                                            Olá, <strong>${clienteSeguro}</strong>.
                                            Um novo agendamento foi criado para você.
                                        </p>

                                        <table
                                            role="presentation"
                                            width="100%"
                                            cellspacing="0"
                                            cellpadding="0"
                                            border="0"
                                            style="
                                                width: 100%;
                                                border: 1px solid #e5e7eb;
                                                border-radius: 14px;
                                                background-color: #f9fafb;
                                            "
                                        >
                                            <tr>
                                                <td style="padding: 22px;">
                                                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">EMPRESA</p>
                                                    <p style="margin: 0 0 20px; color: #111827; font-size: 17px; font-weight: 700;">${empresaSegura}</p>
                                                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">SERVIÇO</p>
                                                    <p style="margin: 0 0 20px; color: #111827; font-size: 16px; font-weight: 600;">${servicoSeguro}</p>
                                                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">DATA E HORÁRIO</p>
                                                    <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${dataSegura} às ${horarioSeguro}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <tr>
                                    <td align="center" style="padding: 16px 32px 36px;">
                                        <a
                                            href="${urlSegura}"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style="
                                                display: inline-block;
                                                padding: 14px 24px;
                                                border-radius: 12px;
                                                background-color: #000000;
                                                color: #ffffff;
                                                font-size: 16px;
                                                font-weight: 700;
                                                text-decoration: none;
                                            "
                                        >
                                            Confirmar agendamento
                                        </a>

                                        <p
                                            style="
                                                margin: 22px 0 0;
                                                color: #6b7280;
                                                font-size: 13px;
                                                line-height: 1.6;
                                            "
                                        >
                                            Este link é válido por 24 horas.
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
        assunto,
        texto,
        html,
    };
}