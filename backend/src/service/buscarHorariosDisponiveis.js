"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buscarHorariosDisponiveis = buscarHorariosDisponiveis;
const prisma_1 = require("../lib/prisma");
const INTERVALO_ENTRE_HORARIOS = 30;
const FUSO_HORARIO = "-03:00";
function validarFormatoData(data) {
    return /^\d{4}-\d{2}-\d{2}$/.test(data);
}
function criarDataHora(data, horario) {
    return new Date(`${data}T${horario}:00${FUSO_HORARIO}`);
}
function formatarHorario(data) {
    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(data);
}
function obterDiaSemana(data) {
    const [ano, mes, dia] = data.split("-").map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}
function adicionarMinutos(data, minutos) {
    return new Date(data.getTime() +
        minutos * 60 * 1000);
}
async function buscarHorariosDisponiveis({ empresaId, servicoId, data, }) {
    if (!empresaId ||
        !servicoId ||
        !validarFormatoData(data)) {
        throw new Error("Empresa, serviço ou data inválidos");
    }
    const servico = await prisma_1.prisma.servico.findFirst({
        where: {
            id: servicoId,
            empresaId,
            ativo: true,
        },
    });
    if (!servico) {
        throw new Error("Serviço não encontrado ou inativo");
    }
    const diaSemana = obterDiaSemana(data);
    /*
     * Primeiro verificamos se existe uma exceção
     * específica para essa data.
     */
    const inicioDoDiaExcecao = criarDataHora(data, "00:00");
    const fimDoDiaExcecao = criarDataHora(data, "23:59");
    const excecao = await prisma_1.prisma
        .excecaoDisponibilidadeServico
        .findFirst({
        where: {
            servicoId,
            data: {
                gte: inicioDoDiaExcecao,
                lte: fimDoDiaExcecao,
            },
        },
    });
    let servicoDisponivelNaData = false;
    /*
     * A exceção tem prioridade sobre
     * a regra recorrente.
     */
    if (excecao) {
        servicoDisponivelNaData =
            excecao.disponivel;
    }
    else if (servico.tipoDisponibilidade ===
        "TODOS_OS_DIAS") {
        servicoDisponivelNaData = true;
    }
    else if (servico.tipoDisponibilidade ===
        "DIAS_DA_SEMANA") {
        const disponibilidadeSemanal = await prisma_1.prisma
            .disponibilidadeSemanalServico
            .findFirst({
            where: {
                servicoId,
                diaSemana,
                ativo: true,
            },
        });
        servicoDisponivelNaData =
            Boolean(disponibilidadeSemanal);
    }
    else {
        throw new Error("Tipo de disponibilidade do serviço inválido");
    }
    /*
     * Se o serviço não é oferecido nessa data,
     * não há horários disponíveis.
     */
    if (!servicoDisponivelNaData) {
        return [];
    }
    /*
     * Agora verificamos o funcionamento
     * da empresa naquele dia.
     */
    const periodosFuncionamento = await prisma_1.prisma.horarioFuncionamento.findMany({
        where: {
            empresaId,
            diaSemana,
            ativo: true,
        },
        orderBy: {
            horaInicio: "asc",
        },
    });
    if (periodosFuncionamento.length === 0) {
        return [];
    }
    const inicioDoDia = criarDataHora(data, "00:00");
    const fimDoDia = criarDataHora(data, "23:59");
    /*
     * Somente agendamentos ativos bloqueiam horário.
     */
    const agendamentos = await prisma_1.prisma.agendamento.findMany({
        where: {
            empresaId,
            status: {
                in: [
                    "AGUARDANDO_CONFIRMACAO",
                    "AGENDADO",
                ],
            },
            datahoraInicio: {
                lte: fimDoDia,
            },
            datahoraFim: {
                gte: inicioDoDia,
            },
        },
        select: {
            datahoraInicio: true,
            datahoraFim: true,
        },
    });
    const agora = new Date();
    const horariosDisponiveis = [];
    for (const periodo of periodosFuncionamento) {
        const inicioFuncionamento = criarDataHora(data, periodo.horaInicio);
        const fimFuncionamento = criarDataHora(data, periodo.horaFim);
        let horarioAtual = inicioFuncionamento;
        while (horarioAtual <
            fimFuncionamento) {
            const horarioFinal = adicionarMinutos(horarioAtual, servico.duracaoMinutos);
            /*
             * O serviço precisa caber por completo
             * dentro do período de funcionamento.
             */
            if (horarioFinal >
                fimFuncionamento) {
                break;
            }
            const horarioJaPassou = horarioAtual <= agora;
            const existeConflito = agendamentos.some((agendamento) => {
                return (horarioAtual <
                    agendamento.datahoraFim &&
                    horarioFinal >
                        agendamento.datahoraInicio);
            });
            if (!horarioJaPassou &&
                !existeConflito) {
                horariosDisponiveis.push({
                    horario: formatarHorario(horarioAtual),
                    datahoraInicio: horarioAtual.toISOString(),
                    datahoraFim: horarioFinal.toISOString(),
                });
            }
            horarioAtual =
                adicionarMinutos(horarioAtual, INTERVALO_ENTRE_HORARIOS);
        }
    }
    return horariosDisponiveis;
}
