import express from "express";
import bcrypt from "bcrypt";

import {
    WebhookSignatureValidator,
    InvalidWebhookSignatureError,
    } from "mercadopago";,
    import { prisma } from "../lib/prisma";,
    import { auth } from "../middleware/auth";,
    import { gerartoken } from "../service/jwt";,
    import {,
    alterarValorAssinaturaMercadoPago,
    atualizarReferenciaAssinaturaMercadoPago,
    buscarAssinaturaMercadoPago,
    buscarFaturaMercadoPago,
    buscarPlanoMercadoPago,
    cancelarAssinaturaMercadoPago,
    criarAssinaturaMercadoPago,
    criarPlanoMercadoPago,
    fazerUpgradeAssinaturaMercadoPago,
    criarPagamentoUpgradeMercadoPago
} from "../service/mercadoPago";


function arredondarDinheiro(
    valor: number
): number {
    return Math.round(
        (valor + Number.EPSILON) * 100
    ) / 100;
}

function calcularValorProporcionalUpgrade({
    precoAtual,
    precoNovo,
    inicioCiclo,
    fimCiclo
}: {
    precoAtual: number;
    precoNovo: number;
    inicioCiclo: Date;
    fimCiclo: Date;
}): number {
    const agora =
        new Date();

    const duracaoTotal =
        fimCiclo.getTime() -
        inicioCiclo.getTime();

    const tempoRestante =
        Math.max(
            0,
            fimCiclo.getTime() -
            agora.getTime()
        );

    if (
        duracaoTotal <= 0 ||
        tempoRestante <= 0
    ) {
        return 0;
    }

    const diferenca =
        precoNovo -
        precoAtual;

    if (diferenca <= 0) {
        return 0;
    }

    const proporcaoRestante =
        Math.min(
            1,
            tempoRestante /
                duracaoTotal
        );

    return arredondarDinheiro(
        diferenca *
            proporcaoRestante
    );
}

const empresaRoutes = express.Router();


function calcularFimCiclo(
    inicio: Date,
    frequency: number,
    frequencyType: string
): Date {
    const fim = new Date(inicio);

    if (frequencyType === "days") {
        fim.setDate(
            fim.getDate() + frequency
        );

        return fim;
    }

    if (frequencyType === "months") {
        fim.setMonth(
            fim.getMonth() + frequency
        );

        return fim;
    }

    throw new Error(
        `Frequência não suportada: ${frequencyType}`
    );
}


// ======================================================
// EMPRESA
// ======================================================

empresaRoutes.get("/empresa", async (_req, res) => {
    try {
        const empresas = await prisma.empresa.findMany();

        return res.json(empresas);
    } catch (erro) {
        console.error("Erro ao buscar empresas:", erro);

        return res.status(500).json({
            erro: "Erro ao buscar empresas"
        });
    }
});

empresaRoutes.post("/empresa/cadastro", async (req, res) => {
    try {
        const {
            nome,
            email,
            senha,
            telefone
        } = req.body;

        const empresaExistente =
            await prisma.empresa.findUnique({
                where: {
                    email
                }
            });

        if (empresaExistente) {
            return res.status(409).json({
                erro: "Email já cadastrado"
            });
        }

        const senhaHash =
            await bcrypt.hash(senha, 10);

        const planoStart =
            await prisma.plano.findUnique({
                where: {
                    nome: "START"
                }
            });

        if (!planoStart) {
            return res.status(500).json({
                erro: "Plano inicial não encontrado"
            });
        }

        const inicioTrial = new Date();

        const fimTrial = new Date();
        fimTrial.setDate(
            fimTrial.getDate() + 30
        );

        const empresa =
            await prisma.$transaction(
                async (tx) => {
                    const novaEmpresa =
                        await tx.empresa.create({
                            data: {
                                nome,
                                email,
                                senhaHash,
                                telefone
                            }
                        });

                    await tx.assinatura.create({
                        data: {
                            empresaId:
                                novaEmpresa.id,
                            planoId:
                                planoStart.id,
                            status: "TRIAL",
                            inicioTrial,
                            fimTrial
                        }
                    });

                    return novaEmpresa;
                }
            );

        return res.status(201).json(empresa);
    } catch (erro) {
        console.error(
            "Erro ao cadastrar empresa:",
            erro
        );

        return res.status(500).json({
            erro: "Erro ao cadastrar empresa"
        });
    }
});

// ======================================================
// LOGIN
// ======================================================

empresaRoutes.post("/empresa/login", async (req, res) => {
    try {
        const {
            email,
            senha
        } = req.body;

        const empresa =
            await prisma.empresa.findUnique({
                where: {
                    email
                }
            });

        if (!empresa) {
            return res.status(401).json({
                erro: "Email ou senha inválidos"
            });
        }

        const senhaValida =
            await bcrypt.compare(
                senha,
                empresa.senhaHash
            );

        if (!senhaValida) {
            return res.status(401).json({
                erro: "Email ou senha inválidos"
            });
        }

        const token = gerartoken(
            empresa.id,
            empresa.email
        );

        return res.status(200).json({
            mensagem:
                "Login realizado com sucesso",
            token
        });
    } catch (erro) {
        console.error(
            "Erro no login:",
            erro
        );

        return res.status(500).json({
            erro: "Erro interno"
        });
    }
});

// ======================================================
// AUTENTICAÇÃO / PERFIL
// ======================================================

empresaRoutes.get(
    "/teste-auth",
    auth,
    (_req, res) => {
        return res.status(200).json({
            mensagem:
                "Você está autenticado"
        });
    }
);

empresaRoutes.get(
    "/perfil",
    auth,
    (req, res) => {
        return res.json({
            usuario:
                (req as any).usuario
        });
    }
);

