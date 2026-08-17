import React, {
    useState,
} from "react";

import {
    Link,
} from "react-router-dom";

import {
    api,
} from "../services/api";

import "../components/css/Formulario.css";

export function CadastroEmpresa() {
    const [
        nome,
        setNome,
    ] = useState("");

    const [
        email,
        setEmail,
    ] = useState("");

    const [
        senha,
        setSenha,
    ] = useState("");

    const [
        telefone,
        setTelefone,
    ] = useState("");

    const [
        mensagem,
        setMensagem,
    ] = useState("");

    const [
        carregando,
        setCarregando,
    ] = useState(false);

    async function cadastrarEmpresa(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (carregando) {
            return;
        }

        setMensagem("");
        setCarregando(true);

        try {
            await api.post(
                "empresa/cadastro",
                {
                    nome,
                    email,
                    senha,
                    telefone,
                }
            );

            setMensagem(
                "Cadastro realizado com sucesso."
            );

            setNome("");
            setEmail("");
            setSenha("");
            setTelefone("");
        } catch (erro: any) {
            console.error(
                "Erro ao cadastrar empresa:",
                erro
            );

            setMensagem(
                erro.response?.data?.erro ??
                "Não foi possível concluir o cadastro."
            );
        } finally {
            setCarregando(false);
        }
    }

    return (
        <main className="pagina-login">
            <form
                className="formulario-login"
                onSubmit={cadastrarEmpresa}
            >
                <header className="formulario-login__cabecalho">
                    <h1>
                        Criar conta
                    </h1>

                    <p>
                        Cadastre sua empresa e comece a utilizar o sistema de agendamentos.
                    </p>
                </header>

                <div className="formulario-login__campo">
                    <label htmlFor="nome">
                        Nome da empresa
                    </label>

                    <input
                        id="nome"
                        type="text"
                        placeholder="Digite o nome da empresa"
                        value={nome}
                        onChange={(event) =>
                            setNome(
                                event.target.value
                            )
                        }
                        required
                    />
                </div>

                <div className="formulario-login__campo">
                    <label htmlFor="email">
                        E-mail
                    </label>

                    <input
                        id="email"
                        type="email"
                        placeholder="Digite seu e-mail"
                        value={email}
                        onChange={(event) =>
                            setEmail(
                                event.target.value
                            )
                        }
                        required
                    />
                </div>

                <div className="formulario-login__campo">
                    <label htmlFor="telefone">
                        Telefone / WhatsApp
                    </label>

                    <input
                        id="telefone"
                        type="text"
                        placeholder="(11) 99999-9999"
                        value={telefone}
                        onChange={(event) =>
                            setTelefone(
                                event.target.value
                            )
                        }
                    />
                </div>

                <div className="formulario-login__campo">
                    <label htmlFor="senha">
                        Senha
                    </label>

                    <input
                        id="senha"
                        type="password"
                        placeholder="Crie uma senha"
                        value={senha}
                        onChange={(event) =>
                            setSenha(
                                event.target.value
                            )
                        }
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="formulario-login__botao"
                    disabled={carregando}
                >
                    {carregando
                        ? "Cadastrando..."
                        : "Criar conta"}
                </button>

                {mensagem && (
                    <p className="formulario-login__mensagem">
                        {mensagem}
                    </p>
                )}

                <footer className="formulario-login__rodape">
                    <span>
                        Já possui uma conta?
                    </span>

                    <Link to="/login">
                        Entrar
                    </Link>
                    <br />
                    <Link to="/">Voltar</Link>
                </footer>
            </form>
        </main>
    );
}