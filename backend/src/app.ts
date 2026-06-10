import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma"

const app = express();
app.use(cors());
app.use(express.json());

app.get("/teste", (req, res) => {
    res.json({
        mensagem: "API funcionando",
    });
});
export default app;
app.get("/empresa", async (req, res) => {
    const empresas = await prisma.empresa.findMany();
    res.json(empresas);
});
app.post("/empresa/cadastro", async (req, res) => {

    try {
        const { nome, email, senha, telefone } = req.body;
        const empresa = await prisma.empresa.create({
            data: {
                nome,
                email,
                senhaHash: senha,
                telefone

            }

        });
        res.status(201).json(empresa)
    } catch (error) {
        console.error(error);
        res.status(500).json({
            erro: "erro ao cadastrar empresa"
        });
    }
});