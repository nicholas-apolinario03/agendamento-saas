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
                        encontrarCliente(agendamento.clienteId);

                    const servico =
                        encontrarServico(agendamento.servicoId);

                    return (
                        <div key={agendamento.id}>

                            <h3>
                                {cliente?.nome ?? "Cliente não encontrado"}
                            </h3>

                            <p>
                                Serviço:{" "}
                                {servico?.nome ?? "Serviço não encontrado"}
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
                                Status: {agendamento.status}
                            </p>

                            <button
                                onClick={() =>
                                    aoEditar(agendamento)
                                }
                            >
                                Editar
                            </button>

                            <button
                                onClick={() =>
                                    aoCancelar(agendamento.id)
                                }
                            >
                                Excluir
                            </button>

                        </div>
                    );
                })

            )}

        </div>
    );
}