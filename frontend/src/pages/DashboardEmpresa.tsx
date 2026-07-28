import { useEffect, useState } from "react";
import { api } from "../services/api";
import { ListaServicos } from "../components/ListarServicos";
import type { NovoServico, Servico } from "../types/Servico";
import { FormularioServico } from "../components/FormularioServico";


export function DashboardEmpresa() {

    const [servicos, setServicos] = useState<Servico[]>([]);
    const [mensagem, setMensagem] = useState<string>("")
    const [servicoEditando, setServicoEditando] =
        useState<Servico | null>(null);


    async function buscarServicos() {

        try {
            const token = localStorage.getItem("token");
            const resposta = await api.get("empresa/servicos",
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })

            setServicos(resposta.data);
        } catch (erro) {
            console.error(erro);
        }

    }
    useEffect(() => {
        buscarServicos();
    }, [])

    async function excluirServico(id: number) {

        const token = localStorage.getItem("token");
        await api.delete(`empresa/servicos/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        buscarServicos();

    }

    function editarServico(servico: Servico) {

        setServicoEditando(servico);

    }
    async function salvarServico(dados: NovoServico) {

        const token = localStorage.getItem("token");

        if (servicoEditando) {

            try {

                await api.put(`empresa/servicos/${servicoEditando.id}`,
                    dados,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }

                )


                setMensagem("Serviço atualizado com sucesso");

                await buscarServicos();
                setServicoEditando(null);

            } catch (erro) {
                console.error("erro ao editar");
                console.error(erro);
                setMensagem("erro ao editar")
            }

        } else {

            try {
                await api.post(
                    "empresa/servicos",
                    dados,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                setMensagem("cadastro concluido com sucesso")

                await buscarServicos();
                setServicoEditando(null);

            } catch (erro) {
                console.error("erro ao cadastrar");
                console.error(erro);
                setMensagem("erro ao cadastrar")
            }



        }



    }

    return (
        <div>
            <FormularioServico
                servico={servicoEditando}
                onSalvar={salvarServico}
            />

            <ListaServicos

                servicos={servicos}

                aoExcluir={excluirServico}
                aoEditar={editarServico}

            />
            {mensagem && <p>{mensagem}</p>}
        </div>
    )
}