// ======================================================
// ACESSO AO SISTEMA
// ======================================================

empresaRoutes.get(
    "/empresa/acesso",
    auth,
    async (req, res) => {
        try {
            const usuario =
                (req as any).usuario;

            const assinatura =
                await prisma.assinatura.findUnique({
                    where: {
                        empresaId:
                            usuario.empresaId
                    }
                });

            if (!assinatura) {
                return res.status(403).json({
                    acesso: false,
                    motivo:
                        "ASSINATURA_NAO_ENCONTRADA"
                });
            }

            const agora = new Date();

            if (
                assinatura.status ===
                "TRIAL"
            ) {
                if (
                    assinatura.fimTrial &&
                    agora <=
                        assinatura.fimTrial
                ) {
                    return res.status(200).json({
                        acesso: true,
                        status: "TRIAL",
                        fimTrial:
                            assinatura.fimTrial
                    });
                }

                return res.status(403).json({
                    acesso: false,
                    motivo:
                        "TRIAL_ENCERRADO"
                });
            }

            if (
                assinatura.status ===
                "ATIVA"
            ) {
                if (
                    assinatura.fimCiclo &&
                    agora <=
                        assinatura.fimCiclo
                ) {
                    return res.status(200).json({
                        acesso: true,

                        status:
                            "ATIVA",

                        fimCiclo:
                            assinatura.fimCiclo,

                        cancelamentoAgendado:
                            assinatura
                                .cancelamentoAgendado
                    });
                }

                /*
                 * A renovação foi cancelada anteriormente e o
                 * período já pago terminou.
                 */
                if (
                    assinatura
                        .cancelamentoAgendado
                ) {
                    await prisma.assinatura.update({
                        where: {
                            empresaId:
                                usuario.empresaId
                        },
                        data: {
                            status:
                                "CANCELADA"
                        }
                    });

                    return res.status(403).json({
                        acesso: false,
                        motivo:
                            "ASSINATURA_CANCELADA"
                    });
                }

                return res.status(403).json({
                    acesso: false,
                    motivo:
                        "ASSINATURA_VENCIDA"
                });
            }

            return res.status(403).json({
                acesso: false,
                motivo:
                    "ASSINATURA_INATIVA"
            });

        } catch (erro) {
            console.error(
                "Erro ao verificar acesso:",
                erro
            );

            return res.status(500).json({
                erro:
                    "Erro ao verificar acesso"
            });
        }
    }
);

// ======================================================
// PLANOS
// ======================================================

empresaRoutes.get(
    "/planos",
    async (_req, res) => {
        try {
            const planos =
                await prisma.plano.findMany({
                    where: {
                        ativo: true
                    },
                    orderBy: {
                        preco: "asc"
                    }
                });

            return res
                .status(200)
                .json(planos);
        } catch (erro) {
            console.error(
                "Erro ao buscar planos:",
                erro
            );

            return res.status(500).json({
                erro:
                    "Erro ao buscar planos"
            });
        }
    }
);

// ======================================================
// DADOS DA ASSINATURA DA EMPRESA
// ======================================================

empresaRoutes.get(
    "/empresa/assinatura",
    auth,
    async (req, res) => {
        try {
            const usuario =
                (req as any).usuario;

            const assinatura =
                await prisma.assinatura.findUnique({
                    where: {
                        empresaId:
                            usuario.empresaId
                    },
                    include: {
                        plano: true,
                        proximoPlano: true
                    }
                });

            if (!assinatura) {
                return res.status(404).json({
                    erro:
                        "Assinatura não encontrada"
                });
            }

            return res.status(200).json({
                status:
                    assinatura.status,

                inicioCiclo:
                    assinatura.inicioCiclo,

                fimCiclo:
                    assinatura.fimCiclo,

                inicioTrial:
                    assinatura.inicioTrial,

                fimTrial:
                    assinatura.fimTrial,

                cancelamentoAgendado:
                    assinatura.cancelamentoAgendado,

                plano: {
                    id:
                        assinatura.plano.id,

                    nome:
                        assinatura.plano.nome,

                    preco:
                        assinatura.plano.preco,

                    limiteAgendamentos:
                        assinatura.plano
                            .limiteAgendamentos
                },

                proximoPlano:
                    assinatura.proximoPlano
                        ? {
                            id:
                                assinatura
                                    .proximoPlano.id,

                            nome:
                                assinatura
                                    .proximoPlano.nome,

                            preco:
                                assinatura
                                    .proximoPlano.preco
                        }
                        : null
            });

        } catch (erro) {
            console.error(
                "Erro ao buscar assinatura:",
                erro
            );

            return res.status(500).json({
                erro:
                    "Erro ao buscar assinatura"
            });
        }
    }
);

// ======================================================
// ESCOLHA / TROCA DE PLANO
// ======================================================

