import React, { useState } from "react";
import {api} from "../services/api"

export function CadastroEmpresa(){

    const [nome, setNome] = useState<string>("")
    const [email, setEmail] = useState<string>("")
    const [senha, setSenha] = useState<string>("")
    const [telefone ,setTelefone] =useState<string>("")
    const [mensagem, setMensagem] = useState<string>("")

    const cadastrarEmpresa = async (event: React.SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        try{
            const resposta = await api.post(
                "empresa/cadastro",
                {
                    nome,
                    email,
                    senha,
                    telefone,
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
        <form onSubmit={cadastrarEmpresa}>
            <input type="text" placeholder="Nome" value={nome} onChange={(e)=>setNome(e.target.value)}/>
            <input type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)}/>
            <input type="password" placeholder="Senha" value={senha} onChange={(e)=>setSenha(e.target.value)}/>
            <input type="text" placeholder="Telefone/Whatsapp" value={telefone} onChange={(e)=>setTelefone(e.target.value)}/>
            <button type="submit">Cadastrar</button>
            {mensagem && <p>{mensagem}</p>}
        </form>
    )
}
