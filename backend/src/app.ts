import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma";
import bcrypt from "bcrypt";
import { gerartoken } from "./service/jwt";
import { auth } from "./middleware/auth";



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
app.post("/empresa/login", async (req, res) => {

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
app.get("/teste-auth", auth, (req, res) => {

    res.status(200).json({
        mensagem: "Você está autenticado"
    });

}
);
app.get(
    "/perfil",
    auth,
    (req, res) => {

        return res.json({
            usuario: (req as any).usuario
        });

    }
);
app.post("/empresa/servico", auth, async (req, res) => {

    try {
        const { nome, duracaoMinutos, descricao, ativo, preco } = req.body;
        const empresaId =
            (req as any).usuario.empresaId;
        const servico = await prisma.servico.create({
            data: {
                empresaId,
                nome,
                duracaoMinutos,
                descricao,
                ativo,
                preco
            }
        });
        return res.status(201).json(servico);
    } catch (erro) {
        res.status(400).json({
            erro: "erro ao criar serviço"
        })
    }
}
)