empresaRoutes.post(
    "/assinatura/criar",
    auth,
    async (req, res) => {
        try {
            const usuario =
                (req as any).usuario;

            const { planoId } = req.body;

            if (
                !planoId ||
                typeof planoId !== "number"
            ) {
                return res.status(400).json({
                    erro: "Plano inválido"
                });
            }

            const planoNovo =
                await prisma.plano.findUnique({
                    where: {
                        id: planoId
                    }
                });

            if (
                !planoNovo ||
                !planoNovo.ativo
            ) {
                return res.status(404).json({
                    erro:
                        "Plano não encontrado"
                });
            }

            const assinatura =
                await prisma.assinatura.findUnique({
                    where: {
                        empresaId:
                            usuario.empresaId
                    },
                    include: {
                        plano: true
                    }
                });

            if (!assinatura) {
                return res.status(404).json({
                    erro:
                        "Assinatura não encontrada"
                });
            }

            // ==================================================
            // TRIAL
            // ==================================================

            if (
                assinatura.status === "TRIAL"
            ) {
                if (
                    planoNovo.id ===
                    assinatura.planoId
                ) {
                    await prisma.assinatura.update({
                        where: {
                            empresaId:
                                usuario.empresaId
                        },
                        data: {
                            proximoPlanoId:
                                planoNovo.id
                        }
                    });

                    return res.status(200).json({
                        acao:
                            "AGENDADO_APOS_TRIAL"
                    });
                }

                if (
                    planoNovo.nivel <
                    assinatura.plano.nivel
                ) {
                    await prisma.assinatura.update({
                        where: {
                            empresaId:
                                usuario.empresaId
                        },
                        data: {
                            proximoPlanoId:
                                planoNovo.id
                        }
                    });

                    return res.status(200).json({
                        acao:
                            "AGENDADO_APOS_TRIAL"
                    });
                }

                if (
                    planoNovo.nivel >
                    assinatura.plano.nivel
                ) {
                    return res.status(200).json({
                        acao:
                            "ESCOLHER_INICIO"
                    });
                }
            }

            // ==================================================
            // ASSINATURA ATIVA
            // ==================================================

            if (
                assinatura.status === "ATIVA"
            ) {
                if (
                    planoNovo.id ===
                    assinatura.planoId
                ) {
                    return res.status(400).json({
                        erro:
                            "Você já possui esse plano"
                    });
                }

                if (
                    !assinatura
                        .mercadoPagoAssinaturaId
                ) {
                    return res.status(400).json({
                        erro:
                            "Assinatura Mercado Pago não encontrada"
                    });
                }

                if (
                    assinatura.cancelamentoAgendado
                ) {
                    return res.status(409).json({
                        erro:
                            "A renovação desta assinatura está cancelada. Faça uma nova assinatura após o fim do ciclo para trocar de plano."
                    });
                }

                // ----------------------------------------------
                // DOWNGRADE
                // ----------------------------------------------
                //
                // O cliente continua com os recursos do plano
                // atual até o fim do ciclo.
                //
                // Porém o valor da PRÓXIMA cobrança já é alterado
                // agora no Mercado Pago.
                //
                // Quando a cobrança for aprovada, o webhook troca
                // planoId pelo proximoPlanoId.
                //
                if (
                    planoNovo.nivel <
                    assinatura.plano.nivel
                ) {
                    await alterarValorAssinaturaMercadoPago(
                        assinatura
                            .mercadoPagoAssinaturaId,
                        Number(
                            planoNovo.preco
                        )
                    );

                    await prisma.assinatura.update({
                        where: {
                            empresaId:
                                usuario.empresaId
                        },
                        data: {
                            proximoPlanoId:
                                planoNovo.id
                        }
                    });

                    return res.status(200).json({
                        acao:
                            "DOWNGRADE_AGENDADO",

                        planoAtual:
                            assinatura.plano.nome,

                        proximoPlano:
                            planoNovo.nome,

                        fimCiclo:
                            assinatura.fimCiclo
                    });
                }

                // ----------------------------------------------
                // UPGRADE
                // ----------------------------------------------
                //
                // Não alteramos plano nem cobrança recorrente aqui.
                //
                // Primeiro calculamos quanto falta pagar pelo
                // restante do ciclo. O frontend abre o CardForm,
                // gera um novo CardToken e chama /assinatura/upgrade.
                //
                if (
                    planoNovo.nivel >
                    assinatura.plano.nivel
                ) {
                    if (
                        !assinatura.inicioCiclo ||
                        !assinatura.fimCiclo
                    ) {
                        return res.status(400).json({
                            erro:
                                "Ciclo atual da assinatura não está configurado"
                        });
                    }

                    const valorProporcional =
                        calcularValorProporcionalUpgrade({
                            precoAtual:
                                Number(
                                    assinatura.plano.preco
                                ),

                            precoNovo:
                                Number(
                                    planoNovo.preco
                                ),

                            inicioCiclo:
                                assinatura.inicioCiclo,

                            fimCiclo:
                                assinatura.fimCiclo
                        });

                    return res.status(200).json({
                        acao:
                            "UPGRADE_PAGAMENTO",

                        planoAtual: {
                            id:
                                assinatura.plano.id,
                            nome:
                                assinatura.plano.nome,
                            preco:
                                Number(
                                    assinatura.plano.preco
                                )
                        },

                        planoNovo: {
                            id:
                                planoNovo.id,
                            nome:
                                planoNovo.nome,
                            preco:
                                Number(
                                    planoNovo.preco
                                )
                        },

                        valorProporcional,

                        fimCiclo:
                            assinatura.fimCiclo
                    });
                }
            }

            // ==================================================
            // VENCIDA / CANCELADA
            // ==================================================

            if (
                assinatura.status ===
                    "VENCIDA" ||
                assinatura.status ===
                    "CANCELADA"
            ) {
                return res.status(200).json({
                    acao:
                        "NOVA_ASSINATURA"
                });
            }

            return res.status(400).json({
                erro:
                    "Não foi possível processar a assinatura"
            });

        } catch (erro: any) {
            console.error(
                "Erro ao selecionar plano:",
                erro.response?.data ||
                    erro.message ||
                    erro
            );

            return res.status(
                erro.response?.status || 500
            ).json({
                erro:
                    erro.response?.data?.message ||
                    "Erro ao processar alteração de plano"
            });
        }
    }
);

// ======================================================
// UPGRADE COM COBRANÇA PROPORCIONAL
// ======================================================

