import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../services/api";
import { verificarSessao } from "../utils/auth";

type Plano = {
    id: number;
    nome: string;
    preco: string;
    limiteAgendamentos: number;
};

type AcaoAssinatura =
    | "AGENDADO_APOS_TRIAL"
    | "ESCOLHER_INICIO"
    | "DOWNGRADE_AGENDADO"
    | "UPGRADE"
    | "NOVA_ASSINATURA";

type RespostaAssinatura = {
    acao?: AcaoAssinatura;
    erro?: string;
};

export default function Planos() {
    const navigate = useNavigate();

    const [planos, setPlanos] =
        useState<Plano[]>([]);

    const [carregando, setCarregando] =
        useState(true);

    const [processandoPlanoId, setProcessandoPlanoId] =
        useState<number | null>(null);

    useEffect(() => {
        async function buscarPlanos() {
            try {
                const resposta =
                    await api.get("/planos");

                setPlanos(resposta.data);
            } catch (erro) {
                console.error(
                    "Erro ao buscar planos:",
                    erro
                );
            } finally {
                setCarregando(false);
            }
        }

        buscarPlanos();
    }, []);

    // ==================================================
    // CHECKOUT
    // ==================================================

    async function abrirCheckout(
        planoId: number
    ): Promise<void> {
        const token =
            localStorage.getItem("token");

        if (!token) {
            navigate("/login");
            return;
        }

        const resposta = await api.post(
            "/assinatura/checkout",
            {
                planoId
            },
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

        const checkoutUrl =
            resposta.data.checkoutUrl;

        if (!checkoutUrl) {
            throw new Error(
                "URL do checkout não recebida"
            );
        }

        /*
         * Essa URL agora é o init_point da assinatura
         * individual criada no backend, e não mais
         * o init_point genérico do plano.
         */
        window.location.href = checkoutUrl;
    }

    // ==================================================
    // SELEÇÃO DE PLANO
    // ==================================================

    async function assinarPlano(
        planoId: number
    ): Promise<void> {
        if (!verificarSessao()) {
            navigate("/cadastro");
            return;
        }

        const token =
            localStorage.getItem("token");

        if (!token) {
            navigate("/login");
            return;
        }

        try {
            setProcessandoPlanoId(planoId);

            const resposta =
                await api.post<RespostaAssinatura>(
                    "/assinatura/criar",
                    {
                        planoId
                    },
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );

            const dados = resposta.data;

            switch (dados.acao) {
                case "AGENDADO_APOS_TRIAL":
                    alert(
                        "Plano escolhido! Ele ficou agendado para após o período gratuito."
                    );
                    break;

                case "ESCOLHER_INICIO":
                    /*
                     * Seu backend já diferencia esse caso,
                     * mas o modal "agora ou após o trial"
                     * ainda não existe.
                     *
                     * Por enquanto, mantemos o comportamento
                     * original sem cobrar automaticamente.
                     */
                    alert(
                        "Você pode ativar esse plano agora ou após o período gratuito. A escolha de início ainda precisa ser implementada."
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
                    console.error(
                        "Ação desconhecida:",
                        dados
                    );

                    alert(
                        dados.erro ||
                            "Não foi possível selecionar o plano."
                    );
            }
        } catch (erro: any) {
            console.error(
                "Erro ao selecionar plano:",
                erro
            );

            alert(
                erro.response?.data?.erro ||
                    "Não foi possível iniciar a assinatura."
            );
        } finally {
            setProcessandoPlanoId(null);
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
                        R${" "}
                        {Number(plano.preco)
                            .toFixed(2)
                            .replace(".", ",")}
                        /mês
                    </p>

                    <p>
                        Até{" "}
                        {plano.limiteAgendamentos}{" "}
                        agendamentos por mês
                    </p>

                    <button
                        disabled={
                            processandoPlanoId !== null
                        }
                        onClick={() =>
                            assinarPlano(plano.id)
                        }
                    >
                        {processandoPlanoId ===
                        plano.id
                            ? "Processando..."
                            : `Assinar ${plano.nome}`}
                    </button>
                </div>
            ))}
        </main>
    );
}