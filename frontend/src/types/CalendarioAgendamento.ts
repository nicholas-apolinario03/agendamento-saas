export type StatusAgendamento =
    | "AGUARDANDO"
    | "AGENDADO"
    | "CANCELADO"
    | "CONCLUIDO";

export type ResumoDiaCalendario = {
    data: string;
    aguardando: number;
    agendados: number;
    cancelados: number;
    concluidos: number;
};

export type AgendamentoCalendario = {
    id: number;
    cliente: string;
    horario: string;
    servico: string;
    status: StatusAgendamento;
};

export type DiaCalendario = {
    resumo: ResumoDiaCalendario;
    agendamentos: AgendamentoCalendario[];
};