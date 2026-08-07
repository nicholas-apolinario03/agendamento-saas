import express from "express";
import { prisma } from "../lib/prisma";
import { auth } from "../middleware/auth";

import { enviarEmail } from "../service/emailService";
import { montarEmailConfirmacaoAgendamento } from "../templates/emailConfirmacaoAgendamento";
import { gerarHashToken, gerarTokenConfirmacao,} from "../utils/gerarTokenConfirmacao";

import { montarPaginaResultadoConfirmacao } from "../utils/paginaEmail";
import { converterDatahoraRecebidaParaUtc, FUSO_AGENDA, horarioParaMinutos, obterPartesDataSaoPaulo } from "../utils/formatacaoData";


const agendamentoRoutes =
    express.Router();

agendamentoRoutes.post("/empresa/agendamentos",auth, async (req, res) => {
        try {
            const {
                clienteId,
                servicoId,
                datahoraInicio,
                confirmacao,
            } = req.body;

            const empresaId =
                (req as any)
                    .usuario
                    .empresaId;

            if (
                confirmacao !==
                "AUTOMATICA" &&
                confirmacao !==
                "EMAIL"
            ) {
                return res
                    .status(400)
                    .json({
                        erro:
                            "Tipo de confirmação inválido.",
                    });
            }

            const cliente =
                await prisma
                    .cliente
                    .findFirst({
                        where: {
                            id:
                                Number(
                                    clienteId
                                ),

                            empresaId,
                        },
                    });

            if (!cliente) {
                return res
                    .status(404)
                    .json({
                        erro:
                            "Cliente não encontrado.",
                    });
            }

            const solicitarConfirmacaoEmail =
                confirmacao ===
                "EMAIL";

            if (
                solicitarConfirmacaoEmail &&
                !cliente.email?.trim()
            ) {
                return res
                    .status(400)
                    .json({
                        erro:
                            "O cliente não possui e-mail cadastrado.",
                    });
            }

            const servico =
                await prisma
                    .servico
                    .findFirst({
                        where: {
                            id:
                                Number(
                                    servicoId
                                ),

                            empresaId,
                        },
                    });

            if (!servico) {
                return res
                    .status(404)
                    .json({
                        erro:
                            "Serviço não encontrado.",
                    });
            }

            const inicio =
                converterDatahoraRecebidaParaUtc(
                    datahoraInicio
                );

            if (!inicio) {
                return res
                    .status(400)
                    .json({
                        erro:
                            "Data e horário inválidos.",
                    });
            }

            const fim =
                new Date(
                    inicio.getTime() +
                    servico
                        .duracaoMinutos *
                    60 *
                    1000
                );

            const partesInicio =
                obterPartesDataSaoPaulo(
                    inicio
                );

            const inicioMinutos =
                partesInicio.hora *
                60 +
                partesInicio.minuto;

            const fimMinutos =
                inicioMinutos +
                servico
                    .duracaoMinutos;

            const horariosFuncionamento =
                await prisma
                    .horarioFuncionamento
                    .findMany({
                        where: {
                            empresaId,

                            diaSemana:
                                partesInicio
                                    .diaSemana,

                            ativo:
                                true,
                        },
                    });

            const dentroDoHorario =
                horariosFuncionamento
                    .some(
                        (
                            horario
                        ) => {
                            const abertura =
                                horarioParaMinutos(
                                    horario
                                        .horaInicio
                                );

                            const fechamento =
                                horarioParaMinutos(
                                    horario
                                        .horaFim
                                );

                            return (
                                inicioMinutos >=
                                abertura &&
                                fimMinutos <=
                                fechamento
                            );
                        }
                    );

            if (
                !dentroDoHorario
            ) {
                return res
                    .status(400)
                    .json({
                        erro:
                            "O horário escolhido está fora do horário de funcionamento.",
                    });
            }

            const conflito =
                await prisma
                    .agendamento
                    .findFirst({
                        where: {
                            empresaId,

                            status: {
                                in: [
                                    "AGUARDANDO",
                                    "AGENDADO",
                                ],
                            },

                            datahoraInicio: {
                                lt:
                                    fim,
                            },

                            datahoraFim: {
                                gt:
                                    inicio,
                            },
                        },
                    });

            if (conflito) {
                return res
                    .status(409)
                    .json({
                        erro:
                            "Horário já está ocupado.",
                    });
            }

            let tokenPublico:
                string | null =
                null;

            let tokenHash:
                string | null =
                null;

            let tokenExpiraEm:
                Date | null =
                null;

            if (
                solicitarConfirmacaoEmail
            ) {
                const token =
                    gerarTokenConfirmacao();

                tokenPublico =
                    token.tokenPublico;

                tokenHash =
                    token.tokenHash;

                tokenExpiraEm =
                    token.expiraEm;
            }

            const agendamento =
                await prisma
                    .agendamento
                    .create({
                        data: {
                            empresaId,

                            clienteId:
                                cliente.id,

                            servicoId:
                                servico.id,

                            datahoraInicio:
                                inicio,

                            datahoraFim:
                                fim,

                            status:
                                solicitarConfirmacaoEmail
                                    ? "AGUARDANDO"
                                    : "AGENDADO",

                            tokenConfirmacao:
                                tokenHash,

                            tokenConfirmacaoExpiraEm:
                                tokenExpiraEm,

                            confirmadoEm:
                                solicitarConfirmacaoEmail
                                    ? null
                                    : new Date(),

                            emailConfirmacaoEnviadoEm:
                                null,
                        },
                    });

            let emailEnviado =
                false;

            let aviso:
                string | null =
                null;

            if (
                solicitarConfirmacaoEmail &&
                tokenPublico
            ) {
                try {
                    const empresa =
                        await prisma
                            .empresa
                            .findUnique({
                                where: {
                                    id:
                                        empresaId,
                                },
                            });

                    if (!empresa) {
                        throw new Error(
                            "Empresa não encontrada para montar o e-mail."
                        );
                    }

                    const urlBackend =
                        process.env
                            .URL_BACKEND
                            ?.replace(
                                /\/+$/,
                                ""
                            );

                    if (!urlBackend) {
                        throw new Error(
                            "URL_BACKEND não configurada."
                        );
                    }

                    const urlConfirmacao =
                        `${urlBackend}` +
                        `/agendamentos/confirmar/` +
                        `${encodeURIComponent(
                            tokenPublico
                        )}`;

                    const dataFormatada =
                        new Intl.DateTimeFormat(
                            "pt-BR",
                            {
                                timeZone:
                                    FUSO_AGENDA,

                                weekday:
                                    "long",

                                day:
                                    "2-digit",

                                month:
                                    "long",

                                year:
                                    "numeric",
                            }
                        ).format(
                            inicio
                        );

                    const horarioFormatado =
                        new Intl.DateTimeFormat(
                            "pt-BR",
                            {
                                timeZone:
                                    FUSO_AGENDA,

                                hour:
                                    "2-digit",

                                minute:
                                    "2-digit",

                                hour12:
                                    false,
                            }
                        ).format(
                            inicio
                        );

                    const {
                        assunto,
                        texto,
                        html,
                    } =
                        montarEmailConfirmacaoAgendamento({
                            nomeCliente:
                                cliente.nome,

                            nomeEmpresa:
                                empresa.nome,

                            nomeServico:
                                servico.nome,

                            dataFormatada,

                            horarioFormatado,

                            urlConfirmacao,
                        });

                    await enviarEmail({
                        para:
                            cliente.email!,

                        assunto,

                        texto,

                        html,

                        responderPara:
                            empresa.email ??
                            undefined,
                    });

                    await prisma
                        .agendamento
                        .update({
                            where: {
                                id:
                                    agendamento.id,
                            },

                            data: {
                                emailConfirmacaoEnviadoEm:
                                    new Date(),
                            },
                        });

                    emailEnviado =
                        true;
                } catch (
                erroEmail
                ) {
                    console.error(
                        "Agendamento criado, mas ocorreu um erro ao enviar o e-mail:",
                        erroEmail
                    );

                    aviso =
                        "O agendamento foi criado, mas não foi possível enviar o e-mail de confirmação. O agendamento continuará aguardando. Você pode cancelá-lo e criar outro.";
                }
            }

            return res
                .status(201)
                .json({
                    ...agendamento,

                    datahoraInicio:
                        agendamento
                            .datahoraInicio
                            .toISOString(),

                    datahoraFim:
                        agendamento
                            .datahoraFim
                            .toISOString(),

                    confirmacao:
                        solicitarConfirmacaoEmail
                            ? "EMAIL"
                            : "AUTOMATICA",

                    aguardandoConfirmacao:
                        solicitarConfirmacaoEmail,

                    emailEnviado,

                    mensagem:
                        solicitarConfirmacaoEmail &&
                            emailEnviado
                            ? "Agendamento criado e e-mail de confirmação enviado."
                            : solicitarConfirmacaoEmail
                                ? "Agendamento criado aguardando confirmação."
                                : "Agendamento confirmado com sucesso.",

                    aviso,
                });
        } catch (erro) {
            console.error(
                "Erro ao criar agendamento:",
                erro
            );

            return res
                .status(500)
                .json({
                    erro:
                        "Erro ao criar agendamento.",
                });
        }
    }
);

