import {
    useEffect,
    useState
} from "react";

import { api } from "../services/api";
import "../components/css/DashboardAgendamento.css";

import IntegracaoWhatsApp from "../components/IntegracaoWhatsApp";
import DashboardLayout from "../layouts/DashboardLayout";

import {
    ListarHorarios
} from "../components/ListarHorarios";

import type {
    NovoHorario,
    HorarioFuncionamento
} from "../types/HorarioFuncionamento";

import {
    FormularioHorario
} from "../components/FormularioHorario";

type AssinaturaEmpresa = {
    status: string;

    inicioCiclo: string | null;
    fimCiclo: string | null;

    inicioTrial: string | null;
    fimTrial: string | null;

    cancelamentoAgendado: boolean;

    plano: {
        id: number;
        nome: string;
        preco: string;
        limiteAgendamentos: number;
    };

    proximoPlano: {
        id: number;
        nome: string;
        preco: string;
    } | null;
};

export function DashboardEmpresa() {
    const [
        horarios,
        setHorarios
    ] = useState<
        HorarioFuncionamento[]
    >([]);

    const [
        mensagem,
        setMensagem
    ] = useState<string>("");

    const [
        horarioEditando,
        setHorarioEditando
    ] = useState<
        HorarioFuncionamento | null
    >(null);

    const [
        assinatura,
        setAssinatura
    ] = useState<
        AssinaturaEmpresa | null
    >(null);

    const [
        carregandoAssinatura,
        setCarregandoAssinatura
    ] = useState(true);

    const [
        cancelandoAssinatura,
        setCancelandoAssinatura
    ] = useState(false);

    const [
        mensagemAssinatura,
        setMensagemAssinatura
    ] = useState("");

    // ==================================================
    // HORÁRIOS
    // ==================================================

    async function buscarHorario() {
        try {
            const token =
                localStorage.getItem(
                    "token"
                );

            const resposta =
                await api.get(
                    "empresa/horarios",
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );

            setHorarios(
                resposta.data
            );
        } catch (erro) {
            console.error(erro);
        }
    }

    async function excluirHorario(
        id: number
    ) {
        const token =
            localStorage.getItem(
                "token"
            );

        await api.delete(
            `empresa/horarios/${id}`,
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

        buscarHorario();
    }

    function editarHorario(
        horario:
            HorarioFuncionamento
    ) {
        setHorarioEditando(
            horario
        );
    }

    async function salvarHorario(
        dados: NovoHorario
    ) {
        const token =
            localStorage.getItem(
                "token"
            );

        if (horarioEditando) {
            try {
                await api.put(
                    `empresa/horarios/${horarioEditando.id}`,
                    dados,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );

                setMensagem(
                    "Horário editado com sucesso"
                );

                await buscarHorario();

                setHorarioEditando(
                    null
                );

            } catch (erro) {
                console.error(
                    "Erro ao editar:",
                    erro
                );

                setMensagem(
                    "Erro ao editar"
                );
            }

        } else {
            try {
                await api.post(
                    "empresa/horarios",
                    dados,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );

                setMensagem(
                    "Cadastro concluído com sucesso"
                );

                await buscarHorario();

                setHorarioEditando(
                    null
                );

            } catch (erro: any) {
                console.error(
                    "Erro ao cadastrar:",
                    erro
                );

                console.error(
                    "Status:",
                    erro.response?.status
                );

                console.error(
                    "Resposta:",
                    erro.response?.data
                );
            }
        }
    }

    // ==================================================
    // ASSINATURA
    // ==================================================

    async function buscarAssinatura() {
        try {
            setCarregandoAssinatura(
                true
            );

            const token =
                localStorage.getItem(
                    "token"
                );

            const resposta =
                await api.get(
                    "/empresa/assinatura",
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );

            setAssinatura(
                resposta.data
            );

        } catch (erro) {
            console.error(
                "Erro ao buscar assinatura:",
                erro
            );

            setAssinatura(
                null
            );

        } finally {
            setCarregandoAssinatura(
                false
            );
        }
    }

    async function cancelarRenovacao() {
        if (!assinatura) {
            return;
        }

        const confirmou =
            window.confirm(
                "Deseja cancelar a renovação automática? Você continuará com acesso até o fim do período já pago."
            );

        if (!confirmou) {
            return;
        }

        try {
            setCancelandoAssinatura(
                true
            );

            setMensagemAssinatura(
                ""
            );

            const token =
                localStorage.getItem(
                    "token"
                );

            const resposta =
                await api.post(
                    "/assinatura/cancelar",
                    {},
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );

            setMensagemAssinatura(
                resposta.data?.mensagem ||
                "Renovação cancelada."
            );

            await buscarAssinatura();

        } catch (erro: any) {
            console.error(
                "Erro ao cancelar renovação:",
                erro
            );

            setMensagemAssinatura(
                erro.response?.data?.erro ||
                "Não foi possível cancelar a renovação."
            );

        } finally {
            setCancelandoAssinatura(
                false
            );
        }
    }

    // ==================================================
    // INICIALIZAÇÃO
    // ==================================================

    useEffect(() => {
        buscarHorario();
        buscarAssinatura();
    }, []);

    return (
        <DashboardLayout>
            <IntegracaoWhatsApp />

            <div className="painel-gerenciamento__conteudo">

                {/* ===================================== */}
                {/* ASSINATURA */}
                {/* ===================================== */}

                <section className="painel-gerenciamento__secao">
                    <div className="painel-gerenciamento__formulario">
                        <h2>
                            Assinatura
                        </h2>

                        {carregandoAssinatura ? (
                            <p>
                                Carregando assinatura...
                            </p>
                        ) : assinatura ? (
                            <>
                                <p>
                                    Plano atual:{" "}
                                    <strong>
                                        {
                                            assinatura
                                                .plano
                                                .nome
                                        }
                                    </strong>
                                </p>

                                <p>
                                    Status:{" "}
                                    <strong>
                                        {
                                            assinatura
                                                .status
                                        }
                                    </strong>
                                </p>

                                <p>
                                    Valor: R${" "}
                                    {Number(
                                        assinatura
                                            .plano
                                            .preco
                                    )
                                        .toFixed(2)
                                        .replace(
                                            ".",
                                            ","
                                        )}
                                    /mês
                                </p>

                                {assinatura
                                    .fimCiclo && (
                                        <p>
                                            Acesso até:{" "}
                                            <strong>
                                                {new Date(
                                                    assinatura
                                                        .fimCiclo
                                                ).toLocaleDateString(
                                                    "pt-BR"
                                                )}
                                            </strong>
                                        </p>
                                    )}

                                {assinatura
                                    .proximoPlano && (
                                        <p>
                                            Próximo plano:{" "}
                                            <strong>
                                                {
                                                    assinatura
                                                        .proximoPlano
                                                        .nome
                                                }
                                            </strong>
                                        </p>
                                    )}

                                {assinatura
                                    .cancelamentoAgendado ? (
                                    <p>
                                        A renovação automática está cancelada.
                                        Você continuará com acesso até o fim do ciclo atual.
                                    </p>
                                ) : (
                                    assinatura.status ===
                                    "ATIVA" && (
                                        <button
                                            type="button"
                                            disabled={
                                                cancelandoAssinatura
                                            }
                                            onClick={
                                                cancelarRenovacao
                                            }
                                        >
                                            {
                                                cancelandoAssinatura
                                                    ? "Cancelando..."
                                                    : "Cancelar renovação"
                                            }
                                        </button>

                                    )

                                )}

                                {mensagemAssinatura && (
                                    <p>
                                        {
                                            mensagemAssinatura
                                        }
                                    </p>
                                )}
                            </>
                        ) : (
                            <p>
                                Não foi possível carregar a assinatura.
                            </p>
                        )}
                        < a href="/planos">
                            Ver planos
                        </a>
            </div>
        </section>

                {/* ===================================== */ }
    {/* HORÁRIOS */ }
    {/* ===================================== */ }

    <section className="painel-gerenciamento__secao">
        <div className="painel-gerenciamento__formulario">
            <FormularioHorario
                horario={
                    horarioEditando
                }
                onSalvar={
                    salvarHorario
                }
            />
        </div>

        <div className="painel-gerenciamento__lista">
            <ListarHorarios
                horarios={
                    horarios
                }
                aoEditar={
                    editarHorario
                }
                aoExcluir={
                    excluirHorario
                }
            />
        </div>
    </section>
            </div >

        { mensagem && (
            <p>
                {mensagem}
            </p>
        )
}
        </DashboardLayout >
    );
}