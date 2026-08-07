import { Router } from "express";
import {processarMensagemWhatsApp} from "../service/processarMensagemWhatsApp";

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

            console.log(
                "WEBHOOK REAL RECEBIDO",
                {
                    horario:
                        new Date().toISOString(),

                    phoneNumberIdRecebido:
                        req.body.entry?.[0]
                            ?.changes?.[0]
                            ?.value
                            ?.metadata
                            ?.phone_number_id,
                }
            );


            const valor =
                req.body.entry?.[0]
                    ?.changes?.[0]
                    ?.value;

            const mensagem =
                valor?.messages?.[0];


            /*
             * A Meta também envia webhooks de status:
             * sent, delivered, read e failed.
             */
            if (!mensagem) {

                console.log(
                    "Evento recebido sem mensagem de usuário:",
                    JSON.stringify(
                        req.body,
                        null,
                        2
                    )
                );

                return res.sendStatus(200);
            }


            if (
                mensagem.type !== "text" ||
                !mensagem.text?.body
            ) {

                console.log(
                    `Tipo de mensagem não suportado: ${mensagem.type}`
                );

                return res.sendStatus(200);
            }


            const telefone =
                mensagem.from;

            const texto =
                mensagem.text.body.trim();

            const empresaId =
                Number(
                    process.env
                        .WHATSAPP_EMPRESA_ID
                );


            if (
                !empresaId ||
                Number.isNaN(empresaId)
            ) {
                throw new Error(
                    "WHATSAPP_EMPRESA_ID inválido ou não configurado"
                );
            }


            if (!telefone || !texto) {

                console.log(
                    "Dados obrigatórios ausentes:",
                    {
                        empresaId,
                        telefone,
                        texto,
                    }
                );

                return res.sendStatus(200);
            }


            console.log(
                "Mensagem recebida:",
                {
                    empresaId,
                    telefone,
                    texto,
                }
            );


            console.log(
                "ANTES DE PROCESSAR A MENSAGEM"
            );


            /*
             * Na Vercel precisamos aguardar todo o
             * processamento antes de responder à Meta.
             */
            await processarMensagemWhatsApp({
                empresaId,
                telefone,
                texto,
            });


            console.log(
                "DEPOIS DE PROCESSAR A MENSAGEM"
            );


            return res.sendStatus(200);

        } catch (erro) {

            console.error(
                "Erro ao processar mensagem do WhatsApp:",
                erro
            );

            /*
             * Respondemos 200 para evitar que a Meta
             * repita várias vezes a mesma mensagem
             * durante os testes.
             */
            return res.sendStatus(200);
        }
    }
);


export default whatsappRoutes;