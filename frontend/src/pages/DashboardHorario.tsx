import { useEffect, useState } from "react";
import { api } from "../services/api";
import { ListarHorarios } from "../components/ListarHorarios";
import type { NovoHorario, HorarioFuncionamento } from "../types/HorarioFuncionamento";
import { FormularioHorario } from "../components/FormularioHorario";

export function DashboardHorario() {

    const [horarios, setHorarios] = useState<HorarioFuncionamento[]>([]);
    const [mensagem, setMensagem] = useState<string>("")
    const [horarioEditando, setHorarioEditando] =
        useState<HorarioFuncionamento | null>(null);

    async function buscarHorario() {


        try {

            const token = localStorage.getItem("token");
            const resposta = await api.get("empresa/horarios",
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })

            setHorarios(resposta.data)
        } catch (erro) {
            console.error(erro);
        }

    }
    useEffect(() => {
        buscarHorario();
    }, [])

    async function excluirHorario(id: number) {

        const token = localStorage.getItem("token");
        await api.delete(`empresa/horarios/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        buscarHorario();

    }
    function editarHorario(horario: HorarioFuncionamento) {

        setHorarioEditando(horario);

    }
    async function salvarHorario(dados: NovoHorario) {

        const token = localStorage.getItem("token");

        if (horarioEditando) {
            try {

                await api.put(`empresa/horarios/${horarioEditando.id}`,
                    dados,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }

                )
                setMensagem("horario editado com sucesso");

                await buscarHorario();
                setHorarioEditando(null);

            } catch (erro) {
                console.error("erro ao editar");
                console.error(erro);
                setMensagem("erro ao editar")
            }

        } else {

            try {
                await api.post(
                    "empresa/horarios",
                    dados,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                setMensagem("cadastro concluido com sucesso")

                await buscarHorario();
                setHorarioEditando(null);

            } catch (erro: any) {

                console.error("erro ao cadastrar");
                console.error("Status:", erro.response?.status);
                console.error("Resposta:", erro.response?.data);
                console.error("Erro completo:", erro);

            }



        }
    }
    return (
        <div>
            <FormularioHorario
                horario={horarioEditando}
                onSalvar={salvarHorario}
            />
            <ListarHorarios

                horarios={horarios}
                aoEditar={editarHorario}
                aoExcluir={excluirHorario}

            />
            {mensagem && <p>{mensagem}</p>}
        </div>
    )
}