import {
    Navigate,
    useLocation
} from "react-router-dom";

import {
    useEffect,
    useState
} from "react";

import { verificarSessao } from "../utils/auth";
import { verificarAssinatura } from "../utils/assinatura";

type ProtecaoRotaProps = {
    children: React.ReactNode;
};

export function ProtecaoRota({
    children
}: ProtecaoRotaProps) {

    const location = useLocation();

    const [assinaturaValida, setAssinaturaValida] =
        useState<boolean | null>(null);

    const sessaoValida =
        verificarSessao();

    useEffect(() => {

        if (!sessaoValida) {
            return;
        }

        let cancelado = false;

        async function consultarAssinatura() {

            /*
             * Sempre que entrar/mudar de rota,
             * voltamos para carregando e consultamos
             * o backend novamente.
             */
            setAssinaturaValida(null);

            const valida =
                await verificarAssinatura();

            if (!cancelado) {
                setAssinaturaValida(
                    valida
                );
            }
        }

        consultarAssinatura();

        return () => {
            cancelado = true;
        };

    }, [
        sessaoValida,
        location.pathname
    ]);

    if (!sessaoValida) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    if (assinaturaValida === null) {
        return (
            <p>
                Carregando...
            </p>
        );
    }

    if (!assinaturaValida) {
        return (
            <Navigate
                to="/planos"
                replace
            />
        );
    }

    return children;
}