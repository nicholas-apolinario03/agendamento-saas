import {
    Link,
} from "react-router-dom";

import FeatureCard from "./FeatureCard";


import imagemAgenda from
    "../../assets/home/agenda.jpg";

import imagemLembretes from
    "../../assets/home/lembretes.jpg"

import imagemCalendario from
    "../../assets/home/calendario.jpg";

import imagemDashboard from
    "../../assets/home/dashboard.jpg";

import "./css/Hero.css"; 

export default function Hero() {
    return (
        <main className="home-principal">
            <section className="hero">
                

                <div className="hero__conteudo">
                    <span className="hero__etiqueta">
                        Agendamentos simples e organizados
                    </span>

                    <h1 className="hero__titulo">
                        Sua agenda funcionando sozinha.
                    </h1>

                    <p className="hero__descricao">
                        Receba agendamentos online,
                        envie confirmações
                        automaticamente e mantenha seus
                        clientes sempre informados.
                    </p>

                    <div className="hero__acoes">
                        <Link
                            to="/cadastro"
                            className="hero__botao-principal"
                        >
                            Começar gratuitamente
                        </Link>

                        <a
                            href="#recursos"
                            className="hero__botao-secundario"
                        >
                            Conhecer recursos
                        </a>
                    </div>
                </div>
            </section>

            <section
                id="recursos"
                className="recursos"
            >
                <header className="recursos__cabecalho">
                    <span className="recursos__etiqueta">
                        Recursos
                    </span>

                    <h2 className="recursos__titulo">
                        Tudo o que você precisa em uma
                        única plataforma
                    </h2>

                    <p className="recursos__descricao">
                        Organize atendimentos,
                        acompanhe clientes e automatize
                        tarefas do dia a dia em uma
                        plataforma simples e intuitiva.
                    </p>
                </header>

                <div className="recursos__lista">
                    <FeatureCard
                        titulo={
                            "Organize seus horários sem esforço"
                        }
                        descricao={
                            "Defina horários disponíveis, bloqueie períodos ocupados e permita que seus clientes agendem online sem conflitos."
                        }
                        imagem={
                            imagemAgenda
                        }
                        imagemAlt={
                            "Calendário de agendamentos com horários disponíveis e ocupados"
                        }
                    />

                    <FeatureCard
                        titulo={
                            "Reduza faltas com lembretes automáticos"
                        }
                        descricao={
                            "Envie confirmações, lembretes e atualizações automaticamente por e-mail, reduzindo faltas e economizando tempo."
                        }
                        imagem={
                            imagemLembretes
                        }
                        imagemAlt={
                            "Exemplo de lembrete automático enviado ao cliente"
                        }
                        inverter
                    />

                    <FeatureCard
                        titulo={
                            "Adicione compromissos com um clique"
                        }
                        descricao={
                            "Permita que seus clientes adicionem o atendimento ao Google Calendar, Outlook ou Apple Calendar diretamente pelo e-mail de confirmação."
                        }
                        imagem={
                            imagemCalendario
                        }
                        imagemAlt={
                            "Opção para adicionar compromisso ao calendário do cliente"
                        }
                    />

                    <FeatureCard
                        titulo={
                            "Tenha controle total do seu negócio"
                        }
                        descricao={
                            "Visualize agendamentos, acompanhe indicadores e gerencie profissionais e serviços em uma única plataforma."
                        }
                        imagem={
                            imagemDashboard
                        }
                        imagemAlt={
                            "Painel administrativo com agendamentos e indicadores"
                        }
                        inverter
                    />
                </div>
            </section>
        </main>
    );
}