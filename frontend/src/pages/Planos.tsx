import {
    useEffect,
    useRef,
    useState
} from "react";

import { useNavigate } from "react-router-dom";
import { loadMercadoPago } from "@mercadopago/sdk-js";

import { api } from "../services/api";
import { verificarSessao } from "../utils/auth";

declare global {
    interface Window {
        MercadoPago: any;
    }
}

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
    | "UPGRADE_REALIZADO"
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

    const [planoPagamento, setPlanoPagamento] =
        useState<Plano | null>(null);

    const [mensagemPagamento, setMensagemPagamento] =
        useState("");

    const cardFormRef =
        useRef<any>(null);

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
    // MERCADO PAGO CARD FORM
    // ==================================================

    useEffect(() => {
        if (!planoPagamento) {
            return;
        }

        const planoSelecionado = planoPagamento;

        let cancelado = false;

        async function iniciarMercadoPago() {
            try {
                setMensagemPagamento("");

                const publicKey =
                    import.meta.env
                        .VITE_MERCADO_PAGO_PUBLIC_KEY;

                if (!publicKey) {
                    throw new Error(
                        "VITE_MERCADO_PAGO_PUBLIC_KEY não configurada"
                    );
                }

                await loadMercadoPago();

                if (
                    cancelado ||
                    !window.MercadoPago
                ) {
                    return;
                }

                const mp =
                    new window.MercadoPago(
                        publicKey,
                        {
                            locale: "pt-BR"
                        }
                    );

                cardFormRef.current =
                    mp.cardForm({
                        amount:
                            String(
                                Number(
                                    planoSelecionado.preco
                                )
                            ),

                        iframe: true,

                        form: {
                            id:
                                "form-checkout",

                            cardNumber: {
                                id:
                                    "form-checkout__cardNumber",
                                placeholder:
                                    "Número do cartão"
                            },

                            expirationDate: {
                                id:
                                    "form-checkout__expirationDate",
                                placeholder:
                                    "MM/AA"
                            },

                            securityCode: {
                                id:
                                    "form-checkout__securityCode",
                                placeholder:
                                    "CVV"
                            },

                            cardholderName: {
                                id:
                                    "form-checkout__cardholderName",
                                placeholder:
                                    "Nome como está no cartão"
                            },

                            issuer: {
                                id:
                                    "form-checkout__issuer",
                                placeholder:
                                    "Banco emissor"
                            },

                            installments: {
                                id:
                                    "form-checkout__installments",
                                placeholder:
                                    "Parcelas"
                            },

                            identificationType: {
                                id:
                                    "form-checkout__identificationType",
                                placeholder:
                                    "Tipo de documento"
                            },

                            identificationNumber: {
                                id:
                                    "form-checkout__identificationNumber",
                                placeholder:
                                    "CPF"
                            },

                            cardholderEmail: {
                                id:
                                    "form-checkout__cardholderEmail",
                                placeholder:
                                    "E-mail"
                            }
                        },

                        callbacks: {
                            onFormMounted: (
                                error: any
                            ) => {
                                if (error) {
                                    console.error(
                                        "Erro ao montar CardForm:",
                                        error
                                    );

                                    setMensagemPagamento(
                                        "Não foi possível carregar o formulário de pagamento."
                                    );
                                }
                            },

                            onSubmit: async (
                                event: Event
                            ) => {
                                event.preventDefault();

                                const submit =
                                    document.getElementById(
                                        "form-checkout__submit"
                                    ) as HTMLButtonElement | null;

                                try {
                                    if (submit) {
                                        submit.disabled =
                                            true;
                                    }

                                    setMensagemPagamento(
                                        "Processando assinatura..."
                                    );

                                    const dados =
                                        cardFormRef.current
                                            .getCardFormData();

                                    const cardTokenId =
                                        dados.token;

                                    if (!cardTokenId) {
                                        throw new Error(
                                            "Mercado Pago não gerou o token do cartão"
                                        );
                                    }

                                    const token =
                                        localStorage.getItem(
                                            "token"
                                        );

                                    if (!token) {
                                        navigate(
                                            "/login"
                                        );
                                        return;
                                    }

                                    const resposta =
                                        await api.post(
                                            "/assinatura/checkout",
                                            {
                                                planoId:
                                                    planoSelecionado.id,

                                                /*
                                                 * ÚNICO dado relacionado ao
                                                 * cartão enviado ao backend.
                                                 */
                                                cardTokenId
                                            },
                                            {
                                                headers: {
                                                    Authorization:
                                                        `Bearer ${token}`
                                                }
                                            }
                                        );

                                    if (
                                        resposta.data
                                            ?.status ===
                                        "authorized"
                                    ) {
                                        setMensagemPagamento(
                                            "Assinatura ativada com sucesso!"
                                        );

                                        setTimeout(() => {
                                            navigate(
                                                "/dashboard"
                                            );
                                        }, 1200);

                                        return;
                                    }

                                    setMensagemPagamento(
                                        "Assinatura criada. Aguardando confirmação do Mercado Pago."
                                    );
                                } catch (erro: any) {
                                    console.error(
                                        "Erro no pagamento:",
                                        erro
                                    );

                                    setMensagemPagamento(
                                        erro.response
                                            ?.data
                                            ?.erro ||
                                        erro.message ||
                                        "Não foi possível criar a assinatura."
                                    );

                                    /*
                                     * CardToken é de uso único.
                                     * Em caso de falha na criação da
                                     * assinatura, o usuário deve enviar
                                     * novamente o formulário para que
                                     * o SDK gere um novo token.
                                     */
                                } finally {
                                    if (submit) {
                                        submit.disabled =
                                            false;
                                    }
                                }
                            },

                            onFetching: () => {
                                const progress =
                                    document.querySelector(
                                        ".progress-bar"
                                    ) as HTMLProgressElement | null;

                                if (progress) {
                                    progress.removeAttribute(
                                        "value"
                                    );
                                }

                                return () => {
                                    if (progress) {
                                        progress.setAttribute(
                                            "value",
                                            "0"
                                        );
                                    }
                                };
                            }
                        }
                    });
            } catch (erro) {
                console.error(
                    "Erro ao iniciar Mercado Pago:",
                    erro
                );

                setMensagemPagamento(
                    "Não foi possível carregar o Mercado Pago."
                );
            }
        }

        iniciarMercadoPago();

        return () => {
            cancelado = true;
            cardFormRef.current = null;
        };
    }, [
        planoPagamento,
        navigate
    ]);

    // ==================================================
    // SELEÇÃO DO PLANO
    // ==================================================

    async function assinarPlano(
        plano: Plano
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
            setProcessandoPlanoId(
                plano.id
            );

            const resposta =
                await api.post<RespostaAssinatura>(
                    "/assinatura/criar",
                    {
                        planoId:
                            plano.id
                    },
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );

            const dados =
                resposta.data;

            switch (dados.acao) {
                case "AGENDADO_APOS_TRIAL":
                    alert(
                        "Plano escolhido! Ele ficou agendado para após o período gratuito."
                    );
                    break;

                case "ESCOLHER_INICIO": {
                    const ativarAgora =
                        window.confirm(
                            "Deseja ativar esse plano agora? Ao continuar, o Mercado Pago solicitará os dados do cartão e a assinatura começará imediatamente."
                        );

                    if (ativarAgora) {
                        setPlanoPagamento(
                            plano
                        );
                    }
                    break;
                }

                case "DOWNGRADE_AGENDADO":
                    alert(
                        "Seu novo plano será aplicado no próximo ciclo."
                    );
                    break;

                case "UPGRADE":
                    /*
                     * Compatibilidade com resposta antiga.
                     * O backend atualizado já executa o upgrade
                     * e retorna UPGRADE_REALIZADO.
                     */
                    alert(
                        "Não foi possível concluir o upgrade automaticamente. Atualize a página e tente novamente."
                    );
                    break;

                case "UPGRADE_REALIZADO":
                    alert(
                        "Upgrade realizado com sucesso! O novo plano já está disponível."
                    );

                    navigate(
                        "/dashboard"
                    );
                    break;

                case "NOVA_ASSINATURA":
                    setPlanoPagamento(
                        plano
                    );
                    break;

                default:
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
                    "Não foi possível selecionar o plano."
            );
        } finally {
            setProcessandoPlanoId(
                null
            );
        }
    }

    if (carregando) {
        return (
            <p>
                Carregando planos...
            </p>
        );
    }

    return (
        <main>
            <h1>
                Escolha seu plano
            </h1>

            {planos.map((plano) => (
                <div key={plano.id}>
                    <h2>
                        {plano.nome}
                    </h2>

                    <p>
                        R${" "}
                        {Number(
                            plano.preco
                        )
                            .toFixed(2)
                            .replace(
                                ".",
                                ","
                            )}
                        /mês
                    </p>

                    <p>
                        Até{" "}
                        {
                            plano.limiteAgendamentos
                        }{" "}
                        agendamentos por mês
                    </p>

                    <button
                        disabled={
                            processandoPlanoId !==
                            null
                        }
                        onClick={() =>
                            assinarPlano(
                                plano
                            )
                        }
                    >
                        {processandoPlanoId ===
                        plano.id
                            ? "Processando..."
                            : `Assinar ${plano.nome}`}
                    </button>
                </div>
            ))}

            {planoPagamento && (
                <section>
                    <hr />

                    <h2>
                        Pagamento —{" "}
                        {
                            planoPagamento.nome
                        }
                    </h2>

                    <p>
                        R${" "}
                        {Number(
                            planoPagamento.preco
                        )
                            .toFixed(2)
                            .replace(
                                ".",
                                ","
                            )}
                        /mês
                    </p>

                    <p>
                        Os dados sensíveis do
                        cartão são processados
                        pelo Mercado Pago.
                    </p>

                    <form
                        id="form-checkout"
                    >
                        <label>
                            Número do cartão
                        </label>
                        <div
                            id="form-checkout__cardNumber"
                            className="container"
                            style={{
                                minHeight:
                                    "38px"
                            }}
                        />

                        <label>
                            Validade
                        </label>
                        <div
                            id="form-checkout__expirationDate"
                            className="container"
                            style={{
                                minHeight:
                                    "38px"
                            }}
                        />

                        <label>
                            CVV
                        </label>
                        <div
                            id="form-checkout__securityCode"
                            className="container"
                            style={{
                                minHeight:
                                    "38px"
                            }}
                        />

                        <label>
                            Nome no cartão
                        </label>
                        <input
                            type="text"
                            id="form-checkout__cardholderName"
                        />

                        <label>
                            Banco emissor
                        </label>
                        <select
                            id="form-checkout__issuer"
                        />

                        <label>
                            Parcelas
                        </label>
                        <select
                            id="form-checkout__installments"
                        />

                        <label>
                            Documento
                        </label>
                        <select
                            id="form-checkout__identificationType"
                        />

                        <input
                            type="text"
                            id="form-checkout__identificationNumber"
                            placeholder="CPF"
                        />

                        <label>
                            E-mail
                        </label>
                        <input
                            type="email"
                            id="form-checkout__cardholderEmail"
                        />

                        <button
                            type="submit"
                            id="form-checkout__submit"
                        >
                            Confirmar assinatura
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setPlanoPagamento(
                                    null
                                );
                                setMensagemPagamento(
                                    ""
                                );
                            }}
                        >
                            Cancelar
                        </button>

                        <progress
                            value="0"
                            className="progress-bar"
                        >
                            Carregando...
                        </progress>
                    </form>

                    {mensagemPagamento && (
                        <p>
                            {
                                mensagemPagamento
                            }
                        </p>
                    )}
                </section>
            )}
        </main>
    );
}