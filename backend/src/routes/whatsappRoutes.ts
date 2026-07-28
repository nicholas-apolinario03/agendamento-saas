import { Router } from "express";

const whatsappRoutes = Router();

whatsappRoutes.get(
    "/webhook/whatsapp",
    (req, res) => {
        const modo =
            req.query["hub.mode"];

        const tokenRecebido =
            req.query["hub.verify_token"];

        const desafio =
            req.query["hub.challenge"];

        const tokenCorreto =
            process.env.WHATSAPP_VERIFY_TOKEN;

        if (
            modo === "subscribe" &&
            tokenRecebido === tokenCorreto
        ) {
            console.log(
                "Webhook do WhatsApp verificado com sucesso"
            );

            return res
                .status(200)
                .send(desafio);
        }

        console.log(
            "Falha ao verificar webhook do WhatsApp"
        );

        return res.sendStatus(403);
    }
);

whatsappRoutes.post(
    "/webhook/whatsapp",
    async (req, res) => {
        try {
            /*
             * Respondemos imediatamente para a Meta.
             * Isso evita que ela tente enviar o mesmo
             * evento várias vezes.
             */
            res.sendStatus(200);

            const valor =
                req.body.entry?.[0]
                    ?.changes?.[0]
                    ?.value;

            const mensagem =
                valor?.messages?.[0];

            /*
             * Alguns eventos são apenas atualizações
             * de status, como sent, delivered ou failed.
             */
            if (!mensagem) {
                console.log(
                    "Evento recebido sem mensagem"
                );

                console.log(
                    JSON.stringify(req.body, null, 2)
                );

                return;
            }

            const telefone =
                mensagem.from;

            const tipoMensagem =
                mensagem.type;

            const texto =
                mensagem.text?.body?.trim();

            const nomePerfil =
                valor.contacts?.[0]
                    ?.profile?.name;

            console.log("\n============================");

            console.log("Mensagem recebida");

            console.log({
                telefone,
                nomePerfil,
                tipoMensagem,
                texto
            });

            console.log("============================\n");

        } catch (erro) {
            console.error(
                "Erro ao processar webhook:",
                erro
            );
        }
    }
);

export default whatsappRoutes;