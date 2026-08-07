export function montarPaginaResultadoConfirmacao({
    titulo,
    mensagem,
    sucesso,
}: {
    titulo: string;
    mensagem: string;
    sucesso: boolean;
}) {
    const cor =
        sucesso
            ? "#15803d"
            : "#b91c1c";

    const fundo =
        sucesso
            ? "#f0fdf4"
            : "#fef2f2";

    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
            <head>
                <meta charset="UTF-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                />
                <title>${titulo}</title>
            </head>
            <body
                style="
                    margin: 0;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    box-sizing: border-box;
                    background: #f4f5f7;
                    font-family: Arial, Helvetica, sans-serif;
                    color: #111827;
                "
            >
                <main
                    style="
                        width: 100%;
                        max-width: 560px;
                        padding: 36px;
                        box-sizing: border-box;
                        border: 1px solid #e5e7eb;
                        border-radius: 18px;
                        background: #ffffff;
                        text-align: center;
                        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
                    "
                >
                    <div
                        style="
                            width: 56px;
                            height: 56px;
                            margin: 0 auto 20px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: ${fundo};
                            color: ${cor};
                            font-size: 28px;
                            font-weight: 700;
                        "
                    >
                        ${sucesso ? "✓" : "!"}
                    </div>

                    <p
                        style="
                            margin: 0 0 10px;
                            color: #6b7280;
                            font-size: 14px;
                        "
                    >
                        New Horizon
                    </p>

                    <h1
                        style="
                            margin: 0 0 16px;
                            font-size: 28px;
                            line-height: 1.25;
                        "
                    >
                        ${titulo}
                    </h1>

                    <p
                        style="
                            margin: 0;
                            color: #4b5563;
                            font-size: 16px;
                            line-height: 1.6;
                        "
                    >
                        ${mensagem}
                    </p>
                </main>
            </body>
        </html>
    `;
}