export type StatusAgendamento =
    | "AGUARDANDO_CONFIRMACAO"
    | "AGENDADO"
    | "CANCELADO"
    | "CONCLUIDO";

export type Agendamento = {
    id: number;
    clienteId: number;
    servicoId: number;

    datahoraInicio: string;
    datahoraFim: string;

    status: StatusAgendamento;
};

export type NovoAgendamento = Omit<
    Agendamento,
    "id" | "datahoraFim" | "status"
>;