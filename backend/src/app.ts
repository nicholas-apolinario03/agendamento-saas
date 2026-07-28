import express from "express";
import cors from "cors";

import { prisma } from "./lib/prisma";
import bcrypt from "bcrypt";
import { gerartoken } from "./service/jwt";
import { auth } from "./middleware/auth";

import whatsappRoutes from "./routes/WhatsappRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.use(whatsappRoutes);

export default app;

/*
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
app.post("/empresa/servicos", auth, async (req, res) => {

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
app.get("/empresa/servicos", auth, async (req, res) => {
    try {
        const empresaId = (req as any).usuario.empresaId;
        const servicos = await prisma.servico.findMany({
            where: {
                empresaId
            }
        });
        return res.json(servicos);
    } catch (erro) {
        console.error(erro);
        return res.status(500).json({
            erro: "Erro ao buscar serviços"
        })
    }
})
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
app.put("/empresa/servicos/:id", auth, async (req, res) => {

    const empresaId = (req as any).usuario.empresaId
    const id = Number(req.params.id)
    const { nome, preco, duracaoMinutos, descricao, ativo } = req.body
    try {
        const servico = await prisma.servico.findFirst({

            where: {
                id,
                empresaId
            }


        });
        if (!servico) {
            return res.status(404).json({
                erro: "Serviço não encontrado"
            })

        }

        const atualizado = await prisma.servico.update({

            where: {
                id
            },
            data: {
                nome,
                preco,
                duracaoMinutos,
                descricao,
                ativo
            }
        })
        return res.json(atualizado)
    } catch (erro) {

        return res.status(500).json({
            erro: "Erro ao atualizar serviço"
        });

    }
})




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



function criarDataComHorario(
    data: Date,
    horario: string
) {
    const resultado = new Date(data);

    const [hora, minuto] = horario.split(":");

    resultado.setHours(
        Number(hora),
        Number(minuto),
        0,
        0
    );

    return resultado;
}


app.post("/empresa/agendamentos", auth, async (req, res) => {

    try {

        const {
            clienteId,
            servicoId,
            datahoraInicio
        } = req.body;

        const empresaId =
            (req as any).usuario.empresaId;


        // 1. Verificar cliente

        const cliente =
            await prisma.cliente.findFirst({
                where: {
                    id: clienteId,
                    empresaId
                }
            });

        if (!cliente) {
            return res.status(404).json({
                erro: "Cliente não encontrado"
            });
        }


        // 2. Verificar serviço

        const servico =
            await prisma.servico.findFirst({
                where: {
                    id: servicoId,
                    empresaId
                }
            });

        if (!servico) {
            return res.status(404).json({
                erro: "Serviço não encontrado"
            });
        }


        // 3. Calcular horário final

        const inicio =
            new Date(datahoraInicio);

        const fim =
            new Date(
                inicio.getTime() +
                servico.duracaoMinutos *
                60 *
                1000
            );


        // 4. Descobrir o dia da semana

        const diaSemana =
            inicio.getDay();


        // 5. Buscar horários de funcionamento

        const horariosFuncionamento =
            await prisma.horarioFuncionamento.findMany({
                where: {
                    empresaId,
                    diaSemana,
                    ativo: true
                }
            });


        // 6. Verificar se o agendamento
        // cabe em algum intervalo

        const dentroDoHorario =
            horariosFuncionamento.some((horario) => {

                const inicioFuncionamento =
                    criarDataComHorario(
                        inicio,
                        horario.horaInicio
                    );

                const fimFuncionamento =
                    criarDataComHorario(
                        inicio,
                        horario.horaFim
                    );

                return (
                    inicio >= inicioFuncionamento &&
                    fim <= fimFuncionamento
                );

            });


        if (!dentroDoHorario) {
            return res.status(400).json({
                erro: "O horário escolhido está fora do horário de funcionamento"
            });
        }


        // 7. Verificar conflito

        const conflito =
            await prisma.agendamento.findFirst({
                where: {

                    empresaId,

                    status: {
                        in: [
                            "AGUARDANDO_CONFIRMACAO",
                            "AGENDADO"
                        ]
                    },

                    datahoraInicio: {
                        lt: fim
                    },

                    datahoraFim: {
                        gt: inicio
                    }

                }
            });


        if (conflito) {
            return res.status(409).json({
                erro: "Horário já está ocupado"
            });
        }


        // 8. Criar agendamento

        const agendamento =
            await prisma.agendamento.create({
                data: {

                    empresaId,

                    clienteId,

                    servicoId,

                    datahoraInicio: inicio,

                    datahoraFim: fim,

                    status: "AGENDADO"

                }
            });


        return res.status(201).json(
            agendamento
        );


    } catch (erro) {

        console.error(
            "Erro ao criar agendamento:",
            erro
        );

        return res.status(500).json({
            erro: "Erro ao criar agendamento"
        });

    }

});


app.get("/empresa/agendamentos", auth, async (req, res) => {
    try {
        const empresaId = (req as any).usuario.empresaId;
        const agendamento = await prisma.agendamento.findMany({
            where: {
                empresaId
            }
        });
        return res.json(agendamento);
    } catch (erro) {
        console.error(erro);
        return res.status(500).json({
            erro: "Erro ao buscar agendamentos"
        })
    }
})

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

            const id = Number(req.params.id);

            const {
                datahoraInicio
            } = req.body;

            if (Number.isNaN(id)) {
                return res.status(400).json({
                    erro: "ID do agendamento inválido"
                });
            }

            if (!datahoraInicio) {
                return res.status(400).json({
                    erro: "Informe a nova data e horário"
                });
            }


            // 1. Buscar agendamento

            const agendamento =
                await prisma.agendamento.findFirst({
                    where: {
                        id,
                        empresaId
                    },
                    include: {
                        servico: true
                    }
                });

            if (!agendamento) {
                return res.status(404).json({
                    erro: "Agendamento não encontrado"
                });
            }


            // 2. Permitir edição apenas de AGENDADO

            if (agendamento.status !== "AGENDADO") {
                return res.status(400).json({
                    erro: "Somente agendamentos confirmados podem ser editados"
                });
            }


            // 3. Criar nova data de início

            const inicio =
                new Date(datahoraInicio);

            if (Number.isNaN(inicio.getTime())) {
                return res.status(400).json({
                    erro: "Data e horário inválidos"
                });
            }


            // 4. Calcular novo horário final

            const fim =
                new Date(
                    inicio.getTime() +
                    agendamento.servico.duracaoMinutos *
                    60 *
                    1000
                );


            // 5. Buscar horários de funcionamento

            const diaSemana =
                inicio.getDay();

            const horariosFuncionamento =
                await prisma.horarioFuncionamento.findMany({
                    where: {
                        empresaId,
                        diaSemana,
                        ativo: true
                    }
                });


            // 6. Verificar se cabe no funcionamento

            const dentroDoHorario =
                horariosFuncionamento.some((horario) => {

                    const inicioFuncionamento =
                        criarDataComHorario(
                            inicio,
                            horario.horaInicio
                        );

                    const fimFuncionamento =
                        criarDataComHorario(
                            inicio,
                            horario.horaFim
                        );

                    return (
                        inicio >= inicioFuncionamento &&
                        fim <= fimFuncionamento
                    );
                });

            if (!dentroDoHorario) {
                return res.status(400).json({
                    erro: "O novo horário está fora do horário de funcionamento"
                });
            }


            // 7. Verificar conflito

            const conflito =
                await prisma.agendamento.findFirst({
                    where: {
                        empresaId,

                        id: {
                            not: id
                        },

                        status: {
                            in: [
                                "AGUARDANDO_CONFIRMACAO",
                                "AGENDADO"
                            ]
                        },

                        datahoraInicio: {
                            lt: fim
                        },

                        datahoraFim: {
                            gt: inicio
                        }
                    }
                });

            if (conflito) {
                return res.status(409).json({
                    erro: "O novo horário já está ocupado"
                });
            }


            // 8. Atualizar agendamento

            const agendamentoAtualizado =
                await prisma.agendamento.update({
                    where: {
                        id
                    },
                    data: {
                        datahoraInicio: inicio,
                        datahoraFim: fim
                    }
                });

            return res.status(200).json(
                agendamentoAtualizado
            );

        } catch (erro) {
            console.error(
                "Erro ao editar agendamento:",
                erro
            );

            return res.status(500).json({
                erro: "Erro ao editar agendamento"
            });
        }
    }
);
*/