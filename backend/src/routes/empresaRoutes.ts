import express from "express";
import { prisma } from "../lib/prisma";
import { auth } from "../middleware/auth";

import bcrypt from "bcrypt";
import { gerartoken } from "../service/jwt";
import { criarAssinaturaMercadoPago, criarPlanoMercadoPago } from "../service/mercadoPago";

const empresaRoutes =
    express.Router();




empresaRoutes.get("/empresa", async (req, res) => {
    const empresas = await prisma.empresa.findMany();
    res.json(empresas);
});
empresaRoutes.post("/empresa/cadastro", async (req, res) => {
    try {
        const { nome, email, senha, telefone } = req.body;



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
        const senhaHash = await bcrypt.hash(senha, 10);

        const planoStart = await prisma.plano.findUnique({
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
        fimTrial.setDate(fimTrial.getDate() + 30);

        const empresa = await prisma.$transaction(async (tx) => {

            const novaEmpresa = await tx.empresa.create({
                data: {
                    nome,
                    email,
                    senhaHash,
                    telefone
                }
            });

            await tx.assinatura.create({
                data: {
                    empresaId: novaEmpresa.id,
                    planoId: planoStart.id,
                    status: "TRIAL",
                    inicioTrial,
                    fimTrial
                }
            });

            return novaEmpresa;
        });

        return res.status(201).json(empresa);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
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
empresaRoutes.get("/perfil", auth, (req, res) => {

    return res.json({
        usuario: (req as any).usuario
    });

}
);
empresaRoutes.get("/empresa/acesso", auth, async (req, res) => {
    try {
        const usuario = (req as any).usuario;

        const assinatura = await prisma.assinatura.findUnique({
            where: {
                empresaId: usuario.empresaId
            }
        });

        if (!assinatura) {
            return res.status(403).json({
                acesso: false,
                motivo: "ASSINATURA_NAO_ENCONTRADA"
            });
        }

        const agora = new Date();

        if (assinatura.status === "TRIAL") {
            if (assinatura.fimTrial && agora <= assinatura.fimTrial) {
                return res.status(200).json({
                    acesso: true,
                    status: "TRIAL",
                    fimTrial: assinatura.fimTrial
                });
            }

            return res.status(403).json({
                acesso: false,
                motivo: "TRIAL_ENCERRADO"
            });
        }

        if (assinatura.status === "ATIVA") {
            if (assinatura.fimCiclo && agora <= assinatura.fimCiclo) {
                return res.status(200).json({
                    acesso: true,
                    status: "ATIVA",
                    fimCiclo: assinatura.fimCiclo
                });
            }

            return res.status(403).json({
                acesso: false,
                motivo: "ASSINATURA_VENCIDA"
            });
        }

        return res.status(403).json({
            acesso: false,
            motivo: "ASSINATURA_INATIVA"
        });

    } catch (erro) {
        console.error(erro);

        return res.status(500).json({
            erro: "Erro ao verificar acesso"
        });
    }
});

empresaRoutes.get("/planos", async (req, res) => {
    try {
        const planos = await prisma.plano.findMany({
            where: {
                ativo: true
            },
            orderBy: {
                preco: "asc"
            }
        });

        return res.status(200).json(planos);

    } catch (erro) {
        console.error(erro);

        return res.status(500).json({
            erro: "Erro ao buscar planos"
        });
    }
});
empresaRoutes.post(
    "/assinatura/assinar",
    auth,
    async (req, res) => {
        try {
            const usuario = (req as any).usuario;

            const {
                planoId,
                cardTokenId
            } = req.body;

            if (
                !planoId ||
                typeof planoId !== "number" ||
                !cardTokenId
            ) {
                return res.status(400).json({
                    erro: "Dados inválidos"
                });
            }

            // Nunca confiar no plano/preço enviado pelo frontend.
            const plano = await prisma.plano.findUnique({
                where: {
                    id: planoId
                }
            });

            if (!plano || !plano.ativo) {
                return res.status(404).json({
                    erro: "Plano não encontrado"
                });
            }

            if (!plano.mercadoPagoPlanoId) {
                return res.status(400).json({
                    erro:
                        "Plano não configurado no Mercado Pago"
                });
            }

            // Empresa vem do JWT, não do frontend.
            const empresa = await prisma.empresa.findUnique({
                where: {
                    id: usuario.empresaId
                },
                include: {
                    assinatura: true
                }
            });

            if (!empresa) {
                return res.status(404).json({
                    erro: "Empresa não encontrada"
                });
            }

            if (!empresa.assinatura) {
                return res.status(404).json({
                    erro: "Assinatura interna não encontrada"
                });
            }

            /*
             * A referência identifica inequivocamente
             * a empresa + registro interno da assinatura.
             *
             * NÃO usamos payer_id para descobrir a empresa.
             */
            const referencia =
                `NEWERIS_EMPRESA_${empresa.id}_ASSINATURA_${empresa.assinatura.id}`;

            const assinaturaMP =
                await criarAssinaturaMercadoPago({
                    planoMercadoPagoId:
                        plano.mercadoPagoPlanoId,

                    cardTokenId,

                    email: empresa.email,

                    referencia
                });

            /*
             * O vínculo é salvo imediatamente.
             * Não esperamos o webhook para descobrir
             * quem fez a assinatura.
             */
            await prisma.assinatura.update({
                where: {
                    empresaId: empresa.id
                },

                data: {
                    mercadoPagoAssinaturaId:
                        assinaturaMP.id,

                    mercadoPagoPayerId:
                        assinaturaMP.payer_id
                            ? String(assinaturaMP.payer_id)
                            : null
                }
            });

            return res.status(201).json({
                mensagem:
                    "Assinatura criada com sucesso",

                assinaturaId:
                    assinaturaMP.id,

                status:
                    assinaturaMP.status
            });

        } catch (erro: any) {

            console.error(
                "Erro ao criar assinatura:",
                erro.response?.data || erro.message
            );

            return res.status(500).json({
                erro:
                    erro.response?.data?.message ||
                    "Erro ao criar assinatura"
            });
        }
    }
);
empresaRoutes.post("/assinatura/criar", auth, async (req, res) => {
    try {
        const usuario = (req as any).usuario;
        const { planoId } = req.body;

        if (!planoId || typeof planoId !== "number") {
            return res.status(400).json({
                erro: "Plano inválido"
            });
        }

        const planoNovo = await prisma.plano.findUnique({
            where: {
                id: planoId
            }
        });

        if (!planoNovo || !planoNovo.ativo) {
            return res.status(404).json({
                erro: "Plano não encontrado"
            });
        }

        const assinatura = await prisma.assinatura.findUnique({
            where: {
                empresaId: usuario.empresaId
            },
            include: {
                plano: true
            }
        });

        if (!assinatura) {
            return res.status(404).json({
                erro: "Assinatura não encontrada"
            });
        }

        // =========================
        // TRIAL
        // =========================

        if (assinatura.status === "TRIAL") {

            // Mesmo plano do trial
            if (planoNovo.id === assinatura.planoId) {
                return res.status(200).json({
                    acao: "AGENDADO_APOS_TRIAL"
                });
            }

            // Plano inferior ao trial atual
            if (planoNovo.nivel < assinatura.plano.nivel) {

                await prisma.assinatura.update({
                    where: {
                        empresaId: usuario.empresaId
                    },
                    data: {
                        proximoPlanoId: planoNovo.id
                    }
                });

                return res.status(200).json({
                    acao: "AGENDADO_APOS_TRIAL"
                });
            }

            // Plano superior ao trial
            if (planoNovo.nivel > assinatura.plano.nivel) {
                return res.status(200).json({
                    acao: "ESCOLHER_INICIO"
                });
            }
        }

        // =========================
        // ASSINATURA ATIVA
        // =========================

        if (assinatura.status === "ATIVA") {

            if (planoNovo.id === assinatura.planoId) {
                return res.status(400).json({
                    erro: "Você já possui esse plano"
                });
            }

            // Downgrade
            if (planoNovo.nivel < assinatura.plano.nivel) {

                await prisma.assinatura.update({
                    where: {
                        empresaId: usuario.empresaId
                    },
                    data: {
                        proximoPlanoId: planoNovo.id
                    }
                });

                return res.status(200).json({
                    acao: "DOWNGRADE_AGENDADO"
                });
            }

            // Upgrade
            if (planoNovo.nivel > assinatura.plano.nivel) {
                return res.status(200).json({
                    acao: "UPGRADE"
                });
            }
        }

        // =========================
        // VENCIDA / CANCELADA
        // =========================

        if (
            assinatura.status === "VENCIDA" ||
            assinatura.status === "CANCELADA"
        ) {
            return res.status(200).json({
                acao: "NOVA_ASSINATURA"
            });
        }

        return res.status(400).json({
            erro: "Não foi possível processar a assinatura"
        });

    } catch (erro) {
        console.error("Erro ao selecionar plano:", erro);

        return res.status(500).json({
            erro: "Erro interno"
        });
    }
});

import { criarAssinaturaPendenteMercadoPago } from "../service/mercadoPago";

empresaRoutes.post(
    "/assinatura/checkout",
    auth,
    async (req, res) => {

        try {

            const usuario = (req as any).usuario;
            const { planoId } = req.body;

            if (!planoId || typeof planoId !== "number") {
                return res.status(400).json({
                    erro: "Plano inválido"
                });
            }

            const plano = await prisma.plano.findUnique({
                where: {
                    id: planoId
                }
            });

            if (!plano || !plano.ativo) {
                return res.status(404).json({
                    erro: "Plano não encontrado"
                });
            }

            if (!plano.mercadoPagoPlanoId) {
                return res.status(400).json({
                    erro: "Plano não configurado para pagamento"
                });
            }

            const assinatura = await prisma.assinatura.findUnique({
                where: {
                    empresaId: usuario.empresaId
                }
            });

            if (!assinatura) {
                return res.status(404).json({
                    erro: "Assinatura não encontrada"
                });
            }

            const assinaturaMP =
                await criarAssinaturaPendenteMercadoPago({
                    planoMercadoPagoId:
                        plano.mercadoPagoPlanoId,

                    empresaId:
                        usuario.empresaId,

                    planoId:
                        plano.id
                });

            if (!assinaturaMP.init_point) {
                return res.status(500).json({
                    erro: "Checkout não encontrado"
                });
            }

            return res.status(200).json({

                checkoutUrl:
                    assinaturaMP.init_point,

                assinaturaMercadoPagoId:
                    assinaturaMP.id
            });

        } catch (erro: any) {

            console.error(
                "Erro ao iniciar assinatura:",
                erro.response?.data || erro.message
            );

            return res.status(500).json({
                erro: "Erro ao iniciar pagamento"
            });
        }
    }
);
import { buscarAssinaturaMercadoPago } from "../service/mercadoPago";
import {
    WebhookSignatureValidator,
    InvalidWebhookSignatureError
} from "mercadopago";
empresaRoutes.post("/webhook/mercado-pago", async (req, res) => {
    try {
        const xSignature = req.headers["x-signature"];
        const xRequestId = req.headers["x-request-id"];
        const dataId = req.query["data.id"];

        const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

        if (
            typeof xSignature !== "string" ||
            typeof xRequestId !== "string" ||
            typeof dataId !== "string" ||
            !secret
        ) {
            return res.sendStatus(401);
        }

        WebhookSignatureValidator.validate({
            xSignature,
            xRequestId,
            dataId,
            secret
        });

        const { type, data } = req.body;

        if (type !== "subscription_preapproval") {
            return res.sendStatus(200);
        }

        if (!data?.id) {
            return res.sendStatus(200);
        }

        const assinaturaMP = await buscarAssinaturaMercadoPago(
            String(data.id)
        );

        console.log(
            "ASSINATURA MP COMPLETA:",
            JSON.stringify(assinaturaMP, null, 2)
        );

        return res.sendStatus(200);

    } catch (erro) {

        if (erro instanceof InvalidWebhookSignatureError) {
            console.error("Webhook inválido");
            return res.sendStatus(401);
        }

        console.error("Erro ao processar webhook:", erro);
        return res.sendStatus(500);
    }
});

empresaRoutes.post("/teste-mercado-pago", async (req, res) => {
    try {
        const plano = await criarPlanoMercadoPago({
            nome: "NewerisBook Start",
            preco: 19.90,
            referencia: "NEWERIS_START",
        });

        return res.status(200).json(plano);

    } catch (erro: any) {
        console.error(
            "Erro Mercado Pago:",
            erro.response?.data || erro.message
        );

        return res.status(500).json({
            erro: "Erro ao criar plano no Mercado Pago"
        });
    }
});
export default empresaRoutes