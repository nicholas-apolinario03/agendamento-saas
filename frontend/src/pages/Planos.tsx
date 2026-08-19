import {
    useEffect,
    useRef,
    useState
} from "react";
import Header from "../components/Header";
import {
    useNavigate
} from "react-router-dom";
import "../components/css/Planos.css"
import {
    loadMercadoPago
} from "@mercadopago/sdk-js";

import {
    api
} from "../services/api";

import {
    verificarSessao
} from "../utils/auth";

declare global {
    interface Window {
        MercadoPago: any;
        MP_DEVICE_SESSION_ID?: string;
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
    | "UPGRADE_PAGAMENTO"
    | "NOVA_ASSINATURA";

type RespostaAssinatura = {
    acao?: AcaoAssinatura;
    erro?: string;

    valorProporcional?: number;
    fimCiclo?: string;

    planoAtual?: {
        id: number;
        nome: string;
        preco: number;
    };

    planoNovo?: {
        id: number;
        nome: string;
        preco: number;
    };
};

type PagamentoPendente = {
    tipo:
    | "NOVA_ASSINATURA"
    | "UPGRADE";

    plano: Plano;

    valor: number;

    fimCiclo?: string;
};

export default function Planos() {
    const navigate =
        useNavigate();

    const [
        planos,
        setPlanos
    ] = useState<Plano[]>([]);

    const [
        carregando,
        setCarregando
    ] = useState(true);

    const [
        processandoPlanoId,
        setProcessandoPlanoId
    ] = useState<
        number | null
    >(null);

    const [
        pagamentoPendente,
        setPagamentoPendente
    ] = useState<
        PagamentoPendente | null
    >(null);

    const [
        mensagemPagamento,
        setMensagemPagamento
    ] = useState("");

    const cardFormRef =
        useRef<any>(null);

    // ==================================================
    // PLANOS
    // ==================================================

    useEffect(() => {
        async function buscarPlanos() {
            try {
                const resposta =
                    await api.get(
                        "/planos"
                    );

                setPlanos(
                    resposta.data
                );

            } catch (erro) {
                console.error(
                    "Erro ao buscar planos:",
                    erro
                );

            } finally {
                setCarregando(
                    false
                );
            }
        }

        buscarPlanos();
    }, []);

    // ==================================================
    // CARDFORM MERCADO PAGO
    // ==================================================

    useEffect(() => {
        /*
         * Nova assinatura não usa mais CardForm.
         * O formulário local fica somente para o
         * pagamento proporcional do upgrade.
         */
        if (
            !pagamentoPendente ||
            pagamentoPendente.tipo !==
                "UPGRADE"
        ) {
            return;
        }

        const pagamento =
            pagamentoPendente;

        let cancelado =
            false;

        async function iniciarMercadoPago() {
            try {
                setMensagemPagamento(
                    ""
                );

                /*
                 * A assinatura usa a Public Key que já funciona
                 * com o fluxo /preapproval.
                 *
                 * A cobrança proporcional do upgrade usa a
                 * Public Key correspondente ao Access Token
                 * com escopo payment.
                 */
                const publicKey =
                    pagamento.tipo ===
                        "UPGRADE"
                        ? (
                            import.meta.env
                                .VITE_MERCADO_PAGO_PAYMENT_PUBLIC_KEY ||
                            import.meta.env
                                .VITE_MERCADO_PAGO_PUBLIC_KEY
                        )
                        : import.meta.env
                            .VITE_MERCADO_PAGO_PUBLIC_KEY;

                if (!publicKey) {
                    throw new Error(
                        pagamento.tipo === "UPGRADE"
                            ? "VITE_MERCADO_PAGO_PAYMENT_PUBLIC_KEY não configurada"
                            : "VITE_MERCADO_PAGO_PUBLIC_KEY não configurada"
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
                            locale:
                                "pt-BR"
                        }
                    );

                cardFormRef.current =
                    mp.cardForm({
                        /*
                         * Para nova assinatura:
                         * valor integral do plano.
                         *
                         * Para upgrade:
                         * somente diferença proporcional.
                         */
                        amount:
                            String(
                                pagamento.valor
                            ),

                        iframe:
                            true,

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

                            onSubmit:
                                async (
                                    event: Event
                                ) => {
                                    event.preventDefault();

                                    const botao =
                                        document.getElementById(
                                            "form-checkout__submit"
                                        ) as HTMLButtonElement | null;

                                    try {
                                        if (botao) {
                                            botao.disabled =
                                                true;
                                        }

                                        setMensagemPagamento(
                                            pagamento.tipo ===
                                                "UPGRADE"
                                                ? "Processando cobrança proporcional..."
                                                : "Processando assinatura..."
                                        );

                                        const dados =
                                            cardFormRef.current
                                                .getCardFormData();

                                        /*
                                         * O SDK JS do Mercado Pago coleta
                                         * o Device ID automaticamente.
                                         *
                                         * Enviamos esse identificador ao
                                         * backend para melhorar a análise
                                         * antifraude.
                                         */
                                        const deviceId =
                                            window
                                                .MP_DEVICE_SESSION_ID;

                                        const cardTokenId =
                                            dados.token;

                                        const paymentMethodId =
                                            dados.paymentMethodId;

                                        const installments =
                                            Number(
                                                dados.installments ||
                                                1
                                            );

                                        const issuerId =
                                            dados.issuerId;

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

                                        if (
                                            pagamento.tipo ===
                                            "UPGRADE"
                                        ) {
                                            if (
                                                !paymentMethodId
                                            ) {
                                                throw new Error(
                                                    "Mercado Pago não informou o meio de pagamento"
                                                );
                                            }

                                            const resposta =
                                                await api.post(
                                                    "/assinatura/upgrade",

                                                    {
                                                        planoId:
                                                            pagamento
                                                                .plano
                                                                .id,

                                                        cardTokenId,

                                                        paymentMethodId,

                                                        installments,

                                                        issuerId,

                                                        deviceId
                                                    },

                                                    {
                                                        headers: {
                                                            Authorization:
                                                                `Bearer ${token}`
                                                        }
                                                    }
                                                );

                                            setMensagemPagamento(
                                                `Upgrade realizado! Foi cobrado R$ ${Number(
                                                    resposta.data
                                                        .valorCobrado
                                                )
                                                    .toFixed(
                                                        2
                                                    )
                                                    .replace(
                                                        ".",
                                                        ","
                                                    )} referente ao restante do ciclo.`
                                            );

                                            setTimeout(
                                                () => {
                                                    navigate(
                                                        "/dashboard"
                                                    );
                                                },
                                                1500
                                            );

                                            return;
                                        }

                                        const resposta =
                                            await api.post(
                                                "/assinatura/checkout",

                                                {
                                                    planoId:
                                                        pagamento
                                                            .plano
                                                            .id,

                                                    cardTokenId,

                                                    deviceId
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

                                            setTimeout(
                                                () => {
                                                    navigate(
                                                        "/dashboard"
                                                    );
                                                },
                                                1200
                                            );

                                            return;
                                        }

                                        setMensagemPagamento(
                                            "Assinatura criada. Aguardando confirmação do Mercado Pago."
                                        );

                                    } catch (
                                    erro: any
                                    ) {
                                        console.error(
                                            "Erro no pagamento:",
                                            erro
                                        );

                                        setMensagemPagamento(
                                            erro.response
                                                ?.data
                                                ?.erro ||
                                            erro.message ||
                                            "Não foi possível processar o pagamento."
                                        );

                                    } finally {
                                        if (botao) {
                                            botao.disabled =
                                                false;
                                        }
                                    }
                                },

                            onFetching:
                                () => {
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
            cancelado =
                true;

            cardFormRef.current =
                null;
        };

    }, [
        pagamentoPendente,
        navigate
    ]);

    // ==================================================
    // CHECKOUT HOSPEDADO MERCADO PAGO
    // ==================================================

    async function abrirCheckoutHospedado(
        plano: Plano,
        token: string
    ) {
        const resposta =
            await api.post(
                "/assinatura/checkout",

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

        const initPoint =
            resposta.data
                ?.initPoint;

        if (
            !initPoint ||
            typeof initPoint !==
                "string"
        ) {
            throw new Error(
                "Mercado Pago não retornou o link do checkout."
            );
        }

        /*
         * A partir daqui o cartão e os meios de
         * pagamento são tratados no ambiente do MP.
         */
        window.location.href =
            initPoint;
    }


    // ==================================================
    // ESCOLHER PLANO
    // ==================================================

    async function assinarPlano(
        plano: Plano
    ): Promise<void> {
        if (!verificarSessao()) {
            navigate(
                "/cadastro"
            );

            return;
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

            switch (
            dados.acao
            ) {
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
                        await abrirCheckoutHospedado(
                            plano,
                            token
                        );

                        return;
                    }

                    break;
                }

                case "DOWNGRADE_AGENDADO":
                    alert(
                        "Downgrade agendado. Seu plano atual continua até o fim do ciclo e o plano menor entra na próxima renovação."
                    );
                    break;

                case "UPGRADE_PAGAMENTO": {
                    const valor =
                        Number(
                            dados.valorProporcional ||
                            0
                        );

                    const dataFim =
                        dados.fimCiclo
                            ? new Date(
                                dados.fimCiclo
                            ).toLocaleDateString(
                                "pt-BR"
                            )
                            : "fim do ciclo atual";

                    const confirmar =
                        window.confirm(
                            `O upgrade será liberado imediatamente. Será cobrada agora a diferença proporcional de R$ ${valor
                                .toFixed(2)
                                .replace(
                                    ".",
                                    ","
                                )}. A próxima renovação será de R$ ${Number(
                                    plano.preco
                                )
                                    .toFixed(2)
                                    .replace(
                                        ".",
                                        ","
                                    )} em ${dataFim}. Deseja continuar?`
                        );

                    if (confirmar) {
                        setPagamentoPendente({
                            tipo:
                                "UPGRADE",

                            plano,

                            valor,

                            fimCiclo:
                                dados.fimCiclo
                        });
                    }

                    break;
                }

                case "NOVA_ASSINATURA":
                    await abrirCheckoutHospedado(
                        plano,
                        token
                    );

                    return;

                default:
                    alert(
                        dados.erro ||
                        "Não foi possível selecionar o plano."
                    );
            }

        } catch (
        erro: any
        ) {
            console.error(
                "Erro ao selecionar plano:",
                erro
            );

            alert(
                erro.response
                    ?.data
                    ?.erro ||
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
        <div>
            <Header></Header>
            <main className="pagina-planos">

                <div className="pagina-planos__conteudo">

                    <div className="pagina-planos__cabecalho">
                        <h1>
                            Escolha seu plano
                        </h1>

                        <p>
                            Escolha o plano que melhor atende
                            às necessidades da sua empresa.
                        </p>
                    </div>

                    <div className="grid-planos">
                        {planos.map((plano) => (
                            <div
                                className="card-plano"
                                key={plano.id}
                            >
                                <h2>
                                    {plano.nome}
                                </h2>

                                <p className="card-plano__preco">
                                    <strong>
                                        R${" "}
                                        {Number(plano.preco)
                                            .toFixed(2)
                                            .replace(".", ",")}
                                    </strong>

                                    <span>
                                        /mês
                                    </span>
                                </p>

                                <p className="card-plano__limite">
                                    Até{" "}
                                    <strong>
                                        {
                                            plano.limiteAgendamentos
                                        }
                                    </strong>{" "}
                                    agendamentos por mês
                                </p>

                                <button
                                    className="card-plano__botao"
                                    disabled={
                                        processandoPlanoId !== null
                                    }
                                    onClick={() =>
                                        assinarPlano(plano)
                                    }
                                >
                                    {processandoPlanoId ===
                                        plano.id
                                        ? "Processando..."
                                        : `Assinar ${plano.nome}`}
                                </button>
                            </div>
                        ))}
                    </div>

                    {pagamentoPendente && (
                        <section className="pagamento-plano">
                            <hr />

                            <h2>
                                {pagamentoPendente.tipo ===
                                    "UPGRADE"
                                    ? `Upgrade para ${pagamentoPendente.plano.nome}`
                                    : `Pagamento — ${pagamentoPendente.plano.nome}`}
                            </h2>

                            {pagamentoPendente.tipo ===
                                "UPGRADE" ? (
                                <>
                                    <p>
                                        Cobrança proporcional agora:{" "}
                                        <strong>
                                            R${" "}
                                            {Number(
                                                pagamentoPendente.valor
                                            )
                                                .toFixed(2)
                                                .replace(".", ",")}
                                        </strong>
                                    </p>

                                    <p>
                                        Próximas renovações: R${" "}
                                        {Number(
                                            pagamentoPendente
                                                .plano
                                                .preco
                                        )
                                            .toFixed(2)
                                            .replace(".", ",")}
                                        /mês
                                    </p>
                                </>
                            ) : (
                                <p>
                                    R${" "}
                                    {Number(
                                        pagamentoPendente.valor
                                    )
                                        .toFixed(2)
                                        .replace(".", ",")}
                                    /mês
                                </p>
                            )}

                            <p>
                                Os dados sensíveis do cartão
                                são processados pelo Mercado Pago.
                            </p>

                            <form
                                id="form-checkout"
                                className="formulario-pagamento"
                            >
                                <div className="formulario-pagamento__campo">
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
                                </div>

                                <div className="formulario-pagamento__campo">
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
                                </div>

                                <div className="formulario-pagamento__campo">
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
                                </div>

                                <div className="formulario-pagamento__campo">
                                    <label>
                                        Nome no cartão
                                    </label>

                                    <input
                                        type="text"
                                        id="form-checkout__cardholderName"
                                    />
                                </div>

                                <div className="formulario-pagamento__campo">
                                    <label>
                                        Banco emissor
                                    </label>

                                    <select
                                        id="form-checkout__issuer"
                                    />
                                </div>

                                <div className="formulario-pagamento__campo">
                                    <label>
                                        Parcelas
                                    </label>

                                    <select
                                        id="form-checkout__installments"
                                    />
                                </div>

                                <div className="formulario-pagamento__campo">
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
                                </div>

                                <div className="formulario-pagamento__campo">
                                    <label>
                                        E-mail
                                    </label>

                                    <input
                                        type="email"
                                        id="form-checkout__cardholderEmail"
                                    />
                                </div>

                                <button
                                    className="formulario-pagamento__botao"
                                    type="submit"
                                    id="form-checkout__submit"
                                >
                                    {pagamentoPendente.tipo ===
                                        "UPGRADE"
                                        ? "Pagar diferença e fazer upgrade"
                                        : "Confirmar assinatura"}
                                </button>

                                <button
                                    className="formulario-pagamento__botao-secundario"
                                    type="button"
                                    onClick={() => {
                                        setPagamentoPendente(
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
                                <p className="formulario-pagamento__mensagem">
                                    {
                                        mensagemPagamento
                                    }
                                </p>
                            )}
                        </section>
                    )}

                </div>
            </main>
        </div>
    );
}