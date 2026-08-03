import {
    useEffect,
    useState,
} from "react";

import type {
    Agendamento,
    NovoAgendamento,
} from "../types/Agendamento";

import type {
    Cliente,
} from "../types/Cliente";

import type {
    Servico,
} from "../types/Servico";

type FormularioAgendamentoProps = {
    agendamento: Agendamento | null;

    clientes: Cliente[];

    servicos: Servico[];

    datahoraInicial?: string | null;

    onSalvar: (
        dados: NovoAgendamento
    ) => void | Promise<void>;
};

export function FormularioAgendamento({
    agendamento,
    clientes,
    servicos,
    datahoraInicial,
    onSalvar,
}: FormularioAgendamentoProps) {
    const [
        clienteId,
        setClienteId,
    ] = useState(0);

    const [
        servicoId,
        setServicoId,
    ] = useState(0);

    const [
        datahoraInicio,
        setDatahoraInicio,
    ] = useState("");

    function formatarParaDatetimeLocal(
        dataRecebida: string
    ) {
        const data =
            new Date(dataRecebida);

        const ano =
            data.getFullYear();

        const mes =
            String(
                data.getMonth() + 1
            ).padStart(
                2,
                "0"
            );

        const dia =
            String(
                data.getDate()
            ).padStart(
                2,
                "0"
            );

        const hora =
            String(
                data.getHours()
            ).padStart(
                2,
                "0"
            );

        const minuto =
            String(
                data.getMinutes()
            ).padStart(
                2,
                "0"
            );

        return (
            `${ano}-${mes}-${dia}` +
            `T${hora}:${minuto}`
        );
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
                    agendamento
                        .datahoraInicio
                )
            );

            return;
        }

        setClienteId(0);
        setServicoId(0);

        setDatahoraInicio(
            datahoraInicial ?? ""
        );
    }, [
        agendamento,
        datahoraInicial,
    ]);

    async function handleSubmit(
        event:
            React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            clienteId === 0 ||
            servicoId === 0 ||
            !datahoraInicio
        ) {
            return;
        }

        await onSalvar({
            clienteId,
            servicoId,
            datahoraInicio,
        });
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="formulario-agendamento"
        >
            <div>
                <label htmlFor="agendamento-cliente">
                    Cliente
                </label>

                <select
                    id="agendamento-cliente"
                    value={clienteId}
                    onChange={(event) =>
                        setClienteId(
                            Number(
                                event.target.value
                            )
                        )
                    }
                    disabled={
                        agendamento !== null
                    }
                    required
                >
                    <option value={0}>
                        Selecione o cliente
                    </option>

                    {clientes.map(
                        (cliente) => (
                            <option
                                key={cliente.id}
                                value={cliente.id}
                            >
                                {cliente.nome}
                            </option>
                        )
                    )}
                </select>
            </div>

            <div>
                <label htmlFor="agendamento-servico">
                    Serviço
                </label>

                <select
                    id="agendamento-servico"
                    value={servicoId}
                    onChange={(event) =>
                        setServicoId(
                            Number(
                                event.target.value
                            )
                        )
                    }
                    disabled={
                        agendamento !== null
                    }
                    required
                >
                    <option value={0}>
                        Selecione o serviço
                    </option>

                    {servicos.map(
                        (servico) => (
                            <option
                                key={servico.id}
                                value={servico.id}
                            >
                                {servico.nome}
                                {" — "}
                                {servico.duracaoMinutos}
                                {" min"}
                            </option>
                        )
                    )}
                </select>
            </div>

            <div>
                <label htmlFor="agendamento-datahora">
                    Data e horário
                </label>

                <input
                    id="agendamento-datahora"
                    type="datetime-local"
                    value={datahoraInicio}
                    onChange={(event) =>
                        setDatahoraInicio(
                            event.target.value
                        )
                    }
                    readOnly={
                        agendamento === null &&
                        Boolean(
                            datahoraInicial
                        )
                    }
                    required
                />
            </div>

            <button type="submit">
                {agendamento
                    ? "Salvar alterações"
                    : "Agendar"}
            </button>
        </form>
    );
}