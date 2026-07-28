import { useEffect, useState } from "react";
import type {
    Agendamento,
    NovoAgendamento
} from "../types/Agendamento";

import type { Cliente } from "../types/Cliente";
import type { Servico } from "../types/Servico";

type FormularioAgendamentoProps = {
    agendamento: Agendamento | null;
    clientes: Cliente[];
    servicos: Servico[];
    onSalvar: (dados: NovoAgendamento) => void;
};

export function FormularioAgendamento({
    agendamento,
    clientes,
    servicos,
    onSalvar,
}: FormularioAgendamentoProps) {

    const [clienteId, setClienteId] =
        useState<number>(0);

    const [servicoId, setServicoId] =
        useState<number>(0);

    const [datahoraInicio, setDatahoraInicio] =
        useState("");


    function formatarParaDatetimeLocal(
        dataRecebida: string
    ) {
        const data = new Date(dataRecebida);

        const ano = data.getFullYear();

        const mes = String(
            data.getMonth() + 1
        ).padStart(2, "0");

        const dia = String(
            data.getDate()
        ).padStart(2, "0");

        const hora = String(
            data.getHours()
        ).padStart(2, "0");

        const minuto = String(
            data.getMinutes()
        ).padStart(2, "0");

        return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
    }


    useEffect(() => {

        if (agendamento) {

            setClienteId(
                agendamento.clienteId
            );

            setServicoId(
                agendamento.servicoId
            );

            setDatahoraInicio(
                formatarParaDatetimeLocal(
                    agendamento.datahoraInicio
                )
            );

        } else {

            setClienteId(0);
            setServicoId(0);
            setDatahoraInicio("");

        }

    }, [agendamento]);


    function handleSubmit(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        onSalvar({
            clienteId,
            servicoId,
            datahoraInicio
        });
    }


    return (
        <form onSubmit={handleSubmit}>

            <select
                value={clienteId}
                onChange={(event) =>
                    setClienteId(
                        Number(event.target.value)
                    )
                }
                disabled={agendamento !== null}
            >
                <option value={0}>
                    Selecione o cliente
                </option>

                {clientes.map((cliente) => (
                    <option
                        key={cliente.id}
                        value={cliente.id}
                    >
                        {cliente.nome}
                    </option>
                ))}
            </select>


            <select
                value={servicoId}
                onChange={(event) =>
                    setServicoId(
                        Number(event.target.value)
                    )
                }
                disabled={agendamento !== null}
            >
                <option value={0}>
                    Selecione o serviço
                </option>

                {servicos.map((servico) => (
                    <option
                        key={servico.id}
                        value={servico.id}
                    >
                        {servico.nome}
                    </option>
                ))}
            </select>


            <input
                type="datetime-local"
                value={datahoraInicio}
                onChange={(event) =>
                    setDatahoraInicio(
                        event.target.value
                    )
                }
                required
            />


            <button type="submit">
                {agendamento
                    ? "Salvar alterações"
                    : "Agendar"}
            </button>

        </form>
    );
}