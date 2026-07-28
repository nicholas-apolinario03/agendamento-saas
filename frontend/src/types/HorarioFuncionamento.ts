export type HorarioFuncionamento = {
    id: number;
    empresaId: number;
    diaSemana: number;
    horaInicio: string;
    horaFim: string;
    ativo: boolean;
};

export type NovoHorario = Omit<HorarioFuncionamento, "id" | "empresaId" >;