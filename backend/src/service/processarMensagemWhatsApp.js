"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processarMensagemWhatsApp = processarMensagemWhatsApp;
const prisma_1 = require("../lib/prisma");
const buscarHorariosDisponiveis_1 = require("./buscarHorariosDisponiveis");
const enviarMensagemWhatsApp_1 = require("./enviarMensagemWhatsApp");
/*
 * Mostra temporariamente a resposta do bot
 * no terminal.
 *
 * Depois substituiremos essa função pelo envio
 * real através da API do WhatsApp.
 */
async function responder(telefone, mensagens) {
    const mensagemCompleta = mensagens.join("\n");
    const modoTeste = process.env.WHATSAPP_MODO_TESTE ===
        "true";
    if (modoTeste) {
        console.log("\n==============================");
        console.log(`BOT PARA ${telefone}:`);
        console.log(mensagemCompleta);
        console.log("==============================\n");
        return;
    }
    try {
        await (0, enviarMensagemWhatsApp_1.enviarMensagemWhatsApp)({
            telefone,
            mensagem: mensagemCompleta,
        });
    }
    catch (erro) {
        console.error(`Erro ao responder ${telefone}:`, erro);
        /*
         * Não relançamos o erro aqui porque
         * a sessão do atendimento já foi
         * atualizada no banco.
         *
         * Depois podemos persistir mensagens
         * com falha para tentar novamente.
         */
    }
}
/*
 * Converte uma Date para YYYY-MM-DD,
 * considerando o horário de São Paulo.
 */
function formatarDataParaISO(data) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(data);
}
/*
 * Converte uma Date para DD/MM/AAAA.
 */
function formatarDataParaBr(data) {
    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(data);
}
/*
 * Converte uma Date para HH:mm.
 */
function formatarHorarioParaBr(data) {
    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(data);
}
/*
 * Retorna a lista dos serviços ativos
 * da empresa em formato de mensagem.
 */
async function buscarListaServicos(empresaId) {
    const servicos = await prisma_1.prisma.servico.findMany({
        where: {
            empresaId,
            ativo: true,
        },
        orderBy: {
            nome: "asc",
        },
    });
    const lista = servicos
        .map((servico, indice) => `${indice + 1} - ${servico.nome}`)
        .join("\n");
    return {
        servicos,
        lista,
    };
}
/*
 * Converte DD/MM/AAAA para YYYY-MM-DD.
 *
 * Também valida se a data realmente existe.
 */
