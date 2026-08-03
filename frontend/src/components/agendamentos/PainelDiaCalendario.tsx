import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    FormularioAgendamento,
} from "../FormularioAgendamento";

import type {
    Agendamento,
    NovoAgendamento,
} from "../../types/Agendamento";

import type {
    Cliente,
} from "../../types/Cliente";

import type {
    DiaCalendario,
} from "../../types/CalendarioAgendamento";

import type {
    HorarioFuncionamento,
} from "../../types/HorarioFuncionamento";

import type {
    Servico,
} from "../../types/Servico";

type ModoPainel =
    | "HORARIOS"
    | "CRIAR"
    | "EDITAR";

type PainelDiaCalendarioProps = {
    dataSelecionada: Date | null;

    diaCalendario:
        | DiaCalendario
        | null;

    agendamentos: Agendamento[];

    clientes: Cliente[];

    servicos: Servico[];

    horarios: HorarioFuncionamento[];

    aoFechar: () => void;

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

type IntervaloFuncionamento = {
    inicio: number;
    fim: number;
};

type ItemHorario = {
    horario: string;
    minutos: number;
    agendamento: Agendamento | null;
    inicioAgendamento: boolean;
};

const nomesStatus = {
    AGUARDANDO: "Aguardando",
    AGENDADO: "Agendado",
    CANCELADO: "Cancelado",
    CONCLUIDO: "Concluído",
};

const INTERVALO_MINUTOS = 30;

function formatarDataChave(
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

function horarioParaMinutos(
    horario: string
) {
    const [
        hora,
        minuto,
    ] = horario
        .substring(0, 5)
        .split(":")
        .map(Number);

    return (
        hora * 60 +
        minuto
    );
}

function minutosParaHorario(
    minutos: number
) {
    const hora =
        Math.floor(
            minutos / 60
        );

    const minuto =
        minutos % 60;

    return (
        String(hora).padStart(
            2,
            "0"
        ) +
        ":" +
        String(minuto).padStart(
            2,
            "0"
        )
    );
}

function obterMinutosDaData(
    data: Date
) {
    return (
        data.getHours() * 60 +
        data.getMinutes()
    );
}

function criarDatahoraLocal(
    data: Date,
    horario: string
) {
    return (
        `${formatarDataChave(data)}` +
        `T${horario}`
    );
}

export default function PainelDiaCalendario({
    dataSelecionada,
    diaCalendario:
        _diaCalendario,
    agendamentos,
    clientes,
    servicos,
    horarios,
    aoFechar,
    aoSalvarNovoAgendamento,
    aoEditarAgendamento,
    aoCancelarAgendamento,
}: PainelDiaCalendarioProps) {
    const [
        modo,
        setModo,
    ] = useState<ModoPainel>(
        "HORARIOS"
    );

    const [
        horarioSelecionado,
        setHorarioSelecionado,
    ] = useState<string | null>(
        null
    );

    const [
        agendamentoEditando,
        setAgendamentoEditando,
    ] =
        useState<Agendamento | null>(
            null
        );

    const [
        processando,
        setProcessando,
    ] = useState(false);

    const [
        mensagem,
        setMensagem,
    ] = useState("");

    useEffect(() => {
        setModo("HORARIOS");

        setHorarioSelecionado(
            null
        );

        setAgendamentoEditando(
            null
        );

        setProcessando(false);
        setMensagem("");
    }, [
        dataSelecionada,
    ]);

    const intervalosFuncionamento =
        useMemo(() => {
            if (!dataSelecionada) {
                return [];
            }

            const diaSemana =
                dataSelecionada.getDay();

            return horarios
                .filter(
                    (horario) =>
                        horario.ativo &&
                        horario.diaSemana ===
                            diaSemana
                )
                .map(
                    (
                        horario
                    ): IntervaloFuncionamento => ({
                        inicio:
                            horarioParaMinutos(
                                horario.horaInicio
                            ),

                        fim:
                            horarioParaMinutos(
                                horario.horaFim
                            ),
                    })
                )
                .sort(
                    (
                        primeiro,
                        segundo
                    ) =>
                        primeiro.inicio -
                        segundo.inicio
                );
        }, [
            dataSelecionada,
            horarios,
        ]);

    const agendamentosDoDia =
        useMemo(() => {
            if (!dataSelecionada) {
                return [];
            }

            const chave =
                formatarDataChave(
                    dataSelecionada
                );

            return agendamentos
                .filter(
                    (agendamento) => {
                        const data =
                            new Date(
                                agendamento
                                    .datahoraInicio
                            );

                        if (
                            Number.isNaN(
                                data.getTime()
                            )
                        ) {
                            return false;
                        }

                        return (
                            formatarDataChave(
                                data
                            ) === chave
                        );
                    }
                )
                .sort(
                    (
                        primeiro,
                        segundo
                    ) =>
                        new Date(
                            primeiro
                                .datahoraInicio
                        ).getTime() -
                        new Date(
                            segundo
                                .datahoraInicio
                        ).getTime()
                );
        }, [
            agendamentos,
            dataSelecionada,
        ]);

    function obterDuracaoAgendamento(
        agendamento: Agendamento
    ) {
        const servico =
            servicos.find(
                (item) =>
                    item.id ===
                    agendamento.servicoId
            );

        return (
            servico?.duracaoMinutos ??
            INTERVALO_MINUTOS
        );
    }

    const itensHorario =
        useMemo(() => {
            const itens: ItemHorario[] =
                [];

            for (
                const intervalo
                of intervalosFuncionamento
            ) {
                for (
                    let minutos =
                        intervalo.inicio;

                    minutos <
                    intervalo.fim;

                    minutos +=
                        INTERVALO_MINUTOS
                ) {
                    const agendamento =
                        agendamentosDoDia.find(
                            (item) => {
                                if (
                                    item.status ===
                                    "CANCELADO"
                                ) {
                                    return false;
                                }

                                const dataInicio =
                                    new Date(
                                        item.datahoraInicio
                                    );

                                if (
                                    Number.isNaN(
                                        dataInicio.getTime()
                                    )
                                ) {
                                    return false;
                                }

                                const inicio =
                                    obterMinutosDaData(
                                        dataInicio
                                    );

                                const fim =
                                    inicio +
                                    obterDuracaoAgendamento(
                                        item
                                    );

                                return (
                                    minutos >=
                                        inicio &&
                                    minutos < fim
                                );
                            }
                        ) ?? null;

                    const inicioAgendamento =
                        agendamento
                            ? obterMinutosDaData(
                                new Date(
                                    agendamento
                                        .datahoraInicio
                                )
                            ) === minutos
                            : false;

                    itens.push({
                        horario:
                            minutosParaHorario(
                                minutos
                            ),

                        minutos,

                        agendamento,

                        inicioAgendamento,
                    });
                }
            }

            return itens;
        }, [
            agendamentosDoDia,
            intervalosFuncionamento,
            servicos,
        ]);

    if (!dataSelecionada) {
        return null;
    }

    /*
     * Depois desta validação, usamos esta
     * constante nas funções internas.
     *
     * Assim o TypeScript sabe que ela nunca
     * será null enquanto o painel estiver aberto.
     */
    const dataAtiva =
        dataSelecionada;

    const dataFormatada =
        new Intl.DateTimeFormat(
            "pt-BR",
            {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
            }
        ).format(
            dataAtiva
        );

    function servicoDisponivelNaData(
        servico: Servico
    ) {
        if (!servico.ativo) {
            return false;
        }

        const dataChave =
            formatarDataChave(
                dataAtiva
            );

        const excecao =
            servico.excecoes?.find(
                (item) =>
                    item.data ===
                    dataChave
            );

        if (excecao) {
            return excecao.disponivel;
        }

        if (
            servico.tipoDisponibilidade ===
            "TODOS_OS_DIAS"
        ) {
            return true;
        }

        return (
            servico.diasSemana?.includes(
                dataAtiva.getDay()
            ) ?? false
        );
    }

    function horarioCabeNoFuncionamento(
        inicio: number,
        duracao: number
    ) {
        return intervalosFuncionamento.some(
            (intervalo) =>
                inicio >=
                    intervalo.inicio &&
                inicio + duracao <=
                    intervalo.fim
        );
    }

    function horarioPossuiConflito(
        inicio: number,
        duracao: number,
        ignorarId?: number
    ) {
        const fim =
            inicio + duracao;

        return agendamentosDoDia.some(
            (agendamento) => {
                if (
                    agendamento.id ===
                    ignorarId
                ) {
                    return false;
                }

                if (
                    agendamento.status ===
                    "CANCELADO"
                ) {
                    return false;
                }

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
                    return false;
                }

                const inicioExistente =
                    obterMinutosDaData(
                        dataInicio
                    );

                const fimExistente =
                    inicioExistente +
                    obterDuracaoAgendamento(
                        agendamento
                    );

                return (
                    inicio <
                        fimExistente &&
                    fim >
                        inicioExistente
                );
            }
        );
    }

    const servicosDisponiveis =
        horarioSelecionado
            ? servicos.filter(
                (servico) => {
                    if (
                        !servicoDisponivelNaData(
                            servico
                        )
                    ) {
                        return false;
                    }

                    const inicio =
                        horarioParaMinutos(
                            horarioSelecionado
                        );

                    if (
                        !horarioCabeNoFuncionamento(
                            inicio,
                            servico.duracaoMinutos
                        )
                    ) {
                        return false;
                    }

                    return !horarioPossuiConflito(
                        inicio,
                        servico.duracaoMinutos,
                        agendamentoEditando?.id
                    );
                }
            )
            : [];

    function abrirCriacao(
        horario: string
    ) {
        setHorarioSelecionado(
            horario
        );

        setAgendamentoEditando(
            null
        );

        setMensagem("");
        setModo("CRIAR");
    }

    function abrirEdicao(
        agendamento: Agendamento
    ) {
        if (
            agendamento.status !==
            "AGENDADO"
        ) {
            setMensagem(
                "Somente agendamentos confirmados podem ser editados."
            );

            return;
        }

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
            setMensagem(
                "A data deste agendamento é inválida."
            );

            return;
        }

        setHorarioSelecionado(
            minutosParaHorario(
                obterMinutosDaData(
                    dataInicio
                )
            )
        );

        setAgendamentoEditando(
            agendamento
        );

        setMensagem("");
        setModo("EDITAR");
    }

    function voltarParaHorarios() {
        setModo("HORARIOS");

        setHorarioSelecionado(
            null
        );

        setAgendamentoEditando(
            null
        );

        setMensagem("");
    }

    async function salvarFormulario(
        dados: NovoAgendamento
    ) {
        if (processando) {
            return;
        }

        setProcessando(true);
        setMensagem("");

        let sucesso = false;

        if (
            modo === "EDITAR" &&
            agendamentoEditando
        ) {
            sucesso =
                await aoEditarAgendamento(
                    agendamentoEditando.id,
                    dados
                );
        } else {
            sucesso =
                await aoSalvarNovoAgendamento(
                    dados
                );
        }

        setProcessando(false);

        if (sucesso) {
            voltarParaHorarios();
        }
    }

    async function cancelarAgendamento(
        agendamento: Agendamento
    ) {
        if (processando) {
            return;
        }

        const confirmou =
            window.confirm(
                "Deseja realmente cancelar este agendamento?"
            );

        if (!confirmou) {
            return;
        }

        setProcessando(true);
        setMensagem("");

        const sucesso =
            await aoCancelarAgendamento(
                agendamento.id
            );

        setProcessando(false);

        if (!sucesso) {
            setMensagem(
                "Não foi possível cancelar o agendamento."
            );
        }
    }

    const datahoraInicial =
        horarioSelecionado
            ? criarDatahoraLocal(
                dataAtiva,
                horarioSelecionado
            )
            : null;

    return (
        <>
            <button
                type="button"
                className="painel-dia__fundo"
                onClick={aoFechar}
                aria-label="Fechar painel"
            />

            <aside className="painel-dia">
                <header className="painel-dia__cabecalho">
                    <div>
                        <span>
                            {modo === "CRIAR"
                                ? "Novo agendamento"
                                : modo ===
                                  "EDITAR"
                                ? "Editar agendamento"
                                : "Horários do dia"}
                        </span>

                        <h3>
                            {dataFormatada}
                        </h3>
                    </div>

                    <button
                        type="button"
                        onClick={aoFechar}
                        aria-label="Fechar painel"
                        className="painel-dia__fechar"
                    >
                        ×
                    </button>
                </header>

                {modo ===
                "HORARIOS" ? (
                    <div className="painel-dia__conteudo">
                        {intervalosFuncionamento.length ===
                        0 ? (
                            <div className="painel-dia__vazio">
                                <p>
                                    A empresa não funciona neste dia.
                                </p>

                                <span>
                                    Cadastre um horário de funcionamento para esse dia da semana.
                                </span>
                            </div>
                        ) : (
                            <div className="painel-horarios">
                                {itensHorario.map(
                                    (item) => {
                                        const agendamento =
                                            item.agendamento;

                                        if (
                                            !agendamento
                                        ) {
                                            return (
                                                <button
                                                    key={
                                                        `${item.minutos}-${item.horario}`
                                                    }
                                                    type="button"
                                                    className="painel-horario painel-horario--disponivel"
                                                    onClick={() =>
                                                        abrirCriacao(
                                                            item.horario
                                                        )
                                                    }
                                                >
                                                    <strong>
                                                        {
                                                            item.horario
                                                        }
                                                    </strong>

                                                    <span>
                                                        Disponível
                                                    </span>
                                                </button>
                                            );
                                        }

                                        const cliente =
                                            clientes.find(
                                                (
                                                    clienteItem
                                                ) =>
                                                    clienteItem.id ===
                                                    agendamento.clienteId
                                            );

                                        const servico =
                                            servicos.find(
                                                (
                                                    servicoItem
                                                ) =>
                                                    servicoItem.id ===
                                                    agendamento.servicoId
                                            );

                                        return (
                                            <div
                                                key={
                                                    `${item.minutos}-${item.horario}`
                                                }
                                                className={[
                                                    "painel-horario",
                                                    "painel-horario--ocupado",
                                                    !item.inicioAgendamento
                                                        ? "painel-horario--continuacao"
                                                        : "",
                                                ].join(
                                                    " "
                                                )}
                                            >
                                                <button
                                                    type="button"
                                                    className="painel-horario__principal"
                                                    onClick={() =>
                                                        abrirEdicao(
                                                            agendamento
                                                        )
                                                    }
                                                    disabled={
                                                        !item.inicioAgendamento ||
                                                        agendamento.status !==
                                                            "AGENDADO"
                                                    }
                                                >
                                                    <strong>
                                                        {
                                                            item.horario
                                                        }
                                                    </strong>

                                                    {item.inicioAgendamento ? (
                                                        <span>
                                                            {cliente?.nome ??
                                                                "Cliente não encontrado"}
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            Ocupado
                                                        </span>
                                                    )}

                                                    {item.inicioAgendamento && (
                                                        <small>
                                                            {servico?.nome ??
                                                                "Serviço não encontrado"}
                                                        </small>
                                                    )}
                                                </button>

                                                {item.inicioAgendamento && (
                                                    <div className="painel-horario__acoes">
                                                        <span
                                                            className={[
                                                                "painel-agendamento__status",
                                                                `painel-agendamento__status--${agendamento.status.toLowerCase()}`,
                                                            ].join(
                                                                " "
                                                            )}
                                                        >
                                                            {
                                                                nomesStatus[
                                                                    agendamento
                                                                        .status
                                                                ]
                                                            }
                                                        </span>

                                                        {(agendamento.status ===
                                                            "AGENDADO" ||
                                                            agendamento.status ===
                                                                "AGUARDANDO") && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    cancelarAgendamento(
                                                                        agendamento
                                                                    )
                                                                }
                                                                disabled={
                                                                    processando
                                                                }
                                                            >
                                                                Cancelar
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        )}

                        {mensagem && (
                            <p className="painel-dia__mensagem">
                                {mensagem}
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="painel-dia__conteudo">
                            {modo ===
                                "CRIAR" &&
                            servicosDisponiveis.length ===
                                0 ? (
                                <div className="painel-dia__vazio">
                                    <p>
                                        Nenhum serviço cabe neste horário.
                                    </p>

                                    <span>
                                        O serviço pode estar indisponível nesta data ou não caber antes do próximo atendimento.
                                    </span>
                                </div>
                            ) : (
                                <FormularioAgendamento
                                    agendamento={
                                        modo ===
                                        "EDITAR"
                                            ? agendamentoEditando
                                            : null
                                    }
                                    clientes={
                                        clientes
                                    }
                                    servicos={
                                        modo ===
                                        "CRIAR"
                                            ? servicosDisponiveis
                                            : servicos
                                    }
                                    datahoraInicial={
                                        modo ===
                                        "CRIAR"
                                            ? datahoraInicial
                                            : null
                                    }
                                    onSalvar={
                                        salvarFormulario
                                    }
                                />
                            )}

                            {processando && (
                                <p className="painel-dia__mensagem">
                                    Salvando...
                                </p>
                            )}

                            {mensagem && (
                                <p className="painel-dia__mensagem">
                                    {mensagem}
                                </p>
                            )}
                        </div>

                        <footer className="painel-dia__rodape">
                            <button
                                type="button"
                                className="painel-dia__voltar"
                                onClick={
                                    voltarParaHorarios
                                }
                                disabled={
                                    processando
                                }
                            >
                                Voltar para os horários
                            </button>
                        </footer>
                    </>
                )}
            </aside>
        </>
    );
}