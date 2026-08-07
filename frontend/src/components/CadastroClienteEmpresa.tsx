import React, { useState } from "react";
import { api } from "../services/api"
import "./css/Formulario.css"
export function CadastroClienteEmpresa() {

    const [nome, setNome] = useState<string>("")
    const [email, setEmail] = useState<string>("")
    const [telefone, setTelefone] = useState<string>("")
    const [mensagemCliente, setMensagemCliente] = useState<string>("")

    const cadastrarClienteEmpresa = async (event: React.SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        try {
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
            setMensagemCliente("Cliente cadastrado com sucesso")
        } catch (erro) {
            console.error("erro ao cadastrar");
            console.error(erro);
            setMensagemCliente("erro ao cadastrar")
        }


    }
    return (
        <form className="formulario" onSubmit={cadastrarClienteEmpresa}>
            <div className="formulario-login__cabecalho">
                <h2>
                    Novo Cliente
                </h2>
            </div>
            <div className="formulario-login__campo">
                <input type="text" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="formulario-login__campo">
                <input type="text" placeholder="Telefone/Whatsapp" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            <div className="formulario-login__campo">
                <input type="email" placeholder="Email (Opcional)" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <button  className="formulario-login__botao" type="submit">Cadastrar</button>
            {mensagemCliente && <p>{mensagemCliente}</p>}
        </form>
    )
}
