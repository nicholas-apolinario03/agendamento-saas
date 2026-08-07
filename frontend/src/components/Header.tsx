import { Link,useNavigate,} from "react-router-dom";

import "./css/Header.css";

export default function Header() {
    const navigate =
        useNavigate();

    const token =
        localStorage.getItem(
            "token"
        );

    const logado =
        Boolean(token);

    function sair() {
        localStorage.removeItem(
            "token"
        );

        navigate(
            "/login"
        );

        window.location.reload();
    }

    return (
        <header className="header-principal">
            <div className="header-principal__conteudo">
                <Link
                    to="/"
                    className="header-principal__logo"
                >
                    New Horizon
                </Link>

                {logado ? (
                    <nav
                        className="header-principal__navegacao"
                        aria-label="Navegação principal"
                    >
                        <Link
                            to="/agendamento"
                            className="header-principal__link"
                        >
                            Calendário
                        </Link>

                        <Link
                            to="/dashboard"
                            className="header-principal__link"
                        >
                            Perfil
                        </Link>

                        <button
                            type="button"
                            className="header-principal__link header-principal__sair"
                            onClick={sair}
                        >
                            Sair
                        </button>
                    </nav>
                ) : (
                    <nav
                        className="header-principal__navegacao"
                        aria-label="Navegação principal"
                    >
                        <a
                            href="#sobre"
                            className="header-principal__link"
                        >
                            Sobre
                        </a>

                        <a
                            href="#recursos"
                            className="header-principal__link"
                        >
                            Recursos
                        </a>

                        <Link
                            to="/login" 
                            className="header-principal__link"
                        >
                            Entrar
                        </Link>

                        <Link
                            to="/cadastro"
                            className="header-principal__botao"
                        >
                            Começar
                        </Link>
                    </nav>
                )}
            </div>
        </header>
    );
}