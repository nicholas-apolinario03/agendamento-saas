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
    buscarAssinaturaMercadoPago,
    criarAssinaturaMercadoPago,
    criarPlanoMercadoPago
} from "../service/mercadoPago";

const empresaRoutes = express.Router();

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
                assinatura.status === "TRIAL"
            ) {
                if (
                    assinatura.fimTrial &&
                    agora <=
                    assinatura.fimTrial
                ) {
                    return res
                        .status(200)
                        .json({
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
                assinatura.status === "ATIVA"
            ) {
                if (
                    !assinatura.fimCiclo ||
                    agora <=
                    assinatura.fimCiclo
                ) {
                    return res
                        .status(200)
                        .json({
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

            // --------------------------------------------------
            // TRIAL
            // --------------------------------------------------

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

                    return res
                        .status(200)
                        .json({
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

                    return res
                        .status(200)
                        .json({
                            acao:
                                "AGENDADO_APOS_TRIAL"
                        });
                }

                if (
                    planoNovo.nivel >
                    assinatura.plano.nivel
                ) {
                    return res
                        .status(200)
                        .json({
                            acao:
                                "ESCOLHER_INICIO"
                        });
                }
            }

            // --------------------------------------------------
            // ASSINATURA ATIVA
            // --------------------------------------------------

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

                    return res
                        .status(200)
                        .json({
                            acao:
                                "DOWNGRADE_AGENDADO"
                        });
                }

                if (
                    planoNovo.nivel >
                    assinatura.plano.nivel
                ) {
                    return res
                        .status(200)
                        .json({
                            acao: "UPGRADE"
                        });
                }
            }

            // --------------------------------------------------
            // VENCIDA / CANCELADA
            // --------------------------------------------------

            if (
                assinatura.status ===
                "VENCIDA" ||
                assinatura.status ===
                "CANCELADA"
            ) {
                return res
                    .status(200)
                    .json({
                        acao:
                            "NOVA_ASSINATURA"
                    });
            }

            return res.status(400).json({
                erro:
                    "Não foi possível processar a assinatura"
            });
        } catch (erro) {
            console.error(
                "Erro ao selecionar plano:",
                erro
            );

            return res.status(500).json({
                erro: "Erro interno"
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
                const inicioCiclo =
                    new Date();

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
                        new Date(inicioCiclo);

                    fimCiclo.setMonth(
                        fimCiclo.getMonth() + 1
                    );
                }

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
                "===== ERRO MERCADO PAGO ====="
            );

            console.error(
                "STATUS:",
                erro.response?.status
            );

            console.error(
                "DATA:",
                JSON.stringify(
                    erro.response?.data,
                    null,
                    2
                )
            );

            console.error(
                "REQUEST ID:",
                erro.response?.headers?.["x-request-id"]
            );

            console.error(
                "============================="
            );

            return res.status(
                erro.response?.status || 500
            ).json({
                erro:
                    erro.response?.data?.message ||
                    "Erro ao criar assinatura"
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

            if (
                type !==
                "subscription_preapproval"
            ) {
                return res.sendStatus(200);
            }

            if (!data?.id) {
                return res.sendStatus(200);
            }

            /*
             * Busca os dados completos diretamente no
             * Mercado Pago.
             */
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

            /*
             * Exemplo esperado:
             *
             * NEWERIS_EMPRESA_15_PLANO_2
             */
            const match = referencia.match(
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
                    "Empresa ou plano inválidos na referência:",
                    referencia
                );

                return res.sendStatus(200);
            }

            const empresa =
                await prisma.empresa.findUnique({
                    where: {
                        id: empresaId
                    }
                });

            if (!empresa) {
                console.error(
                    `Empresa ${empresaId} não encontrada`
                );

                return res.sendStatus(200);
            }

            const plano =
                await prisma.plano.findUnique({
                    where: {
                        id: planoId
                    }
                });

            if (!plano) {
                console.error(
                    `Plano ${planoId} não encontrado`
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

            // --------------------------------------------------
            // AUTORIZADA
            // --------------------------------------------------

            if (
                assinaturaMP.status ===
                "authorized"
            ) {
                const inicioCiclo =
                    new Date();

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
                        new Date(
                            inicioCiclo
                        );

                    fimCiclo.setMonth(
                        fimCiclo.getMonth() + 1
                    );
                }

                await prisma.assinatura.update({
                    where: {
                        empresaId
                    },
                    data: {
                        planoId,
                        status: "ATIVA",

                        inicioCiclo,
                        fimCiclo,

                        proximoPlanoId:
                            null,

                        /*
                         * Agora aproveitamos os campos que
                         * já existem no seu schema.prisma.
                         */
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

                console.log(
                    `Assinatura da empresa ${empresaId} ativada no plano ${planoId}`
                );

                return res.sendStatus(200);
            }

            // --------------------------------------------------
            // CANCELADA
            // --------------------------------------------------

            if (
                assinaturaMP.status ===
                "cancelled"
            ) {
                await prisma.assinatura.update({
                    where: {
                        empresaId
                    },
                    data: {
                        status:
                            "CANCELADA",
                        proximoPlanoId:
                            null,

                        /*
                         * Mantemos o ID da assinatura e payer
                         * para histórico/reconciliação.
                         */
                        mercadoPagoAssinaturaId:
                            assinaturaMP.id
                                ? String(
                                    assinaturaMP.id
                                )
                                : assinaturaLocal
                                    .mercadoPagoAssinaturaId,

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
                    `Assinatura da empresa ${empresaId} cancelada`
                );

                return res.sendStatus(200);
            }

            // --------------------------------------------------
            // PAUSADA
            // --------------------------------------------------

            if (
                assinaturaMP.status ===
                "paused"
            ) {
                /*
                 * Seu enum não possui PAUSADA.
                 * Então VENCIDA é usada para bloquear acesso.
                 */
                await prisma.assinatura.update({
                    where: {
                        empresaId
                    },
                    data: {
                        status:
                            "VENCIDA",

                        mercadoPagoAssinaturaId:
                            assinaturaMP.id
                                ? String(
                                    assinaturaMP.id
                                )
                                : assinaturaLocal
                                    .mercadoPagoAssinaturaId,

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
                    `Assinatura da empresa ${empresaId} pausada`
                );

                return res.sendStatus(200);
            }

            /*
             * pending ou qualquer outro status não ativa
             * a empresa.
             */
            console.log(
                `Status ${assinaturaMP.status} recebido; nenhuma alteração de acesso realizada`
            );

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