empresaRoutes.post(
    "/assinatura/upgrade",
    auth,
    async (req, res) => {
        try {
            const usuario =
                (req as any).usuario;

            const {
                planoId,
                cardTokenId,
                paymentMethodId,
                installments,
                issuerId
            } = req.body;

            if (
                !planoId ||
                typeof planoId !== "number"
            ) {
                return res.status(400).json({
                    erro:
                        "Plano inválido"
                });
            }

            if (
                !cardTokenId ||
                typeof cardTokenId !== "string"
            ) {
                return res.status(400).json({
                    erro:
                        "Token do cartão não informado"
                });
            }

            if (
                !paymentMethodId ||
                typeof paymentMethodId !== "string"
            ) {
                return res.status(400).json({
                    erro:
                        "Meio de pagamento não informado"
                });
            }

            const numeroParcelas =
                Number(installments);

            if (
                !Number.isInteger(
                    numeroParcelas
                ) ||
                numeroParcelas < 1
            ) {
                return res.status(400).json({
                    erro:
                        "Número de parcelas inválido"
                });
            }

            const assinatura =
                await prisma.assinatura.findUnique({
                    where: {
                        empresaId:
                            usuario.empresaId
                    },
                    include: {
                        plano: true
                    }
                });

            if (!assinatura) {
                return res.status(404).json({
                    erro:
                        "Assinatura não encontrada"
                });
            }

            if (
                assinatura.status !== "ATIVA"
            ) {
                return res.status(409).json({
                    erro:
                        "A assinatura precisa estar ativa para fazer upgrade"
                });
            }

            if (
                assinatura.cancelamentoAgendado
            ) {
                return res.status(409).json({
                    erro:
                        "A renovação desta assinatura está cancelada"
                });
            }

            if (
                !assinatura
                    .mercadoPagoAssinaturaId
            ) {
                return res.status(400).json({
                    erro:
                        "Assinatura Mercado Pago não encontrada"
                });
            }

            if (
                !assinatura.inicioCiclo ||
                !assinatura.fimCiclo
            ) {
                return res.status(400).json({
                    erro:
                        "Ciclo atual da assinatura não configurado"
                });
            }

            const planoNovo =
                await prisma.plano.findUnique({
                    where: {
                        id:
                            planoId
                    }
                });

            if (
                !planoNovo ||
                !planoNovo.ativo
            ) {
                return res.status(404).json({
                    erro:
                        "Plano não encontrado"
                });
            }

            if (
                planoNovo.nivel <=
                assinatura.plano.nivel
            ) {
                return res.status(400).json({
                    erro:
                        "O plano escolhido não é um upgrade"
                });
            }

            /*
             * Recalculamos no backend. Nunca confiamos no
             * valor proporcional informado pelo frontend.
             */
            const valorProporcional =
                calcularValorProporcionalUpgrade({
                    precoAtual:
                        Number(
                            assinatura.plano.preco
                        ),

                    precoNovo:
                        Number(
                            planoNovo.preco
                        ),

                    inicioCiclo:
                        assinatura.inicioCiclo,

                    fimCiclo:
                        assinatura.fimCiclo
                });

            let pagamentoMP: any =
                null;

            /*
             * Se restar menos de R$ 0,01 após arredondamento,
             * não há valor útil para cobrar.
             */
            if (
                valorProporcional >= 0.01
            ) {
                pagamentoMP =
                    await criarPagamentoUpgradeMercadoPago({
                        cardTokenId,

                        valor:
                            valorProporcional,

                        paymentMethodId,

                        installments:
                            numeroParcelas,

                        issuerId,

                        email:
                            usuario.email,

                        empresaId:
                            usuario.empresaId,

                        planoAtualId:
                            assinatura.planoId,

                        planoNovoId:
                            planoNovo.id
                    });

                if (
                    pagamentoMP.status !==
                    "approved"
                ) {
                    return res.status(402).json({
                        erro:
                            "A cobrança proporcional do upgrade não foi aprovada",

                        status:
                            pagamentoMP.status,

                        statusDetail:
                            pagamentoMP.status_detail
                    });
                }
            }

            /*
             * Só depois da cobrança proporcional aprovada
             * alteramos a assinatura recorrente.
             *
             * O início e o fim do ciclo NÃO mudam.
             */
            await fazerUpgradeAssinaturaMercadoPago({
                assinaturaId:
                    assinatura
                        .mercadoPagoAssinaturaId,

                novoValor:
                    Number(
                        planoNovo.preco
                    ),

                empresaId:
                    usuario.empresaId,

                planoId:
                    planoNovo.id
            });

            await prisma.assinatura.update({
                where: {
                    empresaId:
                        usuario.empresaId
                },
                data: {
                    planoId:
                        planoNovo.id,

                    proximoPlanoId:
                        null
                }
            });

            return res.status(200).json({
                sucesso: true,

                acao:
                    "UPGRADE_REALIZADO",

                plano: {
                    id:
                        planoNovo.id,
                    nome:
                        planoNovo.nome,
                    preco:
                        Number(
                            planoNovo.preco
                        )
                },

                valorCobrado:
                    valorProporcional,

                pagamentoId:
                    pagamentoMP?.id
                        ? String(
                            pagamentoMP.id
                        )
                        : null,

                inicioCiclo:
                    assinatura.inicioCiclo,

                fimCiclo:
                    assinatura.fimCiclo
            });

        } catch (erro: any) {
            console.error(
                "Erro no upgrade proporcional:",
                erro.response?.data ||
                    erro.message ||
                    erro
            );

            return res.status(
                erro.response?.status || 500
            ).json({
                erro:
                    erro.response?.data?.message ||
                    "Erro ao realizar upgrade"
            });
        }
    }
);

