export type Servico = {
    id: number;
    nome: string;
    duracaoMinutos: number;
    descricao: string;
    preco: number;
    ativo: boolean
};
export type NovoServico = Omit<Servico, "id">;