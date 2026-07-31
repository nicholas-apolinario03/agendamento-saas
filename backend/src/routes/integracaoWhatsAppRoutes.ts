import {
    Router,
} from "express";

import {
    prisma,
} from "../lib/prisma";

import {
    auth,
} from "../middleware/auth";

import { concluirIntegracaoWhatsApp, } from "../service/integracaoWhatsapp";
const integracaoWhatsAppRoutes =
    Router();


integracaoWhatsAppRoutes.get(
    "/empresa/whatsapp/status",
    auth,
    async (req, res) => {
        try {
            const empresaId =
                (req as any)
                    .usuario
                    .empresaId;

            const integracao =
                await prisma
                    .integracaoWhatsApp
                    .findUnique({
                        where: {
                            empresaId,
                        },

                        select: {
                            id: true,
                            wabaId: true,
                            phoneNumberId:
                                true,
                            numeroExibicao:
                                true,
                            nomeVerificado:
                                true,
                            conectado:
                                true,
                            conectadoEm:
                                true,
                            createdAt:
                                true,
                            updatedAt:
                                true,
                        },
                    });

            if (!integracao) {
                return res.json({
                    conectado:
                        false,
                    integracao:
                        null,
                });
            }

            return res.json({
                conectado:
                    integracao
                        .conectado,

                integracao,
            });

        } catch (erro) {
            console.error(
                "Erro ao consultar integração:",
                erro
            );

            return res
                .status(500)
                .json({
                    erro:
                        "Erro ao consultar integração com WhatsApp",
                });
        }
    }
);


integracaoWhatsAppRoutes.post(
    "/empresa/whatsapp/concluir-conexao",
    auth,
    async (req, res) => {
        try {
            const empresaId =
                (req as any)
                    .usuario
                    .empresaId;

            const {
                code,
                wabaId,
                phoneNumberId,
            } = req.body;

            if (
                typeof code !== "string" ||
                !code.trim()
            ) {
                return res
                    .status(400)
                    .json({
                        erro:
                            "O código de autorização é obrigatório",
                    });
            }

            if (
                wabaId !== undefined &&
                typeof wabaId !== "string"
            ) {
                return res
                    .status(400)
                    .json({
                        erro:
                            "WABA ID inválido",
                    });
            }

            if (
                phoneNumberId !== undefined &&
                typeof phoneNumberId !== "string"
            ) {
                return res
                    .status(400)
                    .json({
                        erro:
                            "Phone Number ID inválido",
                    });
            }

            const empresa =
                await prisma
                    .empresa
                    .findUnique({
                        where: {
                            id:
                                empresaId,
                        },

                        select: {
                            id: true,
                            ativo: true,
                        },
                    });

            if (
                !empresa ||
                !empresa.ativo
            ) {
                return res
                    .status(404)
                    .json({
                        erro:
                            "Empresa não encontrada ou inativa",
                    });
            }

            const dadosIntegracao =
                await concluirIntegracaoWhatsApp({
                    empresaId,

                    code:
                        code.trim(),

                    wabaId:
                        typeof wabaId === "string" &&
                            wabaId.trim()
                            ? wabaId.trim()
                            : undefined,

                    phoneNumberId:
                        typeof phoneNumberId === "string" &&
                            phoneNumberId.trim()
                            ? phoneNumberId.trim()
                            : undefined,
                });

            const integracao =
                await prisma
                    .integracaoWhatsApp
                    .upsert({
                        where: {
                            empresaId,
                        },

                        create: {
                            empresaId,

                            wabaId:
                                dadosIntegracao
                                    .wabaId,

                            phoneNumberId:
                                dadosIntegracao
                                    .phoneNumberId,

                            numeroExibicao:
                                dadosIntegracao
                                    .numeroExibicao,

                            nomeVerificado:
                                dadosIntegracao
                                    .nomeVerificado,

                            accessTokenCriptografado:
                                dadosIntegracao
                                    .accessTokenCriptografado,

                            conectado:
                                true,

                            conectadoEm:
                                new Date(),
                        },

                        update: {
                            wabaId:
                                dadosIntegracao
                                    .wabaId,

                            phoneNumberId:
                                dadosIntegracao
                                    .phoneNumberId,

                            numeroExibicao:
                                dadosIntegracao
                                    .numeroExibicao,

                            nomeVerificado:
                                dadosIntegracao
                                    .nomeVerificado,

                            accessTokenCriptografado:
                                dadosIntegracao
                                    .accessTokenCriptografado,

                            conectado:
                                true,

                            conectadoEm:
                                new Date(),
                        },

                        select: {
                            id: true,
                            empresaId: true,
                            wabaId: true,
                            phoneNumberId:
                                true,
                            numeroExibicao:
                                true,
                            nomeVerificado:
                                true,
                            conectado:
                                true,
                            conectadoEm:
                                true,
                        },
                    });

            return res
                .status(200)
                .json({
                    mensagem:
                        "WhatsApp conectado com sucesso",

                    integracao,
                });

        } catch (erro) {
            console.error(
                "Erro ao concluir conexão do WhatsApp:",
                erro
            );

            return res
                .status(500)
                .json({
                    erro:
                        erro instanceof Error
                            ? erro.message
                            : "Erro ao conectar o WhatsApp",
                });
        }
    }
);


integracaoWhatsAppRoutes.delete(
    "/empresa/whatsapp/desconectar",
    auth,
    async (req, res) => {
        try {
            const empresaId =
                (req as any)
                    .usuario
                    .empresaId;

            const integracao =
                await prisma
                    .integracaoWhatsApp
                    .findUnique({
                        where: {
                            empresaId,
                        },
                    });

            if (!integracao) {
                return res
                    .status(404)
                    .json({
                        erro:
                            "Integração não encontrada",
                    });
            }

            await prisma
                .integracaoWhatsApp
                .update({
                    where: {
                        empresaId,
                    },

                    data: {
                        conectado:
                            false,
                    },
                });

            return res.json({
                mensagem:
                    "WhatsApp desconectado com sucesso",
            });

        } catch (erro) {
            console.error(
                "Erro ao desconectar WhatsApp:",
                erro
            );

            return res
                .status(500)
                .json({
                    erro:
                        "Erro ao desconectar WhatsApp",
                });
        }
    }
);


export default integracaoWhatsAppRoutes;