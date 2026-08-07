import type { Servico } from "../types/Servico";
import "./css/Lista.css"
type CardServicoProps = {
    servico: Servico;
    aoEditar: (servico: Servico) => void;
    aoExcluir: (id: number) => void;
};

const nomesDias: Record<number, string> = {
    0: "Domingo",
    1: "Segunda-feira",
    2: "Terça-feira",
    3: "Quarta-feira",
    4: "Quinta-feira",
    5: "Sexta-feira",
    6: "Sábado",
};

export function CardServico({
    servico,
    aoEditar,
    aoExcluir,
}: CardServicoProps) {

    const disponibilidade =
        servico.tipoDisponibilidade === "TODOS_OS_DIAS"
            ? "Todos os dias de funcionamento"
            : servico.diasSemana
                .map((dia) => nomesDias[dia])
                .join(", ");

    return (
        <div>

            <h3 className="titulo-servico_cabecalho">{servico.nome}</h3>
            <div>
                <p>
                    Duração: {servico.duracaoMinutos} minutos
                </p>
                <p>
                    Descrição: {servico.descricao || "Sem descrição"}
                </p>

                <p>
                    Preço:{" "}
                    {servico.preco.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                    })}
                </p>

                <p>
                    Status: {servico.ativo ? "Ativo" : "Inativo"}
                </p>

                <p>
                    Disponibilidade: {disponibilidade}

                </p>
            </div>
            {servico.excecoes.length > 0 && (
                <div>
                    <p>Exceções:</p>

                    {servico.excecoes.map((excecao) => (
                        <p key={excecao.data}>
                            {new Date(
                                `${excecao.data}T12:00:00`
                            ).toLocaleDateString("pt-BR")}
                            {" - "}
                            {excecao.disponivel
                                ? "Disponível"
                                : "Bloqueado"}
                        </p>
                    ))}
                </div>
            )}

            <button className="lista-botao_editar"
                type="button"
                onClick={() => aoEditar(servico)}
            >
                Editar
            </button>

            <button className="lista-botao_excluir"
                type="button"
                onClick={() => aoExcluir(servico.id)}
            >
                Excluir
            </button>

        </div>
    );
}