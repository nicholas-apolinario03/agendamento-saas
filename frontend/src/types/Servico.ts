export type TipoDisponibilidadeServico =
    | "TODOS_OS_DIAS"
    | "DIAS_DA_SEMANA";

export type ExcecaoServico = {
    data: string;
    disponivel: boolean;
};

export type Servico = {
    id: number;
    empresaId?: number;

    nome: string;
    duracaoMinutos: number;
    descricao: string | null;
    preco: number;
    ativo: boolean;

    tipoDisponibilidade: TipoDisponibilidadeServico;

    diasSemana: number[];

    excecoes: ExcecaoServico[];

    createdAt?: string;
    updatedAt?: string;
};

export type NovoServico = {
    nome: string;
    duracaoMinutos: number;
    descricao: string;
    preco: number;
    ativo: boolean;

    tipoDisponibilidade: TipoDisponibilidadeServico;

    diasSemana: number[];

    excecoes: ExcecaoServico[];
};