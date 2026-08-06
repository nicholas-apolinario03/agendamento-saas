import {
    useEffect,
    useState,
} from "react";

import CalendarioAgendamentos from
    "../components/agendamentos/CalendarioAgendamentos";
import { ListaServicos } from "../components/ListarServicos";
import { FormularioServico } from "../components/FormularioServico";

import type {
    Agendamento,
    NovoAgendamento,
} from "../types/Agendamento";

import type {
    Cliente,
} from "../types/Cliente";

import type {
    HorarioFuncionamento,
} from "../types/HorarioFuncionamento";

import type {
    Servico,NovoServico
} from "../types/Servico";

import {
    api,
} from "../services/api";

export function DashboardAgendamento() {
    const [
        clientes,
        setClientes,
    ] = useState<Cliente[]>([]);

    const [
        servicos,
        setServicos,
    ] = useState<Servico[]>([]);
     const [
        servicoEditando,
        setServicoEditando
    ] = useState<Servico | null>(null);


    const [
        horarios,
        setHorarios,
    ] =
        useState<
            HorarioFuncionamento[]
        >([]);

    const [
        agendamentos,
        setAgendamentos,
    ] = useState<Agendamento[]>(
        []
    );

    const [
        mensagem,
        setMensagem,
    ] = useState("");

    function obterToken() {
        return localStorage.getItem(
            "token"
        );
    }

    function obterHeaders() {
        return {
            Authorization:
                `Bearer ${obterToken()}`,
        };
    }
    
    async function buscarClientes() {
        try {
            const resposta =
                await api.get(
                    "empresa/clientes",
                    {
                        headers:
                            obterHeaders(),
                    }
                );

            setClientes(
                resposta.data
            );
        } catch (erro) {
            console.error(
                "Erro ao buscar clientes:",
                erro
            );
        }
    }

    async function buscarServicos() {
        try {
            const resposta =
                await api.get(
                    "empresa/servicos",
                    {
                        headers:
                            obterHeaders(),
                    }
                );

            setServicos(
                resposta.data
            );
        } catch (erro) {
            console.error(
                "Erro ao buscar serviços:",
                erro
            );
        }
    }

    async function buscarHorarios() {
        try {
            const resposta =
                await api.get(
                    "empresa/horarios",
                    {
                        headers:
                            obterHeaders(),
                    }
                );

            setHorarios(
                resposta.data
            );
        } catch (erro) {
            console.error(
                "Erro ao buscar horários:",
                erro
            );
        }
    }

    async function buscarAgendamentos() {
        try {
            const resposta =
                await api.get(
                    "empresa/agendamentos",
                    {
                        headers:
                            obterHeaders(),
                    }
                );

            setAgendamentos(
                resposta.data
            );
        } catch (erro) {
            console.error(
                "Erro ao buscar agendamentos:",
                erro
            );
        }
    }
    async function excluirServico(
            id: number
        ) {
    
            const token =
                localStorage.getItem("token");
    
            try {
    
                await api.delete(
                    `empresa/servicos/${id}`,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );
    
                if (
                    servicoEditando?.id === id
                ) {
                    setServicoEditando(null);
                }
    
                setMensagem(
                    "Serviço excluído com sucesso"
                );
    
                await buscarServicos();
    
            } catch (erro: any) {
    
                console.error(
                    "Erro ao excluir serviço:",
                    erro
                );
    
                setMensagem(
                    erro.response?.data?.erro ??
                    "Erro ao excluir serviço"
                );
    
            }
    
        }
    
    
        function editarServico(
            servico: Servico
        ) {
    
            setServicoEditando(servico);
            setMensagem("");
    
        }
    
    
        function cancelarEdicao() {
    
            setServicoEditando(null);
            setMensagem("");
    
        }
    
    
        async function salvarServico(
            dados: NovoServico
        ) {
    
            const token =
                localStorage.getItem("token");
    
            try {
    
                if (servicoEditando) {
    
                    await api.put(
                        `empresa/servicos/${servicoEditando.id}`,
                        dados,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`
                            }
                        }
                    );
    
                    setMensagem(
                        "Serviço atualizado com sucesso"
                    );
    
                } else {
    
                    await api.post(
                        "empresa/servicos",
                        dados,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`
                            }
                        }
                    );
    
                    setMensagem(
                        "Serviço cadastrado com sucesso"
                    );
    
                }
    
                setServicoEditando(null);
    
                await buscarServicos();
    
            } catch (erro: any) {
    
                console.error(
                    "Erro ao salvar serviço:",
                    erro
                );
    
                setMensagem(
                    erro.response?.data?.erro ??
                    "Erro ao salvar serviço"
                );
    
            }
    
        }

    useEffect(() => {
        void Promise.all([
            buscarClientes(),
            buscarServicos(),
            buscarHorarios(),
            buscarAgendamentos(),
        ]);
    }, []);

    async function salvarNovoAgendamento(
    dados: NovoAgendamento
) {
    try {
        const resposta =
            await api.post(
                "empresa/agendamentos",
                dados,
                {
                    headers:
                        obterHeaders(),
                }
            );

        setMensagem(
            resposta.data.aviso ??
            resposta.data.mensagem ??
            (
                dados.confirmacao ===
                "EMAIL"
                    ? "Agendamento criado aguardando confirmação."
                    : "Agendamento criado com sucesso."
            )
        );

        await buscarAgendamentos();

        return true;
    } catch (erro: any) {
        console.error(
            "Erro ao criar agendamento:",
            erro
        );

        setMensagem(
            erro.response?.data
                ?.erro ??
            "Erro ao criar agendamento."
        );

        return false;
    }
}

    async function editarAgendamento(
        id: number,
        dados: NovoAgendamento
    ) {
        try {
            await api.put(
                `empresa/agendamentos/${id}`,
                {
                    datahoraInicio:
                        dados.datahoraInicio,
                },
                {
                    headers:
                        obterHeaders(),
                }
            );

            setMensagem(
                "Agendamento atualizado com sucesso."
            );

            await buscarAgendamentos();

            return true;
        } catch (erro: any) {
            console.error(
                "Erro ao editar agendamento:",
                erro
            );

            setMensagem(
                erro.response?.data
                    ?.erro ??
                "Erro ao editar agendamento."
            );

            return false;
        }
    }

    async function cancelarAgendamento(
        id: number
    ) {
        try {
            await api.patch(
                `empresa/agendamentos/${id}/cancelar`,
                {},
                {
                    headers:
                        obterHeaders(),
                }
            );

            setMensagem(
                "Agendamento cancelado com sucesso."
            );

            await buscarAgendamentos();

            return true;
        } catch (erro: any) {
            console.error(
                "Erro ao cancelar agendamento:",
                erro
            );

            setMensagem(
                erro.response?.data
                    ?.erro ??
                "Erro ao cancelar agendamento."
            );

            return false;
        }
    }

    return (
        <main className="dashboard-agendamento">
            <CalendarioAgendamentos
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
                aoSalvarNovoAgendamento={
                    salvarNovoAgendamento
                }
                aoEditarAgendamento={
                    editarAgendamento
                }
                aoCancelarAgendamento={
                    cancelarAgendamento
                }
            />

            {mensagem && (
                <p className="dashboard-agendamento__mensagem">
                    {mensagem}
                </p>
            )}
            <div>
             <FormularioServico
                            servico={servicoEditando}
                            onSalvar={salvarServico}
                        />
            
            
                        {servicoEditando && (
                            <button
                                type="button"
                                onClick={cancelarEdicao}
                            >
                                Cancelar edição
                            </button>
                        )}
            
            
                        <ListaServicos
                            servicos={servicos}
                            aoExcluir={excluirServico}
                            aoEditar={editarServico}
                        />
            
            
                        {mensagem && (
                            <p>
                                {mensagem}
                            </p>
                        )}
            
                    </div>
        </main>
        
        
    );
}