agendamentoRoutes.get(  "/agendamentos/confirmar/:token", async (req, res) => {
        try {
            const token =
                String(req.params.token ?? "")
                    .trim();

            if (!token) {
                return res
                    .status(400)
                    .send(
                        montarPaginaResultadoConfirmacao({
                            titulo:
                                "Link inválido",
                            mensagem:
                                "O token de confirmação não foi informado.",
                            sucesso:
                                false,
                        })
                    );
            }

            const tokenHash =
                gerarHashToken(token);

            const agendamento =
                await prisma.agendamento.findUnique({
                    where: {
                        tokenConfirmacao:
                            tokenHash,
                    },
                    include: {
                        empresa: true,
                        servico: true,
                        cliente: true,
                    },
                });

            if (!agendamento) {
                return res
                    .status(404)
                    .send(
                        montarPaginaResultadoConfirmacao({
                            titulo:
                                "Link inválido",
                            mensagem:
                                "Este link não existe ou já foi utilizado.",
                            sucesso:
                                false,
                        })
                    );
            }

            if (
                agendamento.status ===
                "CANCELADO"
            ) {
                return res
                    .status(409)
                    .send(
                        montarPaginaResultadoConfirmacao({
                            titulo:
                                "Agendamento cancelado",
                            mensagem:
                                "Este agendamento já foi cancelado.",
                            sucesso:
                                false,
                        })
                    );
            }

            if (
                agendamento.tokenConfirmacaoExpiraEm &&
                agendamento.tokenConfirmacaoExpiraEm <
                new Date()
            ) {
                return res
                    .status(410)
                    .send(
                        montarPaginaResultadoConfirmacao({
                            titulo:
                                "Link expirado",
                            mensagem:
                                "O prazo para confirmar este agendamento terminou.",
                            sucesso:
                                false,
                        })
                    );
            }

            const confirmado =
                await prisma.agendamento.update({
                    where: {
                        id: agendamento.id,
                    },
                    data: {
                        status:
                            "AGENDADO",
                        confirmadoEm:
                            new Date(),
                        tokenConfirmacao:
                            null,
                        tokenConfirmacaoExpiraEm:
                            null,
                    },
                });

            const dataFormatada =
                new Intl.DateTimeFormat(
                    "pt-BR",
                    {
                        timeZone:
                            FUSO_AGENDA,
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                    }
                ).format(
                    confirmado.datahoraInicio
                );

            const horarioFormatado =
                new Intl.DateTimeFormat(
                    "pt-BR",
                    {
                        timeZone:
                            FUSO_AGENDA,
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                    }
                ).format(
                    confirmado.datahoraInicio
                );

            return res.status(200).send(
                montarPaginaResultadoConfirmacao({
                    titulo:
                        "Agendamento confirmado",
                    mensagem:
                        `${agendamento.servico.nome} confirmado para ${dataFormatada} às ${horarioFormatado}.`,
                    sucesso:
                        true,
                })
            );
        } catch (erro) {
            console.error(
                "Erro ao confirmar agendamento:",
                erro
            );

            return res.status(500).send(
                montarPaginaResultadoConfirmacao({
                    titulo:
                        "Não foi possível confirmar",
                    mensagem:
                        "Ocorreu um erro ao processar a confirmação. Tente novamente mais tarde.",
                    sucesso:
                        false,
                })
            );
        }
    }
);
agendamentoRoutes.get(  "/empresa/agendamentos",auth, async (req, res) => {
        try {
            const empresaId =
                (req as any)
                    .usuario
                    .empresaId;

            const agendamentos =
                await prisma
                    .agendamento
                    .findMany({
                        where: {
                            empresaId,
                        },

                        orderBy: {
                            datahoraInicio:
                                "asc",
                        },
                    });

            function formatarDataLocal(
                data: Date
            ) {
                const partes =
                    Object.fromEntries(
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

                                hour:
                                    "2-digit",

                                minute:
                                    "2-digit",

                                second:
                                    "2-digit",

                                hour12:
                                    false,
                            }
                        )
                            .formatToParts(
                                data
                            )
                            .filter(
                                (parte) =>
                                    parte.type !==
                                    "literal"
                            )
                            .map(
                                (parte) => [
                                    parte.type,
                                    parte.value,
                                ]
                            )
                    ) as Record<
                        string,
                        string
                    >;

                return (
                    `${partes.year}-` +
                    `${partes.month}-` +
                    `${partes.day}T` +
                    `${partes.hour}:` +
                    `${partes.minute}:` +
                    `${partes.second}`
                );
            }

            const resposta =
                agendamentos.map(
                    (agendamento) => ({
                        ...agendamento,

                        datahoraInicio:
                            formatarDataLocal(
                                agendamento
                                    .datahoraInicio
                            ),

                        datahoraFim:
                            formatarDataLocal(
                                agendamento
                                    .datahoraFim
                            ),
                    })
                );

            return res.json(
                resposta
            );
        } catch (erro) {
            console.error(
                "Erro ao buscar agendamentos:",
                erro
            );

            return res
                .status(500)
                .json({
                    erro:
                        "Erro ao buscar agendamentos",
                });
        }
    }
);