// ======================================================
// CHECKOUT / CRIAÇÃO DA ASSINATURA
// ======================================================

empresaRoutes.post(
    "/assinatura/checkout",
    auth,
    async (req, res) => {
        try {
            const usuario =
                (req as any).usuario;

            const {
                planoId,
                cardTokenId
            } = req.body;

            if (
                !planoId ||
                typeof planoId !== "number"
            ) {
                return res.status(400).json({
                    erro: "Plano inválido"
                });
            }

            if (
                !cardTokenId ||
                typeof cardTokenId !== "string"
            ) {
                return res.status(400).json({
                    erro:
                        "Token do cartão não informado"
                });
            }

            if (
                !usuario?.empresaId ||
                !usuario?.email
            ) {
                return res.status(401).json({
                    erro:
                        "Usuário autenticado inválido"
                });
            }

            const plano =
                await prisma.plano.findUnique({
                    where: {
                        id: planoId
                    }
                });

            if (
                !plano ||
                !plano.ativo
            ) {
                return res.status(404).json({
                    erro:
                        "Plano não encontrado"
                });
            }

            if (
                !plano.mercadoPagoPlanoId
            ) {
                return res.status(400).json({
                    erro:
                        "Plano não configurado para pagamento"
                });
            }

            const assinatura =
                await prisma.assinatura.findUnique({
                    where: {
                        empresaId:
                            usuario.empresaId
                    }
                });

            if (!assinatura) {
                return res.status(404).json({
                    erro:
                        "Assinatura não encontrada"
                });
            }

            /*
             * SEGURANÇA CONTRA COBRANÇA DUPLA:
             *
             * Uma empresa que já possui assinatura ativa
             * não deve criar uma nova preapproval para fazer
             * upgrade. Isso poderia deixar duas assinaturas
             * recorrentes ativas simultaneamente.
             */
            if (
                assinatura.status === "ATIVA"
            ) {
                return res.status(409).json({
                    erro:
                        "Já existe uma assinatura ativa. O upgrade deve alterar a assinatura atual."
                });
            }

            /*
             * Guarda a intenção local antes da chamada externa.
             * O plano só vira planoId atual depois que o Mercado
             * Pago confirmar a assinatura como authorized.
             */
            await prisma.assinatura.update({
                where: {
                    empresaId:
                        usuario.empresaId
                },
                data: {
                    proximoPlanoId:
                        plano.id
                }
            });

            /*
             * O backend recebe apenas o CardToken.
             *
             * Número do cartão, validade e CVV são tratados
             * pelo MercadoPago.js no navegador.
             */
            const assinaturaMP =
                await criarAssinaturaMercadoPago({
                    planoMercadoPagoId:
                        plano.mercadoPagoPlanoId,

                    cardTokenId,

                    empresaId:
                        usuario.empresaId,

                    planoId:
                        plano.id,

                    email:
                        usuario.email
                });

            if (!assinaturaMP?.id) {
                return res.status(502).json({
                    erro:
                        "Mercado Pago não retornou o ID da assinatura"
                });
            }

            /*
             * O checkout NÃO cria inicioCiclo/fimCiclo.
             *
             * O Mercado Pago é a fonte de verdade do ciclo:
             * somente subscription_authorized_payment com
             * payment.status = approved cria/renova o ciclo.
             *
             * Aqui salvamos apenas os identificadores da
             * assinatura e a intenção do plano.
             */
            await prisma.assinatura.update({
                where: {
                    empresaId:
                        usuario.empresaId
                },
                data: {
                    proximoPlanoId:
                        plano.id,

                    mercadoPagoAssinaturaId:
                        String(
                            assinaturaMP.id
                        ),

                    mercadoPagoPayerId:
                        assinaturaMP.payer_id
                            ? String(
                                assinaturaMP.payer_id
                            )
                            : null,

                    /*
                     * Nova assinatura: aguardamos a primeira
                     * cobrança aprovada para iniciar o ciclo.
                     */
                    inicioCiclo:
                        null,

                    fimCiclo:
                        null,

                    ultimoPagamentoMercadoPagoId:
                        null,

                    cancelamentoAgendado:
                        false
                }
            });

            return res.status(201).json({
                sucesso: true,
                assinaturaMercadoPagoId:
                    String(assinaturaMP.id),
                status:
                    assinaturaMP.status
            });
        } catch (erro: any) {
            console.error(
                "Erro ao criar assinatura:",
                erro.response?.data ||
                    erro.message ||
                    erro
            );

            const mensagemMercadoPago =
                erro.response?.data?.message;

            return res.status(
                erro.response?.status || 500
            ).json({
                erro:
                    mensagemMercadoPago ||
                    "Erro ao criar assinatura"
            });
        }
    }
);


// ======================================================
// CANCELAR RENOVAÇÃO
// ======================================================

