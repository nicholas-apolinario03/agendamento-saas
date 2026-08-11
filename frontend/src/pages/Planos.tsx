import { useEffect, useState } from "react";
import { api } from "../services/api";
import { verificarSessao } from "../utils/auth";
import { useNavigate } from "react-router-dom";

type Plano = {
    id: number;
    nome: string;
    preco: string;
    limiteAgendamentos: number;
};

export default function Planos() {
    const navigate = useNavigate();
    const [planos, setPlanos] = useState<Plano[]>([]);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        async function buscarPlanos() {
            try {
                const resposta = await api.get("/planos");

                setPlanos(resposta.data);

            } catch (erro) {
                console.error("Erro ao buscar planos:", erro);

            } finally {
                setCarregando(false);
            }
        }

        buscarPlanos();
    }, []);
    async function abrirCheckout(planoId: number): Promise<void> {
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/login");
            return;
        }

        try {
            const resposta = await api.post(
                "/assinatura/checkout",
                {
                    planoId
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const checkoutUrl = resposta.data.checkoutUrl;

            if (!checkoutUrl) {
                alert("Não foi possível iniciar o pagamento.");
                return;
            }

            window.location.href = checkoutUrl;

        } catch (erro) {
            console.error("Erro ao abrir checkout:", erro);
            alert("Não foi possível iniciar o pagamento.");
        }
    }


    async function assinarPlano(planoId: number): Promise<void> {
        if (!verificarSessao()) {
            navigate("/cadastro");
            return;
        }

        const token = localStorage.getItem("token");

        try {
            const resposta = await api.post(
                "/assinatura/criar",
                {
                    planoId
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const dados = resposta.data;

            switch (dados.acao) {

                case "AGENDADO_APOS_TRIAL":
                    alert(
                        "Plano escolhido! A assinatura começará após o fim do período gratuito."
                    );
                    break;

                case "ESCOLHER_INICIO":
                    // Depois faremos o modal:
                    // "Ativar agora" ou "Após o trial"
                    alert(
                        "Você pode ativar esse plano agora ou após o período gratuito."
                    );
                    break;

                case "DOWNGRADE_AGENDADO":
                    alert(
                        "Seu novo plano será aplicado no próximo ciclo."
                    );
                    break;

                case "UPGRADE":
                    await abrirCheckout(planoId);
                    break;

                case "NOVA_ASSINATURA":
                    await abrirCheckout(planoId);
                    break;

                default:
                    console.log("Ação desconhecida:", dados);
            }

        } catch (erro) {
            console.error("Erro ao selecionar plano:", erro);
        }
    }
    if (carregando) {
        return <p>Carregando planos...</p>;
    }

    return (
        <main>
            <h1>Escolha seu plano</h1>

            {planos.map((plano) => (
                <div key={plano.id}>
                    <h2>{plano.nome}</h2>

                    <p>
                        R$ {Number(plano.preco).toFixed(2).replace(".", ",")}
                        /mês
                    </p>

                    <p>
                        Até {plano.limiteAgendamentos} agendamentos por mês
                    </p>

                    <button onClick={() => assinarPlano(plano.id)}>
                        Assinar {plano.nome}
                    </button>
                </div>
            ))}
        </main>
    );
}