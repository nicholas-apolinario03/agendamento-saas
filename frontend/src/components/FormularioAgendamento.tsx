import {
    useEffect,
    useState,
} from "react";

import type {
    Agendamento,
    NovoAgendamento,
    TipoConfirmacao,
} from "../types/Agendamento";

import type {
    Cliente,
} from "../types/Cliente";

import type {
    Servico,
} from "../types/Servico";

import {
    verificarAssinatura
} from "../utils/assinatura";

type FormularioAgendamentoProps = {
    agendamento:
        Agendamento | null;

    clientes:
        Cliente[];

    servicos:
        Servico[];

    datahoraInicial?:
        string | null;

    onSalvar: (
        dados: NovoAgendamento
    ) =>
        void |
        Promise<void>;
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

    const [
        confirmacao,
        setConfirmacao,
    ] = useState<TipoConfirmacao>(
        "AUTOMATICA"
    );

    /*
     * null = ainda consultando
     * true = pode modificar
     * false = somente visualização
     */
    const [
        podeModificar,
        setPodeModificar
    ] = useState<
        boolean | null
    >(null);

    // ================================================
    // VERIFICAR ASSINATURA
    // ================================================

    useEffect(() => {

        let cancelado =
            false;

        async function consultarAssinatura() {

            const assinaturaValida =
                await verificarAssinatura();

            if (!cancelado) {
                setPodeModificar(
                    assinaturaValida
                );
            }
        }

        consultarAssinatura();

        /*
         * Se o usuário voltar para esta aba
         * depois de fazer uma assinatura,
         * verificamos novamente.
         */
        function verificarAoVoltar() {
            consultarAssinatura();
        }

        window.addEventListener(
            "focus",
            verificarAoVoltar
        );

        return () => {
            cancelado =
                true;

            window.removeEventListener(
                "focus",
                verificarAoVoltar
            );
        };

    }, []);

    // ================================================
    // FORMATAR DATA
    // ================================================

    function formatarParaDatetimeLocal(
        dataRecebida: string
    ) {
        const data =
            new Date(
                dataRecebida
            );

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

    // ================================================
    // PREENCHER FORMULÁRIO
    // ================================================

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

            setConfirmacao(
                "AUTOMATICA"
            );

            return;
        }

        setClienteId(
            0
        );

        setServicoId(
            0
        );

        setDatahoraInicio(
            datahoraInicial ?? ""
        );

        setConfirmacao(
            "AUTOMATICA"
        );

    }, [
        agendamento,
        datahoraInicial,
    ]);

    // ================================================
    // SALVAR
    // ================================================

    async function handleSubmit(
        event:
            React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        /*
         * Segunda proteção no frontend.
         */
        if (!podeModificar) {
            return;
        }

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
            confirmacao,
        });
    }

    const bloqueado =
        podeModificar !== true;

    return (
        <form
            onSubmit={
                handleSubmit
            }
            className=
                "formulario-agendamento"
        >

            {/* ================================= */}
            {/* AVISO DA ASSINATURA */}
            {/* ================================= */}

            {podeModificar === false && (
                <div className="formulario-agendamento__assinatura-bloqueada">

                    <strong>
                        Assinatura necessária
                    </strong>

                    <p>
                        Seu período gratuito ou
                        ciclo da assinatura terminou.
                        Você ainda pode consultar
                        seus dados, mas precisa
                        de uma assinatura ativa
                        para criar ou alterar
                        agendamentos.
                    </p>

                    <a href="/planos">
                        Ver planos
                    </a>

                </div>
            )}

            <div>
                <label
                    htmlFor=
                        "agendamento-cliente"
                >
                    Cliente
                </label>

                <select
                    id=
                        "agendamento-cliente"

                    value={
                        clienteId
                    }

                    onChange={(
                        event
                    ) =>
                        setClienteId(
                            Number(
                                event
                                    .target
                                    .value
                            )
                        )
                    }

                    disabled={
                        bloqueado ||
                        agendamento !==
                            null
                    }

                    required
                >
                    <option
                        value={0}
                    >
                        Selecione o cliente
                    </option>

                    {clientes.map(
                        (
                            cliente
                        ) => (
                            <option
                                key={
                                    cliente.id
                                }

                                value={
                                    cliente.id
                                }
                            >
                                {
                                    cliente.nome
                                }
                            </option>
                        )
                    )}
                </select>
            </div>

            <div>
                <label
                    htmlFor=
                        "agendamento-servico"
                >
                    Serviço
                </label>

                <select
                    id=
                        "agendamento-servico"

                    value={
                        servicoId
                    }

                    onChange={(
                        event
                    ) =>
                        setServicoId(
                            Number(
                                event
                                    .target
                                    .value
                            )
                        )
                    }

                    disabled={
                        bloqueado ||
                        agendamento !==
                            null
                    }

                    required
                >
                    <option
                        value={0}
                    >
                        Selecione o serviço
                    </option>

                    {servicos.map(
                        (
                            servico
                        ) => (
                            <option
                                key={
                                    servico.id
                                }

                                value={
                                    servico.id
                                }
                            >
                                {
                                    servico.nome
                                }

                                {" — "}

                                {
                                    servico
                                        .duracaoMinutos
                                }

                                {" min"}
                            </option>
                        )
                    )}
                </select>
            </div>

            <div>
                <label
                    htmlFor=
                        "agendamento-datahora"
                >
                    Data e horário
                </label>

                <input
                    id=
                        "agendamento-datahora"

                    type=
                        "datetime-local"

                    value={
                        datahoraInicio
                    }

                    onChange={(
                        event
                    ) =>
                        setDatahoraInicio(
                            event
                                .target
                                .value
                        )
                    }

                    readOnly={
                        agendamento ===
                            null &&
                        Boolean(
                            datahoraInicial
                        )
                    }

                    disabled={
                        bloqueado
                    }

                    required
                />
            </div>

            {agendamento === null && (
                <fieldset
                    className=
                        "formulario-agendamento__confirmacao"

                    disabled={
                        bloqueado
                    }
                >
                    <legend>
                        Confirmação do agendamento
                    </legend>

                    <label
                        className=
                            "formulario-agendamento__opcao-confirmacao"
                    >
                        <input
                            type=
                                "radio"

                            name=
                                "confirmacao"

                            value=
                                "AUTOMATICA"

                            checked={
                                confirmacao ===
                                "AUTOMATICA"
                            }

                            onChange={() =>
                                setConfirmacao(
                                    "AUTOMATICA"
                                )
                            }
                        />

                        <span>
                            <strong>
                                Confirmar automaticamente
                            </strong>

                            <small>
                                O agendamento já será
                                criado como confirmado.
                            </small>
                        </span>
                    </label>

                    <label
                        className=
                            "formulario-agendamento__opcao-confirmacao"
                    >
                        <input
                            type=
                                "radio"

                            name=
                                "confirmacao"

                            value=
                                "EMAIL"

                            checked={
                                confirmacao ===
                                "EMAIL"
                            }

                            onChange={() =>
                                setConfirmacao(
                                    "EMAIL"
                                )
                            }
                        />

                        <span>
                            <strong>
                                Cliente confirma por e-mail
                            </strong>

                            <small>
                                O cliente receberá
                                um link para confirmar
                                o agendamento.
                            </small>
                        </span>
                    </label>
                </fieldset>
            )}

            <button
                type=
                    "submit"

                disabled={
                    bloqueado
                }
            >
                {podeModificar === null
                    ? "Verificando assinatura..."
                    : agendamento
                        ? "Salvar alterações"
                        : "Agendar"}
            </button>

        </form>
    );
}