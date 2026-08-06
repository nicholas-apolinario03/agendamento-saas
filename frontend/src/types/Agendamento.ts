export type StatusAgendamento =
    | "AGUARDANDO"
    | "AGENDADO"
    | "CANCELADO"
    | "CONCLUIDO";

export type TipoConfirmacao =
    | "AUTOMATICA"
    | "EMAIL";

export type Agendamento = {
    id: number;

    clienteId: number;

    servicoId: number;

    datahoraInicio: string;

    datahoraFim: string;

    status: StatusAgendamento;
};

export type NovoAgendamento = {
    clienteId: number;

    servicoId: number;

    datahoraInicio: string;

    confirmacao: TipoConfirmacao;
};