empresaRoutes.post(
    "/assinatura/cancelar",
    auth,
    async (req, res) => {
        try {
            const usuario =
                (req as any).usuario;

            const assinatura =
                await prisma.assinatura.findUnique({
                    where: {
                        empresaId:
                            usuario.empresaId
                    }
                });

            if (!assinatura) {
                return res.status(404).json({
                    erro:
                        "Assinatura não encontrada"
                });
            }

            if (
                assinatura.status !==
                "ATIVA"
            ) {
                return res.status(400).json({
                    erro:
                        "Não existe uma assinatura ativa para cancelar"
                });
            }

            if (
                assinatura.cancelamentoAgendado
            ) {
                return res.status(400).json({
                    erro:
                        "A renovação já está cancelada"
                });
            }

            if (
                !assinatura
                    .mercadoPagoAssinaturaId
            ) {
                return res.status(400).json({
                    erro:
                        "Assinatura Mercado Pago não encontrada"
                });
            }

            /*
             * Cancela novas cobranças no Mercado Pago.
             *
             * Localmente, NÃO mudamos para CANCELADA agora:
             * o cliente continua com acesso até fimCiclo.
             */
            const assinaturaMP =
                await cancelarAssinaturaMercadoPago(
                    assinatura
                        .mercadoPagoAssinaturaId
                );

            await prisma.assinatura.update({
                where: {
                    empresaId:
                        usuario.empresaId
                },
                data: {
                    cancelamentoAgendado:
                        true,

                    proximoPlanoId:
                        null
                }
            });

            return res.status(200).json({
                sucesso: true,

                mensagem:
                    "Renovação cancelada. O acesso continuará até o fim do ciclo atual.",

                fimCiclo:
                    assinatura.fimCiclo,

                statusMercadoPago:
                    assinaturaMP.status
            });

        } catch (erro: any) {
            console.error(
                "Erro ao cancelar renovação:",
                erro.response?.data ||
                    erro.message ||
                    erro
            );

            return res.status(
                erro.response?.status || 500
            ).json({
                erro:
                    erro.response?.data?.message ||
                    "Erro ao cancelar renovação"
            });
        }
    }
);

// ======================================================
// WEBHOOK MERCADO PAGO
// ======================================================

