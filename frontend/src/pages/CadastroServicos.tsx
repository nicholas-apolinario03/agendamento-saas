import { useState } from "react";
import { api } from "../services/api";

export function CadastroServico() {
    const [nome, setNome] = useState<string>("");
    const [duracaoMinutos, setDuracaoMinutos] = useState<number>(0);
    const [descricao, setDescricao] = useState<string>("");
    const [preco, setPreco] = useState<number>(0);
    const [ativo, setAtivo] = useState(true);
    const token = localStorage.getItem("token");

    const cadastrarServico = async (event: React.SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        try {
            const resposta = await api.post(
                "empresa/servico", {
                nome,
                duracaoMinutos,
                descricao,
                preco,
                ativo
            },
    {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
            console.log(resposta.data);
        } catch (erro) {
            console.error(erro)
            console.error("erro ao registrar o serviço")
        }
    }
    return(
        <form onSubmit={cadastrarServico}>
            <input type="text" value={nome} onChange={(e)=> setNome(e.target.value)} />
             <input type="number" value={duracaoMinutos} onChange={(e)=> setDuracaoMinutos(Number(e.target.value))} />
              <input type="text" value={descricao} onChange={(e)=> setDescricao(e.target.value)} />
               <input type="number" value={preco} onChange={(e)=> setPreco(Number(e.target.value))} />
               <button type="submit">Registrar</button>
        </form>
    )

}