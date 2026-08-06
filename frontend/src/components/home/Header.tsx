import {
    Link,
} from "react-router-dom";
import "./css/Header.css"


export default function Header() {
    return (
        <header className="header-principal">
            <div className="header-principal__conteudo">
                <Link
                    to="/"
                    className="header-principal__marca"
                >
                    New Horizon
                </Link>

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
            </div>
        </header>
    );
}