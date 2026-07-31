import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import axios from "axios";

import { api } from "../services/api";

type IntegracaoWhatsAppDados = {
    id?: number;
    empresaId?: number;
    wabaId: string;
    phoneNumberId: string;
    numeroExibicao?: string | null;
    nomeVerificado?: string | null;
    conectado: boolean;
    conectadoEm?: string;
};

type RespostaStatus = {
    conectado: boolean;
    integracao: IntegracaoWhatsAppDados | null;
};

type RespostaConexao = {
    mensagem: string;
    integracao: IntegracaoWhatsAppDados;
};

const META_SIGNUP_URL =
    import.meta.env.VITE_META_SIGNUP_URL;

export default function IntegracaoWhatsApp() {
    const [carregandoStatus, setCarregandoStatus] =
        useState(true);

    const [conectando, setConectando] =
        useState(false);

    const [desconectando, setDesconectando] =
        useState(false);

    const [integracao, setIntegracao] =
        useState<IntegracaoWhatsAppDados | null>(
            null
        );

    const [mensagem, setMensagem] =
        useState("");

    const [erro, setErro] =
        useState("");

    /*
     * Evita processar duas vezes o mesmo retorno,
     * principalmente no StrictMode do React.
     */
    const retornoProcessadoRef =
        useRef(false);

    const buscarStatus =
        useCallback(async () => {
            try {
                setCarregandoStatus(true);
                setErro("");

                const resposta =
                    await api.get<RespostaStatus>(
                        "/empresa/whatsapp/status"
                    );

                setIntegracao(
                    resposta.data.integracao
                );
            } catch (error) {
                console.error(
                    "Erro ao consultar integração:",
                    error
                );

                setErro(
                    "Não foi possível consultar o status da integração com o WhatsApp."
                );
            } finally {
                setCarregandoStatus(false);
            }
        }, []);

    useEffect(() => {
        void buscarStatus();
    }, [buscarStatus]);

    function limparParametrosDaMeta() {
        const urlLimpa =
            `${window.location.origin}` +
            `${window.location.pathname}`;

        window.history.replaceState(
            {},
            document.title,
            urlLimpa
        );
    }

    async function concluirConexao(
        code: string
    ) {
        if (retornoProcessadoRef.current) {
            return;
        }

        retornoProcessadoRef.current = true;

        try {
            setConectando(true);
            setErro("");
            setMensagem(
                "Finalizando a conexão com o WhatsApp..."
            );

            const resposta =
                await api.post<RespostaConexao>(
                    "/empresa/whatsapp/concluir-conexao",
                    {
                        code,
                    }
                );

            setIntegracao(
                resposta.data.integracao
            );

            setMensagem(
                "WhatsApp conectado com sucesso."
            );
        } catch (error) {
            retornoProcessadoRef.current =
                false;

            console.error(
                "Erro ao concluir integração:",
                error
            );

            setMensagem("");

            if (axios.isAxiosError(error)) {
                const mensagemBackend =
                    error.response?.data?.erro;

                setErro(
                    typeof mensagemBackend ===
                        "string"
                        ? mensagemBackend
                        : "Não foi possível concluir a integração com o WhatsApp."
                );

                return;
            }

            setErro(
                "Não foi possível concluir a integração com o WhatsApp."
            );
        } finally {
            setConectando(false);
            limparParametrosDaMeta();
        }
    }

    /*
     * Processa o retorno da Meta quando ela
     * redirecionar novamente para /dashboard.
     */
    useEffect(() => {
        if (retornoProcessadoRef.current) {
            return;
        }

        const parametrosQuery =
            new URLSearchParams(
                window.location.search
            );

        /*
         * Alguns fluxos podem retornar parâmetros
         * no fragmento da URL.
         */
        const hashSemCerquilha =
            window.location.hash.replace(
                /^#/,
                ""
            );

        const parametrosHash =
            new URLSearchParams(
                hashSemCerquilha
            );

        const code =
            parametrosQuery.get("code") ??
            parametrosHash.get("code");

        const erroMeta =
            parametrosQuery.get("error") ??
            parametrosHash.get("error");

        const descricaoErro =
            parametrosQuery.get(
                "error_description"
            ) ??
            parametrosHash.get(
                "error_description"
            );

        const conexaoEmAndamento =
            sessionStorage.getItem(
                "whatsappConexaoEmAndamento"
            );

        if (erroMeta) {
            sessionStorage.removeItem(
                "whatsappConexaoEmAndamento"
            );

            setErro(
                descricaoErro ??
                "A conexão com o WhatsApp foi cancelada ou recusada."
            );

            setMensagem("");
            limparParametrosDaMeta();

            return;
        }

        if (!code) {
            return;
        }

        /*
         * O marcador reduz o risco de processarmos
         * um parâmetro code que não pertença a esse
         * fluxo de conexão.
         */
        if (
            conexaoEmAndamento !== "true"
        ) {
            setErro(
                "Foi recebido um retorno da Meta, mas não foi encontrada uma conexão em andamento."
            );

            limparParametrosDaMeta();

            return;
        }

        sessionStorage.removeItem(
            "whatsappConexaoEmAndamento"
        );

        void concluirConexao(code);
    }, []);

    function conectarWhatsApp() {
        if (!META_SIGNUP_URL) {
            setErro(
                "A variável VITE_META_SIGNUP_URL não foi configurada."
            );

            return;
        }

        try {
            const url =
                new URL(META_SIGNUP_URL);

            if (
                url.protocol !== "https:"
            ) {
                throw new Error(
                    "A URL precisa utilizar HTTPS"
                );
            }
        } catch {
            setErro(
                "A URL do Cadastro Incorporado da Meta é inválida."
            );

            return;
        }

        setErro("");
        setMensagem(
            "Redirecionando para o cadastro do WhatsApp..."
        );

        sessionStorage.setItem(
            "whatsappConexaoEmAndamento",
            "true"
        );

        window.location.assign(
            META_SIGNUP_URL
        );
    }

    async function desconectarWhatsApp() {
        const confirmou =
            window.confirm(
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

            setIntegracao(null);

            setMensagem(
                "WhatsApp desconectado do sistema."
            );
        } catch (error) {
            console.error(
                "Erro ao desconectar WhatsApp:",
                error
            );

            if (axios.isAxiosError(error)) {
                const mensagemBackend =
                    error.response?.data?.erro;

                setErro(
                    typeof mensagemBackend ===
                        "string"
                        ? mensagemBackend
                        : "Não foi possível desconectar o WhatsApp."
                );

                return;
            }

            setErro(
                "Não foi possível desconectar o WhatsApp."
            );
        } finally {
            setDesconectando(false);
        }
    }

    if (carregandoStatus) {
        return (
            <section>
                <h2>
                    Integração com WhatsApp
                </h2>

                <p>
                    Consultando integração...
                </p>
            </section>
        );
    }

    return (
        <section>
            <h2>
                Integração com WhatsApp
            </h2>

            {integracao?.conectado ? (
                <div>
                    <p>
                        <strong>
                            Status:
                        </strong>{" "}
                        conectado
                    </p>

                    {integracao.numeroExibicao && (
                        <p>
                            <strong>
                                Número:
                            </strong>{" "}
                            {
                                integracao
                                    .numeroExibicao
                            }
                        </p>
                    )}

                    {integracao.nomeVerificado && (
                        <p>
                            <strong>
                                Nome:
                            </strong>{" "}
                            {
                                integracao
                                    .nomeVerificado
                            }
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={() =>
                            void desconectarWhatsApp()
                        }
                        disabled={
                            desconectando
                        }
                    >
                        {desconectando
                            ? "Desconectando..."
                            : "Desconectar WhatsApp"}
                    </button>
                </div>
            ) : (
                <div>
                    <p>
                        Conecte o número comercial
                        da empresa para receber e
                        responder mensagens pelo
                        sistema.
                    </p>

                    <button
                        type="button"
                        onClick={
                            conectarWhatsApp
                        }
                        disabled={conectando}
                    >
                        {conectando
                            ? "Conectando..."
                            : "Conectar WhatsApp"}
                    </button>
                </div>
            )}

            {mensagem && (
                <p role="status">
                    {mensagem}
                </p>
            )}

            {erro && (
                <p role="alert">
                    {erro}
                </p>
            )}
        </section>
    );
}