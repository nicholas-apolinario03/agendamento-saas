import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import { api } from "../services/api";

type StatusIntegracao = {
    conectado: boolean;
    numeroExibicao?: string | null;
    nomeVerificado?: string | null;
    wabaId?: string | null;
    phoneNumberId?: string | null;
};

type DadosCadastroWhatsApp = {
    wabaId: string;
    phoneNumberId: string;
};

type MensagemEmbeddedSignup = {
    type?: string;
    event?: string;
    data?: {
        waba_id?: string;
        phone_number_id?: string;
    };
};

const META_APP_ID = import.meta.env.VITE_META_APP_ID;
const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID;
const META_GRAPH_VERSION = "v24.0";

function interpretarMensagemMeta(
    valor: unknown
): MensagemEmbeddedSignup | null {
    try {
        if (typeof valor === "string") {
            return JSON.parse(valor) as MensagemEmbeddedSignup;
        }

        if (typeof valor === "object" && valor !== null) {
            return valor as MensagemEmbeddedSignup;
        }

        return null;
    } catch {
        return null;
    }
}

export default function IntegracaoWhatsApp() {
    const [sdkCarregado, setSdkCarregado] = useState(false);
    const [carregandoStatus, setCarregandoStatus] = useState(true);
    const [conectando, setConectando] = useState(false);
    const [desconectando, setDesconectando] = useState(false);

    const [status, setStatus] = useState<StatusIntegracao>({
        conectado: false,
    });

    const [mensagem, setMensagem] = useState("");
    const [erro, setErro] = useState("");

    const codigoRef = useRef<string | null>(null);

    const dadosCadastroRef =
        useRef<DadosCadastroWhatsApp | null>(null);

    const conexaoEnviadaRef = useRef(false);

    const buscarStatus = useCallback(async () => {
        try {
            setCarregandoStatus(true);
            setErro("");

            const resposta = await api.get<StatusIntegracao>(
                "/empresa/whatsapp/status"
            );

            setStatus(resposta.data);
        } catch (error) {
            console.error("Erro ao consultar integração:", error);

            setErro(
                "Não foi possível consultar o status da integração com o WhatsApp."
            );
        } finally {
            setCarregandoStatus(false);
        }
    }, []);

    const concluirConexao = useCallback(async () => {
        const code = codigoRef.current;
        const dadosCadastro = dadosCadastroRef.current;

        if (!code || !dadosCadastro) {
            return;
        }

        if (conexaoEnviadaRef.current) {
            return;
        }

        conexaoEnviadaRef.current = true;

        try {
            setConectando(true);
            setErro("");
            setMensagem("Finalizando a conexão com o WhatsApp...");

            const resposta = await api.post<StatusIntegracao>(
                "/empresa/whatsapp/concluir-conexao",
                {
                    code,
                    wabaId: dadosCadastro.wabaId,
                    phoneNumberId: dadosCadastro.phoneNumberId,
                }
            );

            setStatus({
                ...resposta.data,
                conectado: true,
            });

            setMensagem("WhatsApp conectado com sucesso.");

            codigoRef.current = null;
            dadosCadastroRef.current = null;
        } catch (error) {
            console.error("Erro ao concluir conexão:", error);

            conexaoEnviadaRef.current = false;

            setMensagem("");
            setErro(
                "A Meta concluiu o cadastro, mas não foi possível salvar a integração no sistema."
            );
        } finally {
            setConectando(false);
        }
    }, []);

    useEffect(() => {
        void buscarStatus();
    }, [buscarStatus]);

    useEffect(() => {
        if (!META_APP_ID) {
            setErro(
                "A variável VITE_META_APP_ID não foi configurada."
            );

            return;
        }

        const sdkExistente = document.getElementById(
            "facebook-jssdk"
        ) as HTMLScriptElement | null;

        window.fbAsyncInit = () => {
            window.FB?.init({
                appId: META_APP_ID,
                cookie: true,
                xfbml: true,
                version: META_GRAPH_VERSION,
                autoLogAppEvents: true,
            });

            setSdkCarregado(true);
        };

        if (sdkExistente) {
            if (window.FB) {
                window.fbAsyncInit();
            }

            return;
        }

        const script = document.createElement("script");

        script.id = "facebook-jssdk";
        script.src =
            "https://connect.facebook.net/pt_BR/sdk.js";
        script.async = true;
        script.defer = true;
        script.crossOrigin = "anonymous";

        script.onerror = () => {
            setErro(
                "Não foi possível carregar o SDK da Meta."
            );
        };

        document.body.appendChild(script);

        return () => {
            script.onerror = null;
        };
    }, []);

    useEffect(() => {
        function receberMensagemMeta(event: MessageEvent) {
            const origensPermitidas = [
                "https://www.facebook.com",
                "https://web.facebook.com",
            ];

            if (!origensPermitidas.includes(event.origin)) {
                return;
            }

            const mensagemMeta = interpretarMensagemMeta(
                event.data
            );

            if (
                mensagemMeta?.type !== "WA_EMBEDDED_SIGNUP"
            ) {
                return;
            }

            if (mensagemMeta.event === "FINISH") {
                const wabaId =
                    mensagemMeta.data?.waba_id;

                const phoneNumberId =
                    mensagemMeta.data?.phone_number_id;

                if (!wabaId || !phoneNumberId) {
                    setErro(
                        "A Meta finalizou o cadastro, mas não retornou os identificadores do WhatsApp."
                    );

                    return;
                }

                dadosCadastroRef.current = {
                    wabaId,
                    phoneNumberId,
                };

                setMensagem(
                    "Cadastro concluído na Meta. Salvando a integração..."
                );

                void concluirConexao();

                return;
            }

            if (mensagemMeta.event === "CANCEL") {
                setConectando(false);
                setMensagem("");
                setErro(
                    "O cadastro do WhatsApp foi cancelado."
                );

                return;
            }

            if (mensagemMeta.event === "ERROR") {
                setConectando(false);
                setMensagem("");
                setErro(
                    "A Meta informou um erro durante o cadastro do WhatsApp."
                );
            }
        }

        window.addEventListener(
            "message",
            receberMensagemMeta
        );

        return () => {
            window.removeEventListener(
                "message",
                receberMensagemMeta
            );
        };
    }, [concluirConexao]);

    function conectarWhatsApp() {
        if (!META_CONFIG_ID) {
            setErro(
                "A variável VITE_META_CONFIG_ID não foi configurada."
            );

            return;
        }

        if (!sdkCarregado || !window.FB) {
            setErro(
                "O SDK da Meta ainda não terminou de carregar."
            );

            return;
        }

        codigoRef.current = null;
        dadosCadastroRef.current = null;
        conexaoEnviadaRef.current = false;

        setConectando(true);
        setErro("");
        setMensagem(
            "Conclua o cadastro na janela da Meta."
        );

        window.FB.login(
            (response) => {
                const code =
                    response.authResponse?.code;

                if (!code) {
                    setConectando(false);
                    setMensagem("");

                    setErro(
                        "A Meta não retornou o código de autorização."
                    );

                    return;
                }

                codigoRef.current = code;

                void concluirConexao();
            },
            {
                config_id: META_CONFIG_ID,
                response_type: "code",
                override_default_response_type: true,
                extras: {
                    setup: {},
                    featureType: "",
                    sessionInfoVersion: "3",
                },
            }
        );
    }

    async function desconectarWhatsApp() {
        const confirmou = window.confirm(
            "Deseja realmente desconectar o WhatsApp desta empresa?"
        );

        if (!confirmou) {
            return;
        }

        try {
            setDesconectando(true);
            setErro("");
            setMensagem("");

            await api.delete(
                "/empresa/whatsapp/desconectar"
            );

            setStatus({
                conectado: false,
            });

            setMensagem(
                "Integração desconectada do sistema."
            );
        } catch (error) {
            console.error(
                "Erro ao desconectar WhatsApp:",
                error
            );

            setErro(
                "Não foi possível desconectar a integração."
            );
        } finally {
            setDesconectando(false);
        }
    }

    if (carregandoStatus) {
        return (
            <section>
                <h2>Integração com WhatsApp</h2>
                <p>Consultando integração...</p>
            </section>
        );
    }

    return (
        <section>
            <h2>Integração com WhatsApp</h2>

            {status.conectado ? (
                <div>
                    <p>
                        <strong>Status:</strong> conectado
                    </p>

                    {status.numeroExibicao && (
                        <p>
                            <strong>Número:</strong>{" "}
                            {status.numeroExibicao}
                        </p>
                    )}

                    {status.nomeVerificado && (
                        <p>
                            <strong>Nome:</strong>{" "}
                            {status.nomeVerificado}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={() =>
                            void desconectarWhatsApp()
                        }
                        disabled={desconectando}
                    >
                        {desconectando
                            ? "Desconectando..."
                            : "Desconectar WhatsApp"}
                    </button>
                </div>
            ) : (
                <div>
                    <p>
                        Conecte o número comercial da empresa
                        para receber e responder mensagens pelo
                        sistema.
                    </p>

                    <button
                        type="button"
                        onClick={conectarWhatsApp}
                        disabled={
                            conectando || !sdkCarregado
                        }
                    >
                        {conectando
                            ? "Conectando..."
                            : sdkCarregado
                              ? "Conectar WhatsApp"
                              : "Carregando Meta..."}
                    </button>
                </div>
            )}

            {mensagem && (
                <p role="status">{mensagem}</p>
            )}

            {erro && (
                <p role="alert">{erro}</p>
            )}
        </section>
    );
}