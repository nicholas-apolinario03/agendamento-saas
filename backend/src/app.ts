import express from "express";
import cors from "cors";

import { prisma } from "./lib/prisma";
import bcrypt from "bcrypt";
import { gerartoken } from "./service/jwt";
import { auth } from "./middleware/auth";

import whatsappRoutes from "./routes/whatsappRoutes";
import integracaoWhatsAppRoutes from "./routes/integracaoWhatsAppRoutes";

import { enviarEmail } from "./service/emailService";
import { montarEmailConfirmacaoAgendamento } from "./templates/emailConfirmacaoAgendamento";
import {
    gerarHashToken,
    gerarTokenConfirmacao,
} from "./utils/gerarTokenConfirmacao";

const app = express();

app.use(cors());
app.use(express.json());

app.use(whatsappRoutes);
app.use(integracaoWhatsAppRoutes);




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
app.post(
    "/empresa/servicos",
    auth,
    async (req, res) => {
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
app.get(
    "/empresa/servicos",
    auth,
    async (req, res) => {
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
app.delete("/empresa/servicos/:id", auth, async (req, res) => {

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
app.put(
    "/empresa/servicos/:id",
    auth,
    async (req, res) => {
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




//horario
app.post("/empresa/horarios", auth, async (req, res) => {

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


app.get("/empresa/horarios", auth, async (req, res) => {
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


app.delete("/empresa/horarios/:id", auth, async (req, res) => {

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

app.put("/empresa/horarios/:id", auth, async (req, res) => {

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



const FUSO_AGENDA = "America/Sao_Paulo";
const OFFSET_SAO_PAULO = "-03:00";

function converterDatahoraRecebidaParaUtc(
    valor: unknown
) {
    if (
        typeof valor !== "string" ||
        !valor.trim()
    ) {
        return null;
    }

    const datahora = valor.trim();

    const possuiFuso =
        /(?:Z|[+-]\d{2}:\d{2})$/i.test(
            datahora
        );

    const valorNormalizado =
        possuiFuso
            ? datahora
            : `${datahora.length === 16
                ? `${datahora}:00`
                : datahora
            }${OFFSET_SAO_PAULO}`;

    const data = new Date(
        valorNormalizado
    );

    if (
        Number.isNaN(
            data.getTime()
        )
    ) {
        return null;
    }

    return data;
}

function obterPartesDataSaoPaulo(
    data: Date
) {
    const formatador =
        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone:
                    FUSO_AGENDA,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                weekday: "short",
            }
        );

    const partes =
        Object.fromEntries(
            formatador
                .formatToParts(data)
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
        ) as Record<string, string>;

    const diasSemana: Record<
        string,
        number
    > = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
    };

    return {
        ano: Number(partes.year),
        mes: Number(partes.month),
        dia: Number(partes.day),
        hora: Number(partes.hour),
        minuto: Number(partes.minute),
        diaSemana:
            diasSemana[
            partes.weekday
            ],
    };
}

function horarioParaMinutos(
    horario: string
) {
    const [hora, minuto] =
        horario
            .substring(0, 5)
            .split(":")
            .map(Number);

    return (
        hora * 60 +
        minuto
    );
}

function montarPaginaResultadoConfirmacao({
    titulo,
    mensagem,
    sucesso,
}: {
    titulo: string;
    mensagem: string;
    sucesso: boolean;
}) {
    const cor =
        sucesso
            ? "#15803d"
            : "#b91c1c";

    const fundo =
        sucesso
            ? "#f0fdf4"
            : "#fef2f2";

    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
            <head>
                <meta charset="UTF-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                />
                <title>${titulo}</title>
            </head>
            <body
                style="
                    margin: 0;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    box-sizing: border-box;
                    background: #f4f5f7;
                    font-family: Arial, Helvetica, sans-serif;
                    color: #111827;
                "
            >
                <main
                    style="
                        width: 100%;
                        max-width: 560px;
                        padding: 36px;
                        box-sizing: border-box;
                        border: 1px solid #e5e7eb;
                        border-radius: 18px;
                        background: #ffffff;
                        text-align: center;
                        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
                    "
                >
                    <div
                        style="
                            width: 56px;
                            height: 56px;
                            margin: 0 auto 20px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: ${fundo};
                            color: ${cor};
                            font-size: 28px;
                            font-weight: 700;
                        "
                    >
                        ${sucesso ? "✓" : "!"}
                    </div>

                    <p
                        style="
                            margin: 0 0 10px;
                            color: #6b7280;
                            font-size: 14px;
                        "
                    >
                        New Horizon
                    </p>

                    <h1
                        style="
                            margin: 0 0 16px;
                            font-size: 28px;
                            line-height: 1.25;
                        "
                    >
                        ${titulo}
                    </h1>

                    <p
                        style="
                            margin: 0;
                            color: #4b5563;
                            font-size: 16px;
                            line-height: 1.6;
                        "
                    >
                        ${mensagem}
                    </p>
                </main>
            </body>
        </html>
    `;
}

app.post(
    "/empresa/agendamentos",
    auth,
    async (req, res) => {
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

app.get(
    "/agendamentos/confirmar/:token",
    async (req, res) => {
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


app.get(
    "/empresa/agendamentos",
    auth,
    async (req, res) => {
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
app.patch(
    "/empresa/agendamentos/:id/cancelar",
    auth,
    async (req, res) => {
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

app.put(
    "/empresa/agendamentos/:id",
    auth,
    async (req, res) => {
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


import {
    enviarMensagemWhatsApp
} from "./service/enviarMensagemWhatsApp";
app.post(
    "/teste-whatsapp",
    async (req, res) => {
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
