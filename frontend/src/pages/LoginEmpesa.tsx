import React, {
    useState,
} from "react";

import {
    useNavigate,
    Link,
} from "react-router-dom";

import {
    api,
} from "../services/api";

import "../components/css/Formulario.css";

export function LoginEmpresas() {
    const navigate =
        useNavigate();

    const [
        email,
        setEmail,
    ] = useState("");

    const [
        senha,
        setSenha,
    ] = useState("");

    const [
        mensagem,
        setMensagem,
    ] = useState("");

    const [
        carregando,
        setCarregando,
    ] = useState(false);

    async function loginEmpresa(
        event:
            React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (carregando) {
            return;
        }

        setCarregando(true);
        setMensagem("");

        try {
            const resposta =
                await api.post(
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

            setMensagem(
                "Login concluído com sucesso."
            );

            navigate(
                "/dashboard"
            );
        } catch (erro: any) {
            console.error(
                "Erro ao tentar fazer login:",
                erro
            );

            setMensagem(
                erro.response?.data?.erro ??
                "Não foi possível entrar. Verifique seu e-mail e sua senha."
            );
        } finally {
            setCarregando(false);
        }
    }

    return (
        <main className="pagina-login">
            <form
                className="formulario-login"
                onSubmit={loginEmpresa}
            >
                <header className="formulario-login__cabecalho">
                    <h1>
                        Bem-vindo de volta
                    </h1>

                    <p>
                        Entre com suas credenciais para acessar sua conta.
                    </p>
                </header>

                <div className="formulario-login__campo">
                    <label htmlFor="login-email">
                        E-mail
                    </label>

                    <input
                        id="login-email"
                        type="email"
                        name="email"
                        placeholder="Digite seu e-mail"
                        value={email}
                        onChange={(event) =>
                            setEmail(
                                event.target.value
                            )
                        }
                        autoComplete="email"
                        required
                    />
                </div>

                <div className="formulario-login__campo">
                    <div className="formulario-login__senha-topo">
                        <label htmlFor="login-senha">
                            Senha
                        </label>

                       
                    </div>

                    <input
                        id="login-senha"
                        type="password"
                        name="senha"
                        placeholder="Digite sua senha"
                        value={senha}
                        onChange={(event) =>
                            setSenha(
                                event.target.value
                            )
                        }
                        autoComplete="current-password"
                        required
                    />
                </div>
                 <Link
                            to="/recuperar-senha"
                            className="formulario-login__esqueci"
                        >
                            Esqueci minha senha
                        </Link>

               

                <button
                    type="submit"
                    className="formulario-login__botao"
                    disabled={carregando}
                >
                    {carregando
                        ? "Entrando..."
                        : "Entrar"}
                </button>

                {mensagem && (
                    <p className="formulario-login__mensagem">
                        {mensagem}
                    </p>
                )}

                <footer className="formulario-login__rodape">
                    <span>
                        Ainda não possui uma conta? 
                    </span>

                    <Link to="/cadastro">
                         Criar conta
                    </Link>
                </footer>
            </form>
        </main>
    );
}