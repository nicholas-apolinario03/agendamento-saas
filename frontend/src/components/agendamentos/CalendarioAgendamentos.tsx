import {
    useMemo,
    useState,
} from "react";

import {
    DayButton,
    DayPicker,
    type DayButtonProps,
} from "react-day-picker";

import {
    ptBR,
} from "date-fns/locale";

import "react-day-picker/style.css";

import "./CalendarioAgendamentos.css";

import PainelDiaCalendario from "./PainelDiaCalendario";

import type {
    Agendamento,
    NovoAgendamento,
} from "../../types/Agendamento";

import type {
    Cliente,
} from "../../types/Cliente";

import type {
    HorarioFuncionamento,
} from "../../types/HorarioFuncionamento";

import type {
    Servico,
} from "../../types/Servico";

import type {
    DiaCalendario,
} from "../../types/CalendarioAgendamento";

const FUSO_AGENDA =
    "America/Sao_Paulo";

type CalendarioAgendamentosProps = {
    agendamentos: Agendamento[];
    clientes: Cliente[];
    servicos: Servico[];
    horarios: HorarioFuncionamento[];

    aoSalvarNovoAgendamento: (
        dados: NovoAgendamento
    ) => Promise<boolean>;

    aoEditarAgendamento: (
        id: number,
        dados: NovoAgendamento
    ) => Promise<boolean>;

    aoCancelarAgendamento: (
        id: number
    ) => Promise<boolean>;
};

type BotaoDiaCalendarioProps =
    DayButtonProps & {
        diaCalendario?: DiaCalendario;
    };

function formatarDataChaveCalendario(
    data: Date
) {
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

    return `${ano}-${mes}-${dia}`;
}

function obterPartesSaoPaulo(
    data: Date
) {
    const partes =
        Object.fromEntries(
            new Intl.DateTimeFormat(
                "en-CA",
                {
                    timeZone:
                        FUSO_AGENDA,
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                }
            )
                .formatToParts(data)
                .filter(
                    (parte) =>
                        parte.type !==
                        "literal"
                )
                .map(
                    (parte) => [
                        parte.type,
                        parte.value,
                    ]
                )
        ) as Record<string, string>;

    return {
        data:
            `${partes.year}-` +
            `${partes.month}-` +
            `${partes.day}`,

        horario:
            `${partes.hour}:` +
            `${partes.minute}`,
    };
}

