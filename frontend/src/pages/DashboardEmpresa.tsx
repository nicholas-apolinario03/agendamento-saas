import { useEffect, useState } from "react";

import { api } from "../services/api";

import { ListaServicos } from "../components/ListarServicos";
import { FormularioServico } from "../components/FormularioServico";
import IntegracaoWhatsApp from "../components/IntegracaoWhatsApp";

import type {
    NovoServico,
    Servico
} from "../types/Servico";


export function DashboardEmpresa() {

    const [servicos, setServicos] =
        useState<Servico[]>([]);

    const [mensagem, setMensagem] =
        useState("");

    const [
        servicoEditando,
        setServicoEditando
    ] = useState<Servico | null>(null);


    async function buscarServicos() {

        const token =
            localStorage.getItem("token");

        try {

            const resposta =
                await api.get(
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

            setMensagem(
                "Erro ao buscar serviços"
            );

        }

    }


    useEffect(() => {
        buscarServicos();
    }, []);


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


    return (
        <div>
            <IntegracaoWhatsApp />
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
    );
}