//cancelar agendamento
agendamentoRoutes.patch( "/empresa/agendamentos/:id/cancelar", auth, async (req, res) => {
        try {
            const empresaId = (req as any).usuario.empresaId;
            const id = Number(req.params.id);

            if (Number.isNaN(id)) {
                return res.status(400).json({
                    erro: "ID do agendamento inválido",
                });
            }

            const agendamento = await prisma.agendamento.findFirst({
                where: {
                    id,
                    empresaId,
                },
            });

            if (!agendamento) {
                return res.status(404).json({
                    erro: "Agendamento não encontrado",
                });
            }

            if (agendamento.status === "CANCELADO") {
                return res.status(409).json({
                    erro: "Agendamento já está cancelado",
                });
            }

            if (agendamento.status === "CONCLUIDO") {
                return res.status(409).json({
                    erro: "Não é possível cancelar um agendamento concluído",
                });
            }

            const agendamentoCancelado =
                await prisma.agendamento.update({
                    where: {
                        id,
                    },
                    data: {
                        status: "CANCELADO",
                    },
                });

            return res.json(agendamentoCancelado);
        } catch (erro) {
            console.error("Erro ao cancelar agendamento:", erro);

            return res.status(500).json({
                erro: "Erro ao cancelar agendamento",
            });
        }
    }
);

