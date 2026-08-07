import express from "express";
import { prisma } from "../lib/prisma";
import { auth } from "../middleware/auth";

import bcrypt from "bcrypt";
import { gerartoken } from "../service/jwt";

const empresaRoutes =
    express.Router();




empresaRoutes.get("/empresa", async (req, res) => {
    const empresas = await prisma.empresa.findMany();
    res.json(empresas);
});
empresaRoutes.post("/empresa/cadastro", async (req, res) => {

    try {
        const { nome, email, senha, telefone } = req.body;
        const senhaHash = await bcrypt.hash(senha, 10);
        const empresaExistente = await prisma.empresa.findUnique({
            where: {
                email,
            },
        });
        if (empresaExistente) {
            return res.status(409).json({
                erro: "email ja cadastrado"
            });
        }
        const empresa = await prisma.empresa.create({
            data: {
                nome,
                email,
                senhaHash,
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
empresaRoutes.post("/empresa/login", async (req, res) => {

    try {
        const { email, senha } = req.body;
        const empresa = await prisma.empresa.findUnique({
            where: {
                email,
            },
        });
        if (!empresa) {
            return res.status(401).json({
                erro: "email ou senha invalidos",
            })
        }
        const senhaValida = await bcrypt.compare(
            senha,
            empresa.senhaHash
        );
        if (!senhaValida) {
            return res.status(401).json({
                erro: "email ou senha invalidos",
            })
        }
        const token = gerartoken(
            empresa.id,
            empresa.email
        );
        return res.status(200).json({
            mensagem: "Login realizado com sucesso",
            token
        })
    } catch (erro) {
        console.error(erro);
        return res.status(500).json({
            erro: "erro interno",
        });
    }
});
empresaRoutes.get("/teste-auth", auth, (req, res) => {

    res.status(200).json({
        mensagem: "Você está autenticado"
    });

}
);
empresaRoutes.get( "/perfil", auth, (req, res) => {

        return res.json({
            usuario: (req as any).usuario
        });

    }
);
export default empresaRoutes