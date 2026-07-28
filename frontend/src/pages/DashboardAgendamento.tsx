import { useEffect, useState } from "react";

import type {
    Agendamento,
    NovoAgendamento
} from "../types/Agendamento";

import type { Cliente } from "../types/Cliente";
import type { Servico } from "../types/Servico";

import { api } from "../services/api";

import { FormularioAgendamento } from "../components/FormularioAgendamento";
import { ListarAgendamentos } from "../components/ListarAgendamentos";


export function DashboardAgendamento() {

    const [clientes, setClientes] =
        useState<Cliente[]>([]);

    const [servicos, setServicos] =
        useState<Servico[]>([]);

    const [agendamentos, setAgendamentos] =
        useState<Agendamento[]>([]);

    const [
        agendamentoEditando,
        setAgendamentoEditando
    ] = useState<Agendamento | null>(null);

    const [mensagem, setMensagem] =
        useState<string>("");


    async function buscarClientes() {

        const token =
            localStorage.getItem("token");

        try {

            const resposta = await api.get(
                "empresa/clientes",
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

            setClientes(resposta.data);

        } catch (erro) {

            console.error(
                "Erro ao buscar clientes:",
                erro
            );

        }

    }


    async function buscarServicos() {

        const token =
            localStorage.getItem("token");

        try {

            const resposta = await api.get(
                "empresa/servicos",
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

            setServicos(resposta.data);

        } catch (erro) {

            console.error(
                "Erro ao buscar serviços:",
                erro
            );

        }

    }


    async function buscarAgendamentos() {

        const token =
            localStorage.getItem("token");

        try {

            const resposta = await api.get(
                "empresa/agendamentos",
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

            setAgendamentos(resposta.data);

        } catch (erro) {

            console.error(
                "Erro ao buscar agendamentos:",
                erro
            );

        }

    }


    useEffect(() => {

        buscarClientes();
        buscarServicos();
        buscarAgendamentos();

    }, []);


    function selecionarAgendamentoParaEdicao(
        agendamento: Agendamento
    ) {

        if (agendamento.status !== "AGENDADO") {

            setMensagem(
                "Somente agendamentos confirmados podem ser editados"
            );

            return;

        }

        setAgendamentoEditando(agendamento);
        setMensagem("");

    }


    async function salvarAgendamento(
        dados: NovoAgendamento
    ) {

        const token =
            localStorage.getItem("token");


        if (agendamentoEditando) {

            try {

                await api.put(
                    `empresa/agendamentos/${agendamentoEditando.id}`,
                    {
                        datahoraInicio:
                            dados.datahoraInicio
                    },
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );

                setMensagem(
                    "Agendamento atualizado com sucesso"
                );

                setAgendamentoEditando(null);

                await buscarAgendamentos();

            } catch (erro: any) {

                console.error(
                    "Erro ao editar agendamento:",
                    erro
                );

                if (erro.response) {

                    setMensagem(
                        erro.response.data.erro ||
                        "Erro ao editar agendamento"
                    );

                } else {

                    setMensagem(
                        "Erro ao conectar com o servidor"
                    );

                }

            }

            return;

        }


        try {

            await api.post(
                "empresa/agendamentos",
                dados,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

            setMensagem(
                "Agendamento criado com sucesso"
            );

            setAgendamentoEditando(null);

            await buscarAgendamentos();

        } catch (erro: any) {

            console.error(
                "Erro ao criar agendamento:",
                erro
            );

            if (erro.response) {

                setMensagem(
                    erro.response.data.erro ||
                    "Erro ao criar agendamento"
                );

            } else {

                setMensagem(
                    "Erro ao conectar com o servidor"
                );

            }

        }

    }


    async function cancelarAgendamento(
        id: number
    ) {

        const token =
            localStorage.getItem("token");

        try {

            await api.patch(
                `empresa/agendamentos/${id}/cancelar`,
                {},
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

            setMensagem(
                "Agendamento cancelado com sucesso"
            );

            if (
                agendamentoEditando?.id === id
            ) {

                setAgendamentoEditando(null);

            }

            await buscarAgendamentos();

        } catch (erro: any) {

            console.error(
                "Erro ao cancelar agendamento:",
                erro
            );

            if (erro.response) {

                setMensagem(
                    erro.response.data.erro ||
                    "Erro ao cancelar agendamento"
                );

            } else {

                setMensagem(
                    "Erro ao conectar com o servidor"
                );

            }

        }

    }


    function cancelarEdicao() {

        setAgendamentoEditando(null);
        setMensagem("");

    }


    return (

        <div>

            <FormularioAgendamento
                agendamento={
                    agendamentoEditando
                }
                clientes={
                    clientes
                }
                servicos={
                    servicos
                }
                onSalvar={
                    salvarAgendamento
                }
            />


            {agendamentoEditando && (

                <button
                    type="button"
                    onClick={
                        cancelarEdicao
                    }
                >
                    Cancelar edição
                </button>

            )}


            <ListarAgendamentos
                agendamentos={
                    agendamentos
                }
                clientes={
                    clientes
                }
                servicos={
                    servicos
                }
                aoEditar={
                    selecionarAgendamentoParaEdicao
                }
                aoCancelar={
                    cancelarAgendamento
                }
            />


            {mensagem && (

                <p>
                    {mensagem}
                </p>

            )}

        </div>

    );

}