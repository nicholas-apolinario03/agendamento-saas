import type { Agendamento } from "../types/Agendamento";
import type { Cliente } from "../types/Cliente";
import type { Servico } from "../types/Servico";

type ListarAgendamentosProps = {
    agendamentos: Agendamento[];
    clientes: Cliente[];
    servicos: Servico[];

    aoEditar: (agendamento: Agendamento) => void;
    aoCancelar: (id: number) => void;
};

export function ListarAgendamentos({
    agendamentos,
    clientes,
    servicos,
    aoEditar,
    aoCancelar,
}: ListarAgendamentosProps) {

    function encontrarCliente(id: number) {
        return clientes.find(
            (cliente) => cliente.id === id
        );
    }

    function encontrarServico(id: number) {
        return servicos.find(
            (servico) => servico.id === id
        );
    }

    function formatarData(data: string) {
        return new Date(data).toLocaleString("pt-BR");
    }

    function formatarStatus(status: string) {
        switch (status) {
            case "AGUARDANDO_CONFIRMACAO":
                return "Aguardando confirmação";

            case "AGENDADO":
                return "Agendado";

            case "CANCELADO":
                return "Cancelado";

            case "CONCLUIDO":
                return "Concluído";

            default:
                return status;
        }
    }

    return (
        <div>

            <h2>Agendamentos</h2>

            {agendamentos.length === 0 ? (

                <p>
                    Nenhum agendamento encontrado.
                </p>

            ) : (

                agendamentos.map((agendamento) => {

                    const cliente =
                        encontrarCliente(
                            agendamento.clienteId
                        );

                    const servico =
                        encontrarServico(
                            agendamento.servicoId
                        );

                    const podeEditar =
                        agendamento.status === "AGENDADO";

                    const podeCancelar =
                        agendamento.status === "AGENDADO" ||
                        agendamento.status ===
                            "AGUARDANDO_CONFIRMACAO";

                    return (
                        <div key={agendamento.id}>

                            <h3>
                                {cliente?.nome ??
                                    "Cliente não encontrado"}
                            </h3>

                            <p>
                                Serviço:{" "}
                                {servico?.nome ??
                                    "Serviço não encontrado"}
                            </p>

                            <p>
                                Início:{" "}
                                {formatarData(
                                    agendamento.datahoraInicio
                                )}
                            </p>

                            <p>
                                Fim:{" "}
                                {formatarData(
                                    agendamento.datahoraFim
                                )}
                            </p>

                            <p>
                                Status:{" "}
                                {formatarStatus(
                                    agendamento.status
                                )}
                            </p>

                            {podeEditar && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        aoEditar(agendamento)
                                    }
                                >
                                    Editar horário
                                </button>
                            )}

                            {podeCancelar && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        aoCancelar(
                                            agendamento.id
                                        )
                                    }
                                >
                                    Cancelar
                                </button>
                            )}

                        </div>
                    );
                })

            )}

        </div>
    );
}