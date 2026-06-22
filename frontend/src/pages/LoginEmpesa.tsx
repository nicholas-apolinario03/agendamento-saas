import React, { useState } from "react";
import { api } from "../services/api"


export function LoginEmpresas() {

    const [email, setEmail] = useState<string>("");
    const [senha, setSenha] = useState<string>("");
    const [mensagem, setMensagem] = useState<string>("")

    const LoginEmpresa = async (event: React.SyntheticEvent<HTMLFormElement>) => {

        event.preventDefault()
        try {
            const resposta = await api.post(
                "empresa/login",
                {
                    email,
                    senha,

                }

            );

            localStorage.setItem(
                "token",
                resposta.data.token
            );
            
            setMensagem("Login concluido com sucesso")
        } catch (erro) {
            console.error("erro ao cadastrar");
            console.error(erro);
            setMensagem("erro ao tentar logar")
        }
    }
    return (
        <form onSubmit={LoginEmpresa}>
            <h1>Login Empresa</h1>
            <input type="email" placeholder="Email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Senha" name="senha" value={senha} onChange={(e) => setSenha(e.target.value)} />
            <button type="submit">Entrar</button>
            {mensagem && <p>{mensagem}</p>}
        </form>

    )
}
