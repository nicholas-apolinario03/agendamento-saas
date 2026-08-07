import express from "express";
import { prisma } from "../lib/prisma";
import { auth } from "../middleware/auth";

const servicoRoutes =
    express.Router();



servicoRoutes.post( "/empresa/servicos", auth, async (req, res) => {
        try {
            const empresaId =
                (req as any).usuario.empresaId;

            const {
                nome,
                duracaoMinutos,
                descricao,
                ativo,
                preco,
                tipoDisponibilidade,
                diasSemana,
                excecoes,
            } = req.body;

            if (
                !nome ||
                !duracaoMinutos ||
                preco === undefined
            ) {
                return res.status(400).json({
                    erro: "Preencha os campos obrigatórios",
                });
            }

            if (
                tipoDisponibilidade !==
                "TODOS_OS_DIAS" &&
                tipoDisponibilidade !==
                "DIAS_DA_SEMANA"
            ) {
                return res.status(400).json({
                    erro: "Tipo de disponibilidade inválido",
                });
            }

            if (
                tipoDisponibilidade ===
                "DIAS_DA_SEMANA" &&
                (
                    !Array.isArray(diasSemana) ||
                    diasSemana.length === 0
                )
            ) {
                return res.status(400).json({
                    erro: "Selecione pelo menos um dia da semana",
                });
            }

            const servicoCriado =
                await prisma.$transaction(
                    async (tx) => {
                        const servico =
                            await tx.servico.create({
                                data: {
                                    empresaId,
                                    nome,
                                    duracaoMinutos,
                                    descricao:
                                        descricao || null,
                                    ativo:
                                        ativo ?? true,
                                    preco,
                                    tipoDisponibilidade,
                                },
                            });

                        if (
                            tipoDisponibilidade ===
                            "DIAS_DA_SEMANA" &&
                            Array.isArray(diasSemana)
                        ) {
                            const diasValidos =
                                diasSemana.filter(
                                    (dia: number) =>
                                        Number.isInteger(dia) &&
                                        dia >= 0 &&
                                        dia <= 6
                                );

                            if (
                                diasValidos.length !==
                                diasSemana.length
                            ) {
                                throw new Error(
                                    "Dia da semana inválido"
                                );
                            }

                            await tx
                                .disponibilidadeSemanalServico
                                .createMany({
                                    data:
                                        diasValidos.map(
                                            (
                                                diaSemana:
                                                    number
                                            ) => ({
                                                servicoId:
                                                    servico.id,
                                                diaSemana,
                                                ativo: true,
                                            })
                                        ),
                                });
                        }

                        if (
                            Array.isArray(excecoes) &&
                            excecoes.length > 0
                        ) {
                            await tx
                                .excecaoDisponibilidadeServico
                                .createMany({
                                    data:
                                        excecoes.map(
                                            (excecao: {
                                                data: string;
                                                disponivel: boolean;
                                            }) => ({
                                                servicoId:
                                                    servico.id,

                                                data:
                                                    new Date(
                                                        `${excecao.data}T12:00:00-03:00`
                                                    ),

                                                disponivel:
                                                    Boolean(
                                                        excecao.disponivel
                                                    ),
                                            })
                                        ),
                                });
                        }

                        return tx.servico.findUnique({
                            where: {
                                id: servico.id,
                            },

                            include: {
                                disponibilidadesSemanais:
                                    true,

                                excecoesDisponibilidade:
                                    true,
                            },
                        });
                    }
                );

            return res
                .status(201)
                .json(servicoCriado);

        } catch (erro) {
            console.error(
                "Erro ao criar serviço:",
                erro
            );

            return res.status(400).json({
                erro: "Erro ao criar serviço",
            });
        }
    }
);
servicoRoutes.get( "/empresa/servicos",  auth,  async (req, res) => {
        try {
            const empresaId =
                (req as any).usuario.empresaId;

            const servicos =
                await prisma.servico.findMany({
                    where: {
                        empresaId,
                    },

                    include: {
                        disponibilidadesSemanais:
                            true,

                        excecoesDisponibilidade:
                            true,
                    },

                    orderBy: {
                        nome: "asc",
                    },
                });

            const resposta =
                servicos.map((servico) => ({
                    id: servico.id,
                    empresaId:
                        servico.empresaId,
                    nome: servico.nome,
                    duracaoMinutos:
                        servico.duracaoMinutos,
                    descricao:
                        servico.descricao,
                    preco:
                        Number(servico.preco),
                    ativo:
                        servico.ativo,

                    tipoDisponibilidade:
                        servico.tipoDisponibilidade,

                    diasSemana:
                        servico
                            .disponibilidadesSemanais
                            .filter(
                                (item) =>
                                    item.ativo
                            )
                            .map(
                                (item) =>
                                    item.diaSemana
                            )
                            .sort(
                                (a, b) =>
                                    a - b
                            ),

                    excecoes:
                        servico
                            .excecoesDisponibilidade
                            .map(
                                (excecao) => ({
                                    data:
                                        new Intl.DateTimeFormat(
                                            "en-CA",
                                            {
                                                timeZone:
                                                    "America/Sao_Paulo",
                                                year:
                                                    "numeric",
                                                month:
                                                    "2-digit",
                                                day:
                                                    "2-digit",
                                            }
                                        ).format(
                                            excecao.data
                                        ),

                                    disponivel:
                                        excecao.disponivel,
                                })
                            ),

                    createdAt:
                        servico.createdAt,
                    updatedAt:
                        servico.updatedAt,
                }));

            return res.json(resposta);

        } catch (erro) {
            console.error(
                "Erro ao buscar serviços:",
                erro
            );

            return res.status(500).json({
                erro: "Erro ao buscar serviços",
            });
        }
    }
);
servicoRoutes.delete("/empresa/servicos/:id", auth, async (req, res) => {

    const empresaId = (req as any).usuario.empresaId;
    const id = Number(req.params.id)

    const servico = await prisma.servico.findFirst({
        where: {
            id,
            empresaId
        }
    })
    if (!servico) {
        return res.status(404).json({
            erro: "Serviço não encontrado"
        })
    }
    await prisma.servico.delete({

        where: {
            id
        }
    });

    return res.json({
        messagem: "Serviço excluido com sucesso"
    })

})
servicoRoutes.put( "/empresa/servicos/:id", auth, async (req, res) => {
        try {
            const empresaId =
                (req as any).usuario.empresaId;

            const id =
                Number(req.params.id);

            const {
                nome,
                preco,
                duracaoMinutos,
                descricao,
                ativo,
                tipoDisponibilidade,
                diasSemana,
                excecoes,
            } = req.body;

            if (
                Number.isNaN(id)
            ) {
                return res.status(400).json({
                    erro: "ID inválido",
                });
            }

            const servicoExistente =
                await prisma.servico.findFirst({
                    where: {
                        id,
                        empresaId,
                    },
                });

            if (!servicoExistente) {
                return res.status(404).json({
                    erro: "Serviço não encontrado",
                });
            }

            if (
                tipoDisponibilidade !==
                "TODOS_OS_DIAS" &&
                tipoDisponibilidade !==
                "DIAS_DA_SEMANA"
            ) {
                return res.status(400).json({
                    erro: "Tipo de disponibilidade inválido",
                });
            }

            if (
                tipoDisponibilidade ===
                "DIAS_DA_SEMANA" &&
                (
                    !Array.isArray(diasSemana) ||
                    diasSemana.length === 0
                )
            ) {
                return res.status(400).json({
                    erro: "Selecione pelo menos um dia da semana",
                });
            }

            const servicoAtualizado =
                await prisma.$transaction(
                    async (tx) => {
                        await tx
                            .disponibilidadeSemanalServico
                            .deleteMany({
                                where: {
                                    servicoId: id,
                                },
                            });

                        await tx
                            .excecaoDisponibilidadeServico
                            .deleteMany({
                                where: {
                                    servicoId: id,
                                },
                            });

                        await tx.servico.update({
                            where: {
                                id,
                            },

                            data: {
                                nome,
                                preco,
                                duracaoMinutos,
                                descricao:
                                    descricao || null,
                                ativo,
                                tipoDisponibilidade,
                            },
                        });

                        if (
                            tipoDisponibilidade ===
                            "DIAS_DA_SEMANA" &&
                            Array.isArray(diasSemana)
                        ) {
                            const diasValidos =
                                diasSemana.filter(
                                    (dia: number) =>
                                        Number.isInteger(dia) &&
                                        dia >= 0 &&
                                        dia <= 6
                                );

                            if (
                                diasValidos.length !==
                                diasSemana.length
                            ) {
                                throw new Error(
                                    "Dia da semana inválido"
                                );
                            }

                            await tx
                                .disponibilidadeSemanalServico
                                .createMany({
                                    data:
                                        diasValidos.map(
                                            (
                                                diaSemana:
                                                    number
                                            ) => ({
                                                servicoId:
                                                    id,
                                                diaSemana,
                                                ativo:
                                                    true,
                                            })
                                        ),
                                });
                        }

                        if (
                            Array.isArray(excecoes) &&
                            excecoes.length > 0
                        ) {
                            await tx
                                .excecaoDisponibilidadeServico
                                .createMany({
                                    data:
                                        excecoes.map(
                                            (excecao: {
                                                data: string;
                                                disponivel: boolean;
                                            }) => ({
                                                servicoId:
                                                    id,

                                                data:
                                                    new Date(
                                                        `${excecao.data}T12:00:00-03:00`
                                                    ),

                                                disponivel:
                                                    Boolean(
                                                        excecao.disponivel
                                                    ),
                                            })
                                        ),
                                });
                        }

                        return tx.servico.findUnique({
                            where: {
                                id,
                            },

                            include: {
                                disponibilidadesSemanais:
                                    true,

                                excecoesDisponibilidade:
                                    true,
                            },
                        });
                    }
                );

            return res.json(
                servicoAtualizado
            );

        } catch (erro) {
            console.error(
                "Erro ao atualizar serviço:",
                erro
            );

            return res.status(500).json({
                erro: "Erro ao atualizar serviço",
            });
        }
    }
);
export default servicoRoutes