empresaRoutes.post(
    "/webhook/mercado-pago",
    async (req, res) => {
        try {
            const xSignature =
                req.headers["x-signature"];

            const xRequestId =
                req.headers["x-request-id"];

            const dataId =
                req.query["data.id"];

            const secret =
                process.env
                    .MERCADO_PAGO_WEBHOOK_SECRET;

            if (
                typeof xSignature !== "string" ||
                typeof xRequestId !== "string" ||
                typeof dataId !== "string" ||
                !secret
            ) {
                console.error(
                    "Webhook sem dados necessários para validação"
                );

                return res.sendStatus(401);
            }

            WebhookSignatureValidator.validate({
                xSignature,
                xRequestId,
                dataId,
                secret
            });

            const {
                type,
                data
            } = req.body;

            if (!data?.id) {
                return res.sendStatus(200);
            }

            // ==================================================
            // 1. EVENTOS DA ASSINATURA
            // ==================================================

            if (
                type ===
                "subscription_preapproval"
            ) {
                const assinaturaMP =
                    await buscarAssinaturaMercadoPago(
                        String(data.id)
                    );

                const referencia =
                    assinaturaMP.external_reference;

                if (
                    !referencia ||
                    typeof referencia !== "string"
                ) {
                    console.error(
                        "Assinatura Mercado Pago sem external_reference:",
                        assinaturaMP.id
                    );

                    return res.sendStatus(200);
                }

                const match =
                    referencia.match(
                        /^NEWERIS_EMPRESA_(\d+)_PLANO_(\d+)$/
                    );

                if (!match) {
                    console.error(
                        "external_reference desconhecida:",
                        referencia
                    );

                    return res.sendStatus(200);
                }

                const empresaId =
                    Number(match[1]);

                const planoId =
                    Number(match[2]);

                if (
                    !Number.isInteger(empresaId) ||
                    !Number.isInteger(planoId)
                ) {
                    console.error(
                        "Empresa ou plano inválidos:",
                        referencia
                    );

                    return res.sendStatus(200);
                }

                const assinaturaLocal =
                    await prisma.assinatura.findUnique({
                        where: {
                            empresaId
                        }
                    });

                if (!assinaturaLocal) {
                    console.error(
                        `Assinatura local da empresa ${empresaId} não encontrada`
                    );

                    return res.sendStatus(200);
                }

                console.log(
                    "Webhook Mercado Pago:",
                    {
                        assinaturaMercadoPagoId:
                            assinaturaMP.id,

                        payerId:
                            assinaturaMP.payer_id,

                        empresaId,

                        planoId,

                        statusMercadoPago:
                            assinaturaMP.status,

                        externalReference:
                            referencia
                    }
                );

                // ==============================================
                // AUTORIZADA
                // ==============================================

                if (
                    assinaturaMP.status ===
                    "authorized"
                ) {
                    /*
                     * IMPORTANTE:
                     *
                     * subscription_preapproval NÃO controla
                     * inicioCiclo/fimCiclo.
                     *
                     * A assinatura pode estar authorized antes
                     * de a fatura aprovada ser processada.
                     * O ciclo nasce exclusivamente no evento
                     * subscription_authorized_payment.
                     */
                    await prisma.assinatura.update({
                        where: {
                            empresaId
                        },

                        data: {
                            /*
                             * Se ainda não houve a primeira
                             * cobrança aprovada, mantemos o plano
                             * pretendido em proximoPlanoId.
                             *
                             * O webhook da cobrança moverá esse
                             * plano para planoId.
                             */
                            proximoPlanoId:
                                assinaturaLocal
                                    .inicioCiclo === null
                                    ? planoId
                                    : assinaturaLocal
                                        .proximoPlanoId,

                            mercadoPagoAssinaturaId:
                                String(
                                    assinaturaMP.id
                                ),

                            mercadoPagoPayerId:
                                assinaturaMP.payer_id
                                    ? String(
                                        assinaturaMP.payer_id
                                    )
                                    : assinaturaLocal
                                        .mercadoPagoPayerId,

                            cancelamentoAgendado:
                                false
                        }
                    });

                    console.log(
                        "Assinatura autorizada. Aguardando cobrança aprovada para criar/renovar ciclo:",
                        {
                            empresaId,
                            planoId,
                            assinaturaMercadoPagoId:
                                assinaturaMP.id
                        }
                    );

                    return res.sendStatus(200);
                }

                // ==============================================
                // CANCELADA
                // ==============================================

                if (
                    assinaturaMP.status === "canceled" ||
                    assinaturaMP.status === "cancelled"
                ) {
                    /*
                     * Se foi um cancelamento voluntário já
                     * agendado localmente, mantemos o acesso
                     * até fimCiclo.
                     */
                    if (
                        assinaturaLocal
                            .cancelamentoAgendado
                    ) {
                        console.log(
                            `Renovação da empresa ${empresaId} cancelada no Mercado Pago. Acesso mantido até ${assinaturaLocal.fimCiclo?.toISOString()}`
                        );

                        return res.sendStatus(200);
                    }

                    await prisma.assinatura.update({
                        where: {
                            empresaId
                        },

                        data: {
                            status:
                                "CANCELADA",

                            proximoPlanoId:
                                null
                        }
                    });

                    console.log(
                        `Assinatura da empresa ${empresaId} cancelada`
                    );

                    return res.sendStatus(200);
                }

                // ==============================================
                // PAUSADA
                // ==============================================

                if (
                    assinaturaMP.status ===
                    "paused"
                ) {
                    await prisma.assinatura.update({
                        where: {
                            empresaId
                        },

                        data: {
                            status:
                                "VENCIDA"
                        }
                    });

                    console.log(
                        `Assinatura da empresa ${empresaId} pausada`
                    );

                    return res.sendStatus(200);
                }

                console.log(
                    `Status de assinatura ${assinaturaMP.status} recebido; nenhuma alteração aplicada`
                );

                return res.sendStatus(200);
            }

            // ==================================================
            // 2. COBRANÇA RECORRENTE
            // ==================================================

            if (
                type ===
                "subscription_authorized_payment"
            ) {
                const faturaMP =
                    await buscarFaturaMercadoPago(
                        String(data.id)
                    );

                const preapprovalId =
                    faturaMP.preapproval_id;

                if (!preapprovalId) {
                    console.error(
                        "Fatura Mercado Pago sem preapproval_id:",
                        faturaMP.id
                    );

                    return res.sendStatus(200);
                }

                const assinaturaLocal =
                    await prisma.assinatura.findUnique({
                        where: {
                            mercadoPagoAssinaturaId:
                                String(
                                    preapprovalId
                                )
                        }
                    });

                if (!assinaturaLocal) {
                    console.error(
                        "Assinatura local não encontrada para:",
                        preapprovalId
                    );

                    return res.sendStatus(200);
                }

                const statusPagamento =
                    faturaMP.payment?.status;

                /*
                 * Preferimos o ID do pagamento final.
                 * Se ele ainda não existir, usamos o ID da fatura.
                 */
                const pagamentoId =
                    faturaMP.payment?.id
                        ? String(
                            faturaMP.payment.id
                        )
                        : String(
                            faturaMP.id
                        );

                console.log(
                    "Cobrança recorrente Mercado Pago:",
                    {
                        authorizedPaymentId:
                            faturaMP.id,

                        assinaturaMercadoPagoId:
                            preapprovalId,

                        empresaId:
                            assinaturaLocal
                                .empresaId,

                        paymentId:
                            pagamentoId,

                        paymentStatus:
                            statusPagamento,

                        paymentStatusDetail:
                            faturaMP.payment
                                ?.status_detail,

                        debitDate:
                            faturaMP.debit_date,

                        dateCreated:
                            faturaMP.date_created,

                        retryAttempt:
                            faturaMP.retry_attempt
                    }
                );

                // ==============================================
                // PAGAMENTO APROVADO
                // ==============================================

                if (
                    statusPagamento ===
                    "approved"
                ) {
                    /*
                     * Webhooks podem ser reenviados.
                     *
                     * Se esse pagamento já foi usado para criar
                     * um ciclo, não fazemos absolutamente nada.
                     */
                    if (
                        assinaturaLocal
                            .ultimoPagamentoMercadoPagoId ===
                        pagamentoId
                    ) {
                        console.log(
                            `Pagamento ${pagamentoId} já processado para a empresa ${assinaturaLocal.empresaId}`
                        );

                        return res.sendStatus(200);
                    }

                    /*
                     * Na PRIMEIRA cobrança de uma nova assinatura,
                     * proximoPlanoId contém o plano que o cliente
                     * acabou de contratar.
                     *
                     * Em renovações normais, ele é null.
                     *
                     * Em downgrade agendado, ele contém o plano
                     * que deve entrar exatamente agora.
                     */
                    const planoCicloId =
                        assinaturaLocal
                            .proximoPlanoId ??
                        assinaturaLocal
                            .planoId;

                    const planoCiclo =
                        await prisma.plano.findUnique({
                            where: {
                                id:
                                    planoCicloId
                            }
                        });

                    if (
                        !planoCiclo ||
                        !planoCiclo
                            .mercadoPagoPlanoId
                    ) {
                        console.error(
                            "Plano local não encontrado para cobrança:",
                            planoCicloId
                        );

                        return res.sendStatus(200);
                    }

                    const planoMP =
                        await buscarPlanoMercadoPago(
                            planoCiclo
                                .mercadoPagoPlanoId
                        );

                    const frequency =
                        Number(
                            planoMP.auto_recurring
                                ?.frequency
                        );

                    const frequencyType =
                        planoMP.auto_recurring
                            ?.frequency_type;

                    if (
                        !frequency ||
                        !frequencyType
                    ) {
                        throw new Error(
                            "Frequência do plano Mercado Pago não encontrada"
                        );
                    }

                    /*
                     * O próprio authorized_payment informa
                     * debit_date e date_created.
                     *
                     * debit_date representa a data programada
                     * para débito daquela fatura. Se ela não
                     * vier, usamos date_created.
                     *
                     * Não utilizamos o fimCiclo anterior para
                     * calcular o novo ciclo, então assinaturas
                     * que estavam um ciclo adiantadas se
                     * autocorrigem na próxima cobrança.
                     */
                    const dataCobrancaRaw =
                        faturaMP.debit_date ||
                        faturaMP.date_created;

                    if (!dataCobrancaRaw) {
                        throw new Error(
                            "Mercado Pago não retornou a data da cobrança"
                        );
                    }

                    const inicioCiclo =
                        new Date(
                            dataCobrancaRaw
                        );

                    if (
                        Number.isNaN(
                            inicioCiclo.getTime()
                        )
                    ) {
                        throw new Error(
                            "Data da cobrança Mercado Pago inválida"
                        );
                    }

                    const fimCiclo =
                        calcularFimCiclo(
                            inicioCiclo,
                            frequency,
                            frequencyType
                        );

                    /*
                     * Se existe proximoPlanoId, este pagamento
                     * inaugura o ciclo desse plano.
                     *
                     * Isso cobre tanto:
                     * - primeira assinatura;
                     * - downgrade agendado.
                     */
                    let planoIdNovo =
                        assinaturaLocal
                            .planoId;

                    let proximoPlanoIdNovo:
                        number | null =
                        assinaturaLocal
                            .proximoPlanoId;

                    if (
                        assinaturaLocal
                            .proximoPlanoId
                    ) {
                        const proximoPlano =
                            await prisma.plano.findUnique({
                                where: {
                                    id:
                                        assinaturaLocal
                                            .proximoPlanoId
                                }
                            });

                        if (proximoPlano) {
                            planoIdNovo =
                                proximoPlano.id;

                            proximoPlanoIdNovo =
                                null;

                            /*
                             * Mantém os próximos eventos do MP
                             * apontando para o plano que agora
                             * virou o plano atual.
                             */
                            await atualizarReferenciaAssinaturaMercadoPago(
                                String(
                                    preapprovalId
                                ),
                                assinaturaLocal
                                    .empresaId,
                                proximoPlano.id
                            );
                        }
                    }

                    await prisma.assinatura.update({
                        where: {
                            empresaId:
                                assinaturaLocal
                                    .empresaId
                        },

                        data: {
                            planoId:
                                planoIdNovo,

                            proximoPlanoId:
                                proximoPlanoIdNovo,

                            status:
                                "ATIVA",

                            inicioCiclo,

                            fimCiclo,

                            /*
                             * Uma cobrança aprovada inicia uma
                             * nova franquia/ciclo.
                             */
                            agendamentosNoCiclo:
                                0,

                            cancelamentoAgendado:
                                false,

                            ultimoPagamentoMercadoPagoId:
                                pagamentoId
                        }
                    });

                    console.log(
                        "Ciclo sincronizado pela cobrança real do Mercado Pago:",
                        {
                            empresaId:
                                assinaturaLocal
                                    .empresaId,

                            pagamentoId,

                            planoId:
                                planoIdNovo,

                            inicioCiclo:
                                inicioCiclo
                                    .toISOString(),

                            fimCiclo:
                                fimCiclo
                                    .toISOString()
                        }
                    );

                    return res.sendStatus(200);
                }

                // ==============================================
                // PAGAMENTO RECUSADO / CANCELADO
                // ==============================================

                if (
                    statusPagamento ===
                        "rejected" ||
                    statusPagamento ===
                        "cancelled"
                ) {
                    /*
                     * Não estendemos o ciclo.
                     * O Mercado Pago pode fazer novas tentativas.
                     */
                    console.warn(
                        `Cobrança da empresa ${assinaturaLocal.empresaId} não aprovada. Status: ${statusPagamento}. O ciclo local não foi alterado.`
                    );

                    return res.sendStatus(200);
                }

                // ==============================================
                // PENDENTE / EM PROCESSAMENTO
                // ==============================================

                if (
                    statusPagamento ===
                        "pending" ||
                    statusPagamento ===
                        "in_process"
                ) {
                    console.log(
                        `Cobrança da empresa ${assinaturaLocal.empresaId} ainda está pendente`
                    );

                    return res.sendStatus(200);
                }

                console.log(
                    `Cobrança ${faturaMP.id} sem resultado final; nenhuma alteração aplicada`
                );

                return res.sendStatus(200);
            }

            return res.sendStatus(200);

        } catch (erro) {
            if (
                erro instanceof
                InvalidWebhookSignatureError
            ) {
                console.error(
                    "Webhook Mercado Pago inválido"
                );

                return res.sendStatus(401);
            }

            console.error(
                "Erro ao processar webhook Mercado Pago:",
                erro
            );

            return res.sendStatus(500);
        }
    }
);

// ======================================================
// ROTA TEMPORÁRIA DE TESTE
// ======================================================
//
// Remova ou proteja antes de colocar em produção.
//

empresaRoutes.post(
    "/teste-mercado-pago",
    async (_req, res) => {
        try {
            const plano =
                await criarPlanoMercadoPago({
                    nome:
                        "NewerisBook Start",
                    preco: 19.90,
                    referencia:
                        "NEWERIS_START"
                });

            return res
                .status(200)
                .json(plano);
        } catch (erro: any) {
            console.error(
                "Erro Mercado Pago:",
                erro.response?.data ||
                    erro.message ||
                    erro
            );

            return res.status(500).json({
                erro:
                    "Erro ao criar plano no Mercado Pago"
            });
        }
    }
);

export default empresaRoutes;