function BotaoDiaCalendario({
    diaCalendario,
    day,
    modifiers,
    ...props
}: BotaoDiaCalendarioProps) {
    const agendamentos =
        diaCalendario
            ?.agendamentos ??
        [];

    const agendamentosVisiveis =
        agendamentos.slice(
            0,
            3
        );

    const quantidadeRestante =
        agendamentos.length -
        agendamentosVisiveis.length;

    return (
        <DayButton
            {...props}
            day={day}
            modifiers={modifiers}
            className={[
                props.className,
                "calendario-dia",
                modifiers.today
                    ? "calendario-dia--hoje"
                    : "",
                modifiers.outside
                    ? "calendario-dia--fora"
                    : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <span className="calendario-dia__numero">
                {day.date.getDate()}
            </span>

            {agendamentosVisiveis.length >
                0 && (
                <div className="calendario-dia__agendamentos">
                    {agendamentosVisiveis.map(
                        (
                            agendamento
                        ) => (
                            <span
                                key={
                                    agendamento.id
                                }
                                className={[
                                    "calendario-agendamento",
                                    `calendario-agendamento--${agendamento.status.toLowerCase()}`,
                                ].join(
                                    " "
                                )}
                                title={
                                    `${agendamento.horario} - ` +
                                    `${agendamento.cliente} - ` +
                                    `${agendamento.servico}`
                                }
                            >
                                <i className="calendario-agendamento__status" />

                                <strong>
                                    {
                                        agendamento.horario
                                    }
                                </strong>

                                <span>
                                    {
                                        agendamento.cliente
                                    }
                                </span>
                            </span>
                        )
                    )}

                    {quantidadeRestante >
                        0 && (
                        <span className="calendario-dia__restantes">
                            +
                            {
                                quantidadeRestante
                            }{" "}
                            {quantidadeRestante ===
                            1
                                ? "agendamento"
                                : "agendamentos"}
                        </span>
                    )}
                </div>
            )}
        </DayButton>
    );
}

export default function CalendarioAgendamentos({
    agendamentos,
    clientes,
    servicos,
    horarios,
    aoSalvarNovoAgendamento,
    aoEditarAgendamento,
    aoCancelarAgendamento,
}: CalendarioAgendamentosProps) {
    const [
        dataSelecionada,
        setDataSelecionada,
    ] = useState<Date | null>(
        null
    );

    const diasCalendario =
        useMemo(() => {
            const clientesPorId =
                new Map(
                    clientes.map(
                        (cliente) => [
                            cliente.id,
                            cliente,
                        ]
                    )
                );

            const servicosPorId =
                new Map(
                    servicos.map(
                        (servico) => [
                            servico.id,
                            servico,
                        ]
                    )
                );

            const diasPorData =
                new Map<
                    string,
                    DiaCalendario
                >();

            for (
                const agendamento
                of agendamentos
            ) {
                const dataInicio =
                    new Date(
                        agendamento
                            .datahoraInicio
                    );

                if (
                    Number.isNaN(
                        dataInicio.getTime()
                    )
                ) {
                    console.warn(
                        "Agendamento com data inválida:",
                        agendamento
                    );

                    continue;
                }

                const partes =
                    obterPartesSaoPaulo(
                        dataInicio
                    );

                let dia =
                    diasPorData.get(
                        partes.data
                    );

                if (!dia) {
                    dia = {
                        resumo: {
                            data:
                                partes.data,
                            aguardando:
                                0,
                            agendados:
                                0,
                            cancelados:
                                0,
                            concluidos:
                                0,
                        },

                        agendamentos:
                            [],
                    };

                    diasPorData.set(
                        partes.data,
                        dia
                    );
                }

                const cliente =
                    clientesPorId.get(
                        agendamento
                            .clienteId
                    );

                const servico =
                    servicosPorId.get(
                        agendamento
                            .servicoId
                    );

                dia.agendamentos.push({
                    id:
                        agendamento.id,

                    cliente:
                        cliente?.nome ??
                        "Cliente não encontrado",

                    horario:
                        partes.horario,

                    servico:
                        servico?.nome ??
                        "Serviço não encontrado",

                    status:
                        agendamento.status,
                });

                switch (
                    agendamento.status
                ) {
                    case "AGUARDANDO":
                        dia.resumo
                            .aguardando +=
                            1;
                        break;

                    case "AGENDADO":
                        dia.resumo
                            .agendados +=
                            1;
                        break;

                    case "CANCELADO":
                        dia.resumo
                            .cancelados +=
                            1;
                        break;

                    case "CONCLUIDO":
                        dia.resumo
                            .concluidos +=
                            1;
                        break;
                }
            }

            const dias =
                Array.from(
                    diasPorData.values()
                );

            for (
                const dia of dias
            ) {
                dia.agendamentos.sort(
                    (
                        primeiro,
                        segundo
                    ) =>
                        primeiro.horario.localeCompare(
                            segundo.horario
                        )
                );
            }

            return dias;
        }, [
            agendamentos,
            clientes,
            servicos,
        ]);

    function buscarDiaCalendario(
        data: Date
    ) {
        const chave =
            formatarDataChaveCalendario(
                data
            );

        return diasCalendario.find(
            (item) =>
                item.resumo.data ===
                chave
        );
    }

    const diaSelecionado =
        dataSelecionada
            ? buscarDiaCalendario(
                dataSelecionada
            ) ?? null
            : null;

    return (
        <section className="calendario-agendamentos">
            <header className="calendario-agendamentos__cabecalho">
                <div>
                    <h2>
                        Agenda
                    </h2>

                    <p>
                        Visualize seus
                        agendamentos ao
                        longo do mês.
                    </p>
                </div>

                <div className="calendario-agendamentos__legenda">
                    <span>
                        <i className="status status--aguardando" />
                        Aguardando
                    </span>

                    <span>
                        <i className="status status--agendado" />
                        Agendado
                    </span>

                    <span>
                        <i className="status status--cancelado" />
                        Cancelado
                    </span>

                    <span>
                        <i className="status status--concluido" />
                        Concluído
                    </span>
                </div>
            </header>

            <DayPicker
                locale={ptBR}
                showOutsideDays
                mode="single"
                onDayClick={(
                    data
                ) =>
                    setDataSelecionada(
                        data
                    )
                }
                components={{
                    DayButton: (
                        props
                    ) => (
                        <BotaoDiaCalendario
                            {...props}
                            diaCalendario={
                                buscarDiaCalendario(
                                    props
                                        .day
                                        .date
                                )
                            }
                        />
                    ),
                }}
            />

            <PainelDiaCalendario
                dataSelecionada={
                    dataSelecionada
                }
                diaCalendario={
                    diaSelecionado
                }
                agendamentos={
                    agendamentos
                }
                clientes={
                    clientes
                }
                servicos={
                    servicos
                }
                horarios={
                    horarios
                }
                aoFechar={() =>
                    setDataSelecionada(
                        null
                    )
                }
                aoSalvarNovoAgendamento={
                    aoSalvarNovoAgendamento
                }
                aoEditarAgendamento={
                    aoEditarAgendamento
                }
                aoCancelarAgendamento={
                    aoCancelarAgendamento
                }
            />
        </section>
    );
}