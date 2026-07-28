import { useEffect, useState } from "react";
import type { Servico, NovoServico } from "../types/Servico";

type FormularioServicoProps = {
    servico: Servico | null;
    onSalvar: (dados: NovoServico) => void;
};

export function FormularioServico({
    servico,
    onSalvar,
}: FormularioServicoProps) {

    const [nome, setNome] = useState("");
    const [duracaoMinutos, setDuracaoMinutos] = useState(0);
    const [descricao, setDescricao] = useState("");
    const [preco, setPreco] = useState(0);
    const [ativo, setAtivo] = useState(true);

    useEffect(() => {

        if (servico) {

            setNome(servico.nome);
            setDuracaoMinutos(servico.duracaoMinutos);
            setDescricao(servico.descricao);
            setPreco(servico.preco);
            setAtivo(servico.ativo);

        } else {

            setNome("");
            setDuracaoMinutos(0);
            setDescricao("");
            setPreco(0);
            setAtivo(true);

        }

    }, [servico]);

    function enviarFormulario(event: React.FormEvent<HTMLFormElement>) {

        event.preventDefault();

        onSalvar({
            nome,
            duracaoMinutos,
            descricao,
            preco,
            ativo,
        });

    }

    return (
        <form onSubmit={enviarFormulario}>

            <input
                type="text"
                placeholder="Nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
            />

            <input
                type="number"
                placeholder="Duração"
                value={duracaoMinutos}
                onChange={(e) => setDuracaoMinutos(Number(e.target.value))}
            />

            <input
                type="text"
                placeholder="Descrição"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
            />

            <input
                type="number"
                placeholder="Preço"
                value={preco}
                onChange={(e) => setPreco(Number(e.target.value))}
            />

            <button type="submit">
                {servico ? "Salvar Alterações" : "Registrar"}
            </button>

        </form>
    );
}