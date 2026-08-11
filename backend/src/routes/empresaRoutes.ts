import express from "express";
import bcrypt from "bcrypt";

import {
    WebhookSignatureValidator,
    InvalidWebhookSignatureError
} from "mercadopago";

import { prisma } from "../lib/prisma";
import { auth } from "../middleware/auth";
import { gerartoken } from "../service/jwt";

import {
    alterarValorAssinaturaMercadoPago,
    atualizarReferenciaAssinaturaMercadoPago,
    buscarAssinaturaMercadoPago,
    buscarFaturaMercadoPago,
    buscarPlanoMercadoPago,
    cancelarAssinaturaMercadoPago,
    criarAssinaturaMercadoPago,
    criarPlanoMercadoPago,
    fazerUpgradeAssinaturaMercadoPago
} from "../service/mercadoPago";

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
                        status: "ATIVA",
                        fimCiclo:
                            assinatura.fimCiclo
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
                // O acesso ao novo plano é liberado imediatamente.
                // A mesma assinatura do Mercado Pago é mantida;
                // apenas o valor das próximas cobranças é alterado.
                //
                if (
                    planoNovo.nivel >
                    assinatura.plano.nivel
                ) {
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
                        acao:
                            "UPGRADE_REALIZADO",

                        planoId:
                            planoNovo.id,

                        plano:
                            planoNovo.nome
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
             * A resposta do POST /preapproval já nos permite
             * persistir os identificadores imediatamente.
             * O webhook continua sendo a fonte de sincronização
             * para alterações posteriores.
             */
            if (
                assinaturaMP.status ===
                "authorized"
            ) {
                const planoMP =
                    await buscarPlanoMercadoPago(
                        plano.mercadoPagoPlanoId
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

                const inicioCiclo =
                    new Date();

                const fimCiclo =
                    calcularFimCiclo(
                        inicioCiclo,
                        frequency,
                        frequencyType
                    );

                await prisma.assinatura.update({
                    where: {
                        empresaId:
                            usuario.empresaId
                    },
                    data: {
                        planoId:
                            plano.id,

                        status:
                            "ATIVA",

                        inicioCiclo,
                        fimCiclo,

                        proximoPlanoId:
                            null,

                        mercadoPagoAssinaturaId:
                            String(
                                assinaturaMP.id
                            ),

                        mercadoPagoPayerId:
                            assinaturaMP.payer_id
                                ? String(
                                    assinaturaMP.payer_id
                                )
                                : null
                    }
                });
            } else {
                /*
                 * Não liberamos acesso se o Mercado Pago não
                 * devolver authorized.
                 *
                 * O webhook poderá sincronizar posteriormente.
                 */
                await prisma.assinatura.update({
                    where: {
                        empresaId:
                            usuario.empresaId
                    },
                    data: {
                        mercadoPagoAssinaturaId:
                            String(
                                assinaturaMP.id
                            ),

                        mercadoPagoPayerId:
                            assinaturaMP.payer_id
                                ? String(
                                    assinaturaMP.payer_id
                                )
                                : null
                    }
                });
            }

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
// CANCELAR ASSINATURA
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
                !assinatura
                    .mercadoPagoAssinaturaId
            ) {
                return res.status(400).json({
                    erro:
                        "Assinatura Mercado Pago não encontrada"
                });
            }

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
                    status:
                        "CANCELADA",

                    proximoPlanoId:
                        null
                }
            });

            return res.status(200).json({
                sucesso: true,
                mensagem:
                    "Assinatura cancelada com sucesso",
                statusMercadoPago:
                    assinaturaMP.status
            });

        } catch (erro: any) {
            console.error(
                "Erro ao cancelar assinatura:",
                erro.response?.data ||
                    erro.message ||
                    erro
            );

            return res.status(
                erro.response?.status || 500
            ).json({
                erro:
                    erro.response?.data?.message ||
                    "Erro ao cancelar assinatura"
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
                        "Empresa/plano inválidos:",
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

                // ----------------------------------------------
                // AUTORIZADA
                // ----------------------------------------------

                if (
                    assinaturaMP.status ===
                    "authorized"
                ) {
                    /*
                     * O next_payment_date é usado como fim do
                     * ciclo atual / próxima cobrança.
                     */
                    let fimCiclo: Date;

                    if (
                        assinaturaMP.next_payment_date
                    ) {
                        fimCiclo =
                            new Date(
                                assinaturaMP.next_payment_date
                            );
                    } else {
                        fimCiclo =
                            new Date();

                        fimCiclo.setMonth(
                            fimCiclo.getMonth() + 1
                        );
                    }

                    /*
                     * Se a assinatura acabou de ser criada, usamos agora
                     * como início. Se já existe um ciclo, preservamos.
                     *
                     * Isso evita que um webhook duplicado fique
                     * deslocando o inicioCiclo.
                     */
                    const inicioCiclo =
                        assinaturaLocal.inicioCiclo ||
                        new Date();

                    await prisma.assinatura.update({
                        where: {
                            empresaId
                        },
                        data: {
                            planoId,

                            status:
                                "ATIVA",

                            inicioCiclo,
                            fimCiclo,

                            proximoPlanoId:
                                assinaturaLocal.proximoPlanoId,

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
                                        .mercadoPagoPayerId
                        }
                    });

                    console.log(
                        `Assinatura da empresa ${empresaId} ativada no plano ${planoId}`
                    );

                    return res.sendStatus(200);
                }

                // ----------------------------------------------
                // CANCELADA
                // ----------------------------------------------

                if (
                    assinaturaMP.status === "canceled" ||
                    assinaturaMP.status === "cancelled"
                ) {
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

                // ----------------------------------------------
                // PAUSADA
                // ----------------------------------------------

                if (
                    assinaturaMP.status ===
                    "paused"
                ) {
                    /*
                     * Seu enum atual não possui PAUSADA.
                     * Usamos VENCIDA para bloquear o acesso.
                     */
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
            // 2. COBRANÇA RECORRENTE / FATURA
            // ==================================================

            if (
                type ===
                "subscription_authorized_payment"
            ) {
                /*
                 * data.id = ID da fatura recorrente.
                 *
                 * Consultamos o Mercado Pago em vez de confiar
                 * somente no corpo do webhook.
                 */
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

                /*
                 * Encontramos a empresa pelo ID da assinatura do MP.
                 * Aqui não precisamos extrair empresaId do
                 * external_reference.
                 */
                const assinaturaLocal =
                    await prisma.assinatura.findUnique({
                        where: {
                            mercadoPagoAssinaturaId:
                                String(preapprovalId)
                        }
                    });

                if (!assinaturaLocal) {
                    console.error(
                        "Assinatura local não encontrada para preapproval:",
                        preapprovalId
                    );

                    return res.sendStatus(200);
                }

                /*
                 * A resposta de /authorized_payments/{id} contém
                 * payment.status. É esse status que interessa para
                 * saber se aquela cobrança efetivamente foi aprovada.
                 */
                const statusPagamento =
                    faturaMP.payment?.status;

                console.log(
                    "Cobrança recorrente Mercado Pago:",
                    {
                        authorizedPaymentId:
                            faturaMP.id,

                        assinaturaMercadoPagoId:
                            preapprovalId,

                        empresaId:
                            assinaturaLocal.empresaId,

                        statusFatura:
                            faturaMP.status,

                        summarized:
                            faturaMP.summarized,

                        paymentId:
                            faturaMP.payment?.id,

                        paymentStatus:
                            statusPagamento,

                        paymentStatusDetail:
                            faturaMP.payment
                                ?.status_detail,

                        retryAttempt:
                            faturaMP.retry_attempt
                    }
                );

                // ----------------------------------------------
                // PAGAMENTO APROVADO
                // ----------------------------------------------

                if (
                    statusPagamento ===
                    "approved"
                ) {
                    /*
                     * Consultamos a assinatura novamente.
                     * Depois da cobrança aprovada, o MP informa
                     * a próxima data de pagamento.
                     */
                    const assinaturaMP =
                        await buscarAssinaturaMercadoPago(
                            String(preapprovalId)
                        );

                    let novoFimCiclo: Date;

                    if (
                        assinaturaMP.next_payment_date
                    ) {
                        novoFimCiclo =
                            new Date(
                                assinaturaMP.next_payment_date
                            );
                    } else {
                        novoFimCiclo =
                            new Date();

                        novoFimCiclo.setMonth(
                            novoFimCiclo.getMonth() + 1
                        );
                    }

                    /*
                     * WEBHOOKS PODEM SER REPETIDOS.
                     *
                     * Só consideramos que começou um NOVO ciclo se
                     * o novo next_payment_date for posterior ao
                     * fimCiclo que já temos no banco.
                     *
                     * Isso impede um webhook duplicado de zerar
                     * agendamentosNoCiclo várias vezes.
                     */
                    const cicloAvancou =
                        !assinaturaLocal.fimCiclo ||
                        novoFimCiclo.getTime() >
                            assinaturaLocal
                                .fimCiclo
                                .getTime();

                    if (!cicloAvancou) {
                        console.log(
                            `Cobrança ${faturaMP.id} já refletida no ciclo da empresa ${assinaturaLocal.empresaId}`
                        );

                        return res.sendStatus(200);
                    }

                    const novoInicioCiclo =
                        assinaturaLocal.fimCiclo ||
                        new Date();

                    /*
                     * Se havia downgrade agendado, essa cobrança
                     * já foi feita com o novo valor porque alteramos
                     * o transaction_amount quando o usuário pediu
                     * o downgrade.
                     *
                     * Agora que o novo ciclo começou, aplicamos
                     * também o plano local.
                     */
                    let planoIdNovo =
                        assinaturaLocal.planoId;

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
                            /*
                             * Atualizamos também a external_reference
                             * para os próximos eventos da assinatura
                             * apontarem para o plano correto.
                             */
                            await atualizarReferenciaAssinaturaMercadoPago(
                                String(
                                    preapprovalId
                                ),
                                assinaturaLocal
                                    .empresaId,
                                proximoPlano.id
                            );

                            planoIdNovo =
                                proximoPlano.id;

                            proximoPlanoIdNovo =
                                null;
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

                            inicioCiclo:
                                novoInicioCiclo,

                            fimCiclo:
                                novoFimCiclo,

                            agendamentosNoCiclo:
                                0
                        }
                    });

                    console.log(
                        `Ciclo da empresa ${assinaturaLocal.empresaId} renovado até ${novoFimCiclo.toISOString()}`
                    );

                    return res.sendStatus(200);
                }

                // ----------------------------------------------
                // PAGAMENTO RECUSADO
                // ----------------------------------------------

                if (
                    statusPagamento ===
                    "rejected" ||
                    statusPagamento ===
                    "cancelled"
                ) {
                    /*
                     * NÃO marcamos VENCIDA imediatamente.
                     *
                     * O Mercado Pago pode realizar novas tentativas
                     * de cobrança. Além disso, a empresa já pagou
                     * pelo ciclo atual e deve continuar com acesso
                     * até fimCiclo.
                     *
                     * Como fimCiclo não é estendido aqui, a rota
                     * /empresa/acesso bloqueará naturalmente quando
                     * o ciclo já pago terminar.
                     */
                    console.warn(
                        `Cobrança da empresa ${assinaturaLocal.empresaId} não aprovada. Status: ${statusPagamento}. O ciclo não será estendido.`
                    );

                    return res.sendStatus(200);
                }

                // ----------------------------------------------
                // PENDENTE / EM PROCESSAMENTO
                // ----------------------------------------------

                if (
                    statusPagamento ===
                        "pending" ||
                    statusPagamento ===
                        "in_process"
                ) {
                    console.log(
                        `Cobrança da empresa ${assinaturaLocal.empresaId} ainda está pendente.`
                    );

                    return res.sendStatus(200);
                }

                /*
                 * Em algumas fases da fatura pode ainda não existir
                 * payment.status. Não alteramos o acesso até uma
                 * atualização posterior do Mercado Pago.
                 */
                console.log(
                    `Cobrança ${faturaMP.id} sem resultado final. Nenhuma alteração aplicada.`
                );

                return res.sendStatus(200);
            }

            /*
             * Outros eventos são ignorados por enquanto.
             *
             * O Mercado Pago também recomenda habilitar o tópico
             * "payment" para acompanhar os pagamentos vinculados
             * às assinaturas. Podemos adicionar isso na próxima etapa.
             */
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