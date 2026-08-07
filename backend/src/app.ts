import express from "express";
import cors from "cors";

import { prisma } from "./lib/prisma";
import { auth } from "./middleware/auth";

import whatsappRoutes from "./routes/whatsappRoutes";
import integracaoWhatsAppRoutes from "./routes/integracaoWhatsAppRoutes";
import servicoRoutes from "./routes/servicoRoutes";
import empresaRoutes from "./routes/empresaRoutes";
import horariosRoutes from "./routes/horariosRoutes";


import {
    enviarMensagemWhatsApp
} from "./service/enviarMensagemWhatsApp";
import agendamentoRoutes from "./routes/agendamentoRoutes";


const app = express();

app.use(cors());
app.use(express.json());

app.use(whatsappRoutes);
app.use(integracaoWhatsAppRoutes);

app.use(horariosRoutes)
app.use(empresaRoutes);
app.use(servicoRoutes)
app.use(horariosRoutes)
app.use(agendamentoRoutes)


app.post("/empresa/clientes", auth, async (req, res) => {

    try {
        const { nome, email, telefone } = req.body;
        const empresaId =
            (req as any).usuario.empresaId;

        const clienteExistente = await prisma.cliente.findFirst({
            where: {
                empresaId,
                telefone,
            },
        });
        if (clienteExistente) {
            return res.status(409).json({
                erro: "telefone ja cadastrado"
            });
        }

        const cliente = await prisma.cliente.create({
            data: {
                empresaId,
                nome,
                email,
                telefone

            }

        });
        res.status(201).json(cliente)
    } catch (error) {
        console.error(error);
        res.status(500).json({
            erro: "erro ao cadastrar cliente"
        });
    }
});
app.get("/empresa/clientes", auth, async (req, res) => {
    try {
        const empresaId = (req as any).usuario.empresaId;
        const cliente = await prisma.cliente.findMany({
            where: {
                empresaId
            }
        });
        return res.json(cliente);
    } catch (erro) {
        console.error(erro);
        return res.status(500).json({
            erro: "Erro ao buscar cliente"
        })
    }
})

app.post( "/teste-whatsapp",async (req, res) => {
        try {

            const {
                telefone,
                mensagem
            } = req.body;

            const resultado =
                await enviarMensagemWhatsApp({
                    telefone,
                    mensagem,
                });

            return res.json({
                sucesso: true,
                resultado,
            });

        } catch (erro) {

            console.error(erro);

            return res.status(500).json({
                sucesso: false,

                erro:
                    erro instanceof Error
                        ? erro.message
                        : "Erro desconhecido",
            });
        }
    }
);


export default app;