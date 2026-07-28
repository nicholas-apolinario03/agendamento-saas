import { Router } from "express";
import { processarMensagemWhatsApp } from
    "../service/processarMensagemWhatsApp";
const whatsappRoutes = Router();

whatsappRoutes.get(
    "/webhook/whatsapp",
     async (req, res) => {
        console.log("WEBHOOK REAL RECEBIDO", {
            horario: new Date().toISOString(),
            phoneNumberIdRecebido:
                req.body.entry?.[0]
                    ?.changes?.[0]
                    ?.value?.metadata
                    ?.phone_number_id,
            telefone:
                req.body.entry?.[0]
                    ?.changes?.[0]
                    ?.value?.messages?.[0]?.from,
            texto:
                req.body.entry?.[0]
                    ?.changes?.[0]
                    ?.value?.messages?.[0]
                    ?.text?.body,
        });
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

        /*
         * Primeiro respondemos 200 para a Meta.
         */
        res.sendStatus(200);

        try {

            const valor =
                req.body.entry?.[0]
                    ?.changes?.[0]
                    ?.value;

            const mensagem =
                valor?.messages?.[0];

            /*
             * Pode ser evento de status, como failed,
             * delivered ou sent.
             */
            if (!mensagem) {

                console.log(
                    "Evento recebido sem mensagem:"
                );

                console.log(
                    JSON.stringify(req.body, null, 2)
                );

                return;
            }

            if (mensagem.type !== "text") {

                console.log(
                    `Tipo de mensagem não suportado: ${mensagem.type}`
                );

                return;
            }

            const telefone =
                mensagem.from;

            const texto =
                mensagem.text?.body?.trim();

            const empresaId =
                Number(
                    process.env.WHATSAPP_EMPRESA_ID
                );

            if (
                !empresaId ||
                !telefone ||
                !texto
            ) {

                console.log(
                    "Dados obrigatórios ausentes:",
                    {
                        empresaId,
                        telefone,
                        texto,
                    }
                );

                return;
            }

            console.log("\n==============================");
            console.log("Mensagem recebida:");
            console.log({
                empresaId,
                telefone,
                texto,
            });
            console.log("==============================\n");

            await processarMensagemWhatsApp({
                empresaId,
                telefone,
                texto,
            });

        } catch (erro) {

            console.error(
                "Erro ao processar mensagem do WhatsApp:",
                erro
            );

        }
    }
);

export default whatsappRoutes;