agendamentoRoutes.put( "/empresa/agendamentos/:id", auth, async (req, res) => {
        try {
            const empresaId =
                (req as any).usuario.empresaId;

            const id =
                Number(req.params.id);

            const {
                datahoraInicio,
            } = req.body;

            if (Number.isNaN(id)) {
                return res.status(400).json({
                    erro: "ID do agendamento inválido",
                });
            }

            if (!datahoraInicio) {
                return res.status(400).json({
                    erro: "Informe a nova data e horário",
                });
            }

            const agendamento =
                await prisma.agendamento.findFirst({
                    where: {
                        id,
                        empresaId,
                    },
                    include: {
                        servico: true,
                    },
                });

            if (!agendamento) {
                return res.status(404).json({
                    erro: "Agendamento não encontrado",
                });
            }

            if (
                agendamento.status !==
                "AGENDADO"
            ) {
                return res.status(400).json({
                    erro: "Somente agendamentos confirmados podem ser editados",
                });
            }

            const inicio =
                converterDatahoraRecebidaParaUtc(
                    datahoraInicio
                );

            if (!inicio) {
                return res.status(400).json({
                    erro: "Data e horário inválidos",
                });
            }

            const fim = new Date(
                inicio.getTime() +
                agendamento.servico.duracaoMinutos *
                60 *
                1000
            );

            const partesInicio =
                obterPartesDataSaoPaulo(
                    inicio
                );

            const inicioMinutos =
                partesInicio.hora * 60 +
                partesInicio.minuto;

            const fimMinutos =
                inicioMinutos +
                agendamento.servico.duracaoMinutos;

            const horariosFuncionamento =
                await prisma.horarioFuncionamento.findMany({
                    where: {
                        empresaId,
                        diaSemana:
                            partesInicio.diaSemana,
                        ativo: true,
                    },
                });

            const dentroDoHorario =
                horariosFuncionamento.some(
                    (horario) => {
                        const abertura =
                            horarioParaMinutos(
                                horario.horaInicio
                            );

                        const fechamento =
                            horarioParaMinutos(
                                horario.horaFim
                            );

                        return (
                            inicioMinutos >=
                            abertura &&
                            fimMinutos <=
                            fechamento
                        );
                    }
                );

            if (!dentroDoHorario) {
                return res.status(400).json({
                    erro: "O novo horário está fora do horário de funcionamento",
                });
            }

            const conflito =
                await prisma.agendamento.findFirst({
                    where: {
                        empresaId,
                        id: {
                            not: id,
                        },
                        status: {
                            in: [
                                "AGUARDANDO",
                                "AGENDADO",
                            ],
                        },
                        datahoraInicio: {
                            lt: fim,
                        },
                        datahoraFim: {
                            gt: inicio,
                        },
                    },
                });

            if (conflito) {
                return res.status(409).json({
                    erro: "O novo horário já está ocupado",
                });
            }

            const agendamentoAtualizado =
                await prisma.agendamento.update({
                    where: {
                        id,
                    },
                    data: {
                        datahoraInicio:
                            inicio,
                        datahoraFim:
                            fim,
                    },
                });

            return res.status(200).json({
                ...agendamentoAtualizado,
                datahoraInicio:
                    agendamentoAtualizado.datahoraInicio.toISOString(),
                datahoraFim:
                    agendamentoAtualizado.datahoraFim.toISOString(),
            });

        } catch (erro) {
            console.error(
                "Erro ao editar agendamento:",
                erro
            );

            return res.status(500).json({
                erro: "Erro ao editar agendamento",
            });
        }
    }
);
export default agendamentoRoutes