import express from "express";
import { prisma } from "../lib/prisma";
import { auth } from "../middleware/auth";

const horariosRoutes =
    express.Router();



horariosRoutes.post("/empresa/horarios", auth, async (req, res) => {

    try {
        const { diaSemana, horaInicio, horaFim, ativo } = req.body;
        const empresaId =
            (req as any).usuario.empresaId;
        const horario = await prisma.horarioFuncionamento.create({
            data: {
                empresaId,
                diaSemana,
                horaInicio,
                horaFim,
                ativo
            }
        });
        return res.status(201).json(horario);
    } catch (erro) {
        res.status(400).json({
            erro: "erro ao criar horario"
        })
    }
})
horariosRoutes.get("/empresa/horarios", auth, async (req, res) => {
    try {
        const empresaId = (req as any).usuario.empresaId;
        const horario = await prisma.horarioFuncionamento.findMany({
            where: {
                empresaId
            }
        });
        return res.json(horario);
    } catch (erro) {
        console.error(erro);
        return res.status(500).json({
            erro: "Erro ao buscar horario"
        })
    }
})
horariosRoutes.delete("/empresa/horarios/:id", auth, async (req, res) => {

    const empresaId = (req as any).usuario.empresaId;
    const id = Number(req.params.id)

    const servico = await prisma.horarioFuncionamento.findFirst({
        where: {
            id,
            empresaId
        }
    })
    if (!servico) {
        return res.status(404).json({
            erro: "Horario não encontrado"
        })
    }
    await prisma.horarioFuncionamento.delete({

        where: {
            id
        }
    });

    return res.json({
        messagem: "horario excluido com sucesso"
    })
})
horariosRoutes.put("/empresa/horarios/:id", auth, async (req, res) => {

    const empresaId = (req as any).usuario.empresaId
    const id = Number(req.params.id)
    const { diaSemana, horaInicio, horaFim, ativo } = req.body
    try {
        const horario = await prisma.horarioFuncionamento.findFirst({

            where: {
                id,
                empresaId
            }


        });
        if (!horario) {
            return res.status(404).json({
                erro: "horario não encontrado"
            })

        }

        const atualizado = await prisma.horarioFuncionamento.update({

            where: {
                id
            },
            data: {
                diaSemana,
                horaInicio,
                horaFim,
                ativo
            }
        })
        return res.json(atualizado)
    } catch (erro) {

        return res.status(500).json({
            erro: "Erro ao atualizar horario"
        });

    }
})
export default horariosRoutes