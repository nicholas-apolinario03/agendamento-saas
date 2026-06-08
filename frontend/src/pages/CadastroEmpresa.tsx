import React, { useState } from "react";


export function CadastroEmpresa(){

    const [nome, setNome] = useState<string>("")
    const [email, setEmail] = useState<string>("")
    const [senha, setSenha] = useState<string>("")
    const [telefone ,setTelefone] =useState<string>("")

    function cadastrarEmpresa (event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        console.log({
            nome,
            email,
            telefone,
            senha
        }); 

    }
    return(
        <form onSubmit={cadastrarEmpresa}>
            <input type="text" placeholder="Nome" value={nome} onChange={(e)=>setNome(e.target.value)}/>
            <input type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)}/>
            <input type="password" placeholder="Senha" value={senha} onChange={(e)=>setSenha(e.target.value)}/>
            <input type="text" placeholder="Telefone/Whatsapp" value={telefone} onChange={(e)=>setTelefone(e.target.value)}/>
            <button type="submit"></button>
        </form>
    )
}
