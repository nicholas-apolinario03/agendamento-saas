import "dotenv/config";

import {
    enviarEmail,
    verificarConexaoEmail,
} from "../service/emailService";

import {
    montarEmailTeste,
} from "../templates/emailTeste";

async function executarTeste() {
    try {
        const destinatario =
            process.env
                .EMAIL_TESTE_DESTINATARIO;

        if (!destinatario) {
            throw new Error(
                "EMAIL_TESTE_DESTINATARIO não configurado"
            );
        }

        console.log(
            "Verificando conexão com o servidor SMTP..."
        );

        await verificarConexaoEmail();

        console.log(
            "Conexão SMTP verificada com sucesso."
        );

        const {
            html,
            texto,
        } = montarEmailTeste({
            nomeDestinatario:
                "Nicholas",
        });

        console.log(
            "Enviando e-mail de teste..."
        );

        const resultado =
            await enviarEmail({
                para:
                    destinatario,

                assunto:
                    "Teste de e-mail — New Horizon",

                html,

                texto,
            });

        console.log(
            "E-mail enviado com sucesso:",
            resultado
        );
    } catch (erro) {
        console.error(
            "Erro ao testar envio de e-mail:",
            erro
        );

        process.exitCode = 1;
    }
}

void executarTeste();