import React, { useState } from "react";
import {api} from "../services/api"

export function CadastroClienteEmpresa(){

    const [nome, setNome] = useState<string>("")
    const [email, setEmail] = useState<string>("")
    const [telefone ,setTelefone] =useState<string>("")
    const [mensagem, setMensagem] = useState<string>("")

    const cadastrarClienteEmpresa = async (event: React.SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        try{
             const token = localStorage.getItem("token");

           await api.post(
                "empresa/clientes",
                {
                    nome,
                    email: email || null,
                    telefone,
                },
                {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
               
            );
             setMensagem("cadastro concluido com sucesso")
        }catch(erro){
            console.error("erro ao cadastrar");
            console.error(erro);
            setMensagem("erro ao cadastrar")
        }
       

    }
    return(
        <form onSubmit={cadastrarClienteEmpresa}>
            <input type="text" placeholder="Nome" value={nome} onChange={(e)=>setNome(e.target.value)}/>
            <input type="text" placeholder="Telefone/Whatsapp" value={telefone} onChange={(e)=>setTelefone(e.target.value)}/>
            <input type="email" placeholder="Email (Opcional)" value={email} onChange={(e)=>setEmail(e.target.value)}/>
            <button type="submit">Cadastrar</button>
            {mensagem && <p>{mensagem}</p>}
        </form>
    )
}