function converterDataInformada(mensagem) {
    const partes = mensagem.split("/");
    if (partes.length !== 3) {
        return null;
    }
    const [dia, mes, ano] = partes.map(Number);
    if (!dia ||
        !mes ||
        !ano ||
        ano < 2020 ||
        mes < 1 ||
        mes > 12 ||
        dia < 1 ||
        dia > 31) {
        return null;
    }
    const dataFormatada = `${String(ano).padStart(4, "0")}-` +
        `${String(mes).padStart(2, "0")}-` +
        `${String(dia).padStart(2, "0")}`;
    /*
     * Usamos meio-dia para evitar que a data
     * mude por causa do fuso horário.
     */
    const dataTeste = new Date(`${dataFormatada}T12:00:00-03:00`);
    if (Number.isNaN(dataTeste.getTime()) ||
        dataTeste.getDate() !== dia ||
        dataTeste.getMonth() + 1 !== mes ||
        dataTeste.getFullYear() !== ano) {
        return null;
    }
    return {
        dataFormatada,
        dataTeste,
    };
}
async function processarMensagemWhatsApp({ empresaId, telefone, texto, }) {
    const mensagem = texto.trim();
    if (!mensagem) {
        return;
    }
    const sessao = await prisma_1.prisma.sessaoWhatsApp.findUnique({
        where: {
            empresaId_telefone: {
                empresaId,
                telefone,
            },
        },
    });
    /*
     * Ainda não existe uma sessão para
     * este telefone.
     */
    if (!sessao) {
        const cliente = await prisma_1.prisma.cliente.findFirst({
            where: {
                empresaId,
                telefone,
            },
        });
        /*
         * Cliente ainda não cadastrado.
         */
        if (!cliente) {
            await prisma_1.prisma.sessaoWhatsApp.create({
                data: {
                    empresaId,
                    telefone,
                    etapa: "AGUARDANDO_NOME",
                },
            });
            await responder(telefone, [
                "Olá! Para começar, qual é o seu nome?",
            ]);
            return;
        }
        /*
         * Cliente já cadastrado.
         */
        await prisma_1.prisma.sessaoWhatsApp.create({
            data: {
                empresaId,
                telefone,
                etapa: "ESCOLHENDO_SERVICO",
            },
        });
        const { servicos, lista, } = await buscarListaServicos(empresaId);
        if (servicos.length === 0) {
            await responder(telefone, [
                `Olá, ${cliente.nome}!`,
                "No momento, não há serviços disponíveis.",
            ]);
            return;
        }
        await responder(telefone, [
            `Olá, ${cliente.nome}! Vamos iniciar seu agendamento.`,
            "",
            "Escolha um serviço:",
            lista,
            "",
            "Responda apenas com o número da opção.",
        ]);
        return;
    }
    /*
     * A sessão já existe.
     */
    switch (sessao.etapa) {
        /*
         * ==========================================
         * CADASTRO DO NOME
         * ==========================================
         */
        case "AGUARDANDO_NOME": {
            const nome = mensagem;
            if (nome.length < 2) {
                await responder(telefone, [
                    "Por favor, informe um nome válido.",
                ]);
                return;
            }
            const clienteExistente = await prisma_1.prisma.cliente.findFirst({
                where: {
                    empresaId,
                    telefone,
                },
            });
            const cliente = clienteExistente ??
                await prisma_1.prisma.cliente.create({
                    data: {
                        empresaId,
                        telefone,
                        nome,
                    },
                });
            await prisma_1.prisma.sessaoWhatsApp.update({
                where: {
                    empresaId_telefone: {
                        empresaId,
                        telefone,
                    },
                },
                data: {
                    etapa: "ESCOLHENDO_SERVICO",
                },
            });
            const { servicos, lista, } = await buscarListaServicos(empresaId);
            if (servicos.length === 0) {
                await responder(telefone, [
                    `Cadastro concluído, ${cliente.nome}!`,
                    "No momento, não há serviços disponíveis.",
                ]);
                return;
            }
            await responder(telefone, [
                `Cadastro concluído, ${cliente.nome}!`,
                "",
                "Escolha um serviço:",
                lista,
                "",
                "Responda apenas com o número da opção.",
            ]);
            return;
        }
        /*
         * ==========================================
         * ESCOLHA DO SERVIÇO
         * ==========================================
         */
        case "ESCOLHENDO_SERVICO": {
            const { servicos, lista, } = await buscarListaServicos(empresaId);
            if (servicos.length === 0) {
                await responder(telefone, [
                    "No momento, não há serviços disponíveis.",
                ]);
                return;
            }
            const opcaoEscolhida = Number(mensagem);
            if (Number.isNaN(opcaoEscolhida) ||
                !Number.isInteger(opcaoEscolhida)) {
                await responder(telefone, [
                    "Escolha um serviço:",
                    lista,
                    "",
                    "Responda apenas com o número da opção.",
                ]);
                return;
            }
            const servicoSelecionado = servicos[opcaoEscolhida - 1];
            if (!servicoSelecionado) {
                await responder(telefone, [
                    "Opção inválida. Escolha um dos serviços:",
                    lista,
                    "",
                    "Responda apenas com o número da opção.",
                ]);
                return;
            }
            await prisma_1.prisma.sessaoWhatsApp.update({
                where: {
                    empresaId_telefone: {
                        empresaId,
                        telefone,
                    },
                },
                data: {
                    servicoId: servicoSelecionado.id,
                    dataEscolhida: null,
                    datahoraInicio: null,
                    etapa: "ESCOLHENDO_DATA",
                },
            });
            await responder(telefone, [
                `Serviço escolhido: ${servicoSelecionado.nome}`,
                "",
                "Agora informe a data desejada no formato DD/MM/AAAA.",
                "Exemplo: 30/07/2026",
            ]);
            return;
        }
        /*
         * ==========================================
         * ESCOLHA DA DATA
         * ==========================================
         */
        case "ESCOLHENDO_DATA": {
            if (!sessao.servicoId) {
                console.error("A sessão não possui serviço selecionado.");
                await prisma_1.prisma.sessaoWhatsApp.delete({
                    where: {
                        empresaId_telefone: {
                            empresaId,
                            telefone,
                        },
                    },
                });
                await responder(telefone, [
                    "Não foi possível continuar o atendimento.",
                    "Envie uma nova mensagem para começar novamente.",
                ]);
                return;
            }
            const dataConvertida = converterDataInformada(mensagem);
            if (!dataConvertida) {
                await responder(telefone, [
                    "A data informada é inválida.",
                    "Informe uma data no formato DD/MM/AAAA.",
                    "Exemplo: 30/07/2026",
                ]);
                return;
            }
            const { dataFormatada, dataTeste, } = dataConvertida;
            const horarios = await (0, buscarHorariosDisponiveis_1.buscarHorariosDisponiveis)({
                empresaId,
                servicoId: sessao.servicoId,
                data: dataFormatada,
            });
            if (horarios.length === 0) {
                await responder(telefone, [
                    `Não há horários disponíveis em ${mensagem}.`,
                    "Informe outra data no formato DD/MM/AAAA.",
                ]);
                return;
            }
            await prisma_1.prisma.sessaoWhatsApp.update({
                where: {
                    empresaId_telefone: {
                        empresaId,
                        telefone,
                    },
                },
                data: {
                    dataEscolhida: dataTeste,
                    datahoraInicio: null,
                    etapa: "ESCOLHENDO_HORARIO",
                },
            });
            const listaHorarios = horarios
                .map((horario, indice) => `${indice + 1} - ${horario.horario}`)
                .join("\n");
            await responder(telefone, [
                `Horários disponíveis para ${mensagem}:`,
                listaHorarios,
                "",
                "Responda somente com o número do horário.",
            ]);
            return;
        }
        /*
         * ==========================================
         * ESCOLHA DO HORÁRIO
         * ==========================================
         */
        case "ESCOLHENDO_HORARIO": {
            if (!sessao.servicoId ||
                !sessao.dataEscolhida) {
                console.error("A sessão não possui serviço ou data selecionada.");
                await prisma_1.prisma.sessaoWhatsApp.delete({
                    where: {
                        empresaId_telefone: {
                            empresaId,
                            telefone,
                        },
                    },
                });
                await responder(telefone, [
                    "Não foi possível continuar o atendimento.",
                    "Envie uma nova mensagem para começar novamente.",
                ]);
                return;
            }
            const dataFormatada = formatarDataParaISO(sessao.dataEscolhida);
            /*
             * Recalculamos os horários porque algum
             * horário pode ter sido ocupado depois
             * que a lista foi mostrada.
             */
            const horarios = await (0, buscarHorariosDisponiveis_1.buscarHorariosDisponiveis)({
                empresaId,
                servicoId: sessao.servicoId,
                data: dataFormatada,
            });
            if (horarios.length === 0) {
                await prisma_1.prisma.sessaoWhatsApp.update({
                    where: {
                        empresaId_telefone: {
                            empresaId,
                            telefone,
                        },
                    },
                    data: {
                        etapa: "ESCOLHENDO_DATA",
                        dataEscolhida: null,
                        datahoraInicio: null,
                    },
                });
                await responder(telefone, [
                    "Infelizmente não há mais horários disponíveis nessa data.",
                    "Informe outra data no formato DD/MM/AAAA.",
                ]);
                return;
            }
            const listaHorarios = horarios
                .map((horario, indice) => `${indice + 1} - ${horario.horario}`)
                .join("\n");
            const opcaoEscolhida = Number(mensagem);
            if (Number.isNaN(opcaoEscolhida) ||
                !Number.isInteger(opcaoEscolhida)) {
                await responder(telefone, [
                    "Escolha um horário respondendo apenas com o número:",
                    listaHorarios,
                ]);
                return;
            }
            const horarioSelecionado = horarios[opcaoEscolhida - 1];
            if (!horarioSelecionado) {
                await responder(telefone, [
                    "Opção inválida. Escolha um dos horários:",
                    listaHorarios,
                ]);
                return;
            }
            const datahoraInicio = new Date(horarioSelecionado
                .datahoraInicio);
            const servico = await prisma_1.prisma.servico.findFirst({
                where: {
                    id: sessao.servicoId,
                    empresaId,
                    ativo: true,
                },
            });
            if (!servico) {
                await prisma_1.prisma.sessaoWhatsApp.delete({
                    where: {
                        empresaId_telefone: {
                            empresaId,
                            telefone,
                        },
                    },
                });
                await responder(telefone, [
                    "O serviço selecionado não está mais disponível.",
                    "Envie uma nova mensagem para começar novamente.",
                ]);
                return;
            }
            await prisma_1.prisma.sessaoWhatsApp.update({
                where: {
                    empresaId_telefone: {
                        empresaId,
                        telefone,
                    },
                },
                data: {
                    datahoraInicio,
                    etapa: "CONFIRMANDO_AGENDAMENTO",
                },
            });
            await responder(telefone, [
                "Confira os dados do agendamento:",
                "",
                `Serviço: ${servico.nome}`,
                `Data: ${formatarDataParaBr(datahoraInicio)}`,
                `Horário: ${formatarHorarioParaBr(datahoraInicio)}`,
                "",
                "1 - Confirmar",
                "2 - Cancelar",
            ]);
            return;
        }
        /*
         * ==========================================
         * CONFIRMAÇÃO DO AGENDAMENTO
         * ==========================================
         */
        case "CONFIRMANDO_AGENDAMENTO": {
            const respostaNormalizada = mensagem.toLowerCase();
            /*
             * Cliente cancelou o processo.
             */
            if (mensagem === "2" ||
                respostaNormalizada ===
                    "cancelar") {
                await prisma_1.prisma.sessaoWhatsApp.delete({
                    where: {
                        empresaId_telefone: {
                            empresaId,
                            telefone,
                        },
                    },
                });
                await responder(telefone, [
                    "O processo de agendamento foi cancelado.",
                    "Envie qualquer mensagem para começar novamente.",
                ]);
                return;
            }
            /*
             * Resposta diferente de confirmar.
             */
            if (mensagem !== "1" &&
                respostaNormalizada !==
                    "confirmar") {
                await responder(telefone, [
                    "Responda com uma das opções:",
                    "1 - Confirmar",
                    "2 - Cancelar",
                ]);
                return;
            }
            if (!sessao.servicoId ||
                !sessao.datahoraInicio) {
                await prisma_1.prisma.sessaoWhatsApp.delete({
                    where: {
                        empresaId_telefone: {
                            empresaId,
                            telefone,
                        },
                    },
                });
                await responder(telefone, [
                    "Os dados do agendamento estão incompletos.",
                    "Envie uma nova mensagem para começar novamente.",
                ]);
                return;
            }
            const cliente = await prisma_1.prisma.cliente.findFirst({
                where: {
                    empresaId,
                    telefone,
                },
            });
            if (!cliente) {
                await prisma_1.prisma.sessaoWhatsApp.delete({
                    where: {
                        empresaId_telefone: {
                            empresaId,
                            telefone,
                        },
                    },
                });
                await responder(telefone, [
                    "Não foi possível localizar seu cadastro.",
                    "Envie uma nova mensagem para começar novamente.",
                ]);
                return;
            }
            const servico = await prisma_1.prisma.servico.findFirst({
                where: {
                    id: sessao.servicoId,
                    empresaId,
                    ativo: true,
                },
            });
            if (!servico) {
                await prisma_1.prisma.sessaoWhatsApp.delete({
                    where: {
                        empresaId_telefone: {
                            empresaId,
                            telefone,
                        },
                    },
                });
                await responder(telefone, [
                    "O serviço selecionado não está mais disponível.",
                    "Envie uma nova mensagem para começar novamente.",
                ]);
                return;
            }
            const datahoraInicio = sessao.datahoraInicio;
            const dataFormatada = formatarDataParaISO(datahoraInicio);
            /*
             * Verifica novamente a disponibilidade
             * antes de criar o agendamento.
             */
            const horariosAtuais = await (0, buscarHorariosDisponiveis_1.buscarHorariosDisponiveis)({
                empresaId,
                servicoId: servico.id,
                data: dataFormatada,
            });
            const horarioAindaDisponivel = horariosAtuais.some((horario) => new Date(horario.datahoraInicio).getTime() ===
                datahoraInicio.getTime());
            if (!horarioAindaDisponivel) {
                if (horariosAtuais.length === 0) {
                    await prisma_1.prisma.sessaoWhatsApp.update({
                        where: {
                            empresaId_telefone: {
                                empresaId,
                                telefone,
                            },
                        },
                        data: {
                            etapa: "ESCOLHENDO_DATA",
                            dataEscolhida: null,
                            datahoraInicio: null,
                        },
                    });
                    await responder(telefone, [
                        "Esse horário acabou de ficar indisponível.",
                        "Não restaram horários disponíveis nessa data.",
                        "Informe outra data no formato DD/MM/AAAA.",
                    ]);
                    return;
                }
                await prisma_1.prisma.sessaoWhatsApp.update({
                    where: {
                        empresaId_telefone: {
                            empresaId,
                            telefone,
                        },
                    },
                    data: {
                        etapa: "ESCOLHENDO_HORARIO",
                        datahoraInicio: null,
                    },
                });
                const listaHorarios = horariosAtuais
                    .map((horario, indice) => `${indice + 1} - ${horario.horario}`)
                    .join("\n");
                await responder(telefone, [
                    "Esse horário acabou de ficar indisponível.",
                    "Escolha outro horário:",
                    listaHorarios,
                ]);
                return;
            }
            const datahoraFim = new Date(datahoraInicio.getTime() +
                servico.duracaoMinutos *
                    60 *
                    1000);
            const agendamento = await prisma_1.prisma.agendamento.create({
                data: {
                    empresaId,
                    clienteId: cliente.id,
                    servicoId: servico.id,
                    datahoraInicio,
                    datahoraFim,
                    status: "AGUARDANDO_CONFIRMACAO",
                },
            });
            await prisma_1.prisma.sessaoWhatsApp.delete({
                where: {
                    empresaId_telefone: {
                        empresaId,
                        telefone,
                    },
                },
            });
            await responder(telefone, [
                "Solicitação de agendamento enviada com sucesso!",
                "",
                `Serviço: ${servico.nome}`,
                `Data: ${formatarDataParaBr(agendamento.datahoraInicio)}`,
                `Horário: ${formatarHorarioParaBr(agendamento.datahoraInicio)}`,
                "",
                "A empresa ainda precisa confirmar sua solicitação.",
            ]);
            return;
        }
        /*
         * ==========================================
         * ETAPA INVÁLIDA
         * ==========================================
         */
        default: {
            await prisma_1.prisma.sessaoWhatsApp.delete({
                where: {
                    empresaId_telefone: {
                        empresaId,
                        telefone,
                    },
                },
            });
            await responder(telefone, [
                "Sua sessão anterior estava inválida e foi encerrada.",
                "Envie uma nova mensagem para começar novamente.",
            ]);
            return;
        }
    }
}
