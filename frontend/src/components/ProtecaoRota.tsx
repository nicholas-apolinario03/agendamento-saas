import {
    Navigate
} from "react-router-dom";

import {
    verificarSessao
} from "../utils/auth";

type ProtecaoRotaProps = {
    children: React.ReactNode;
};

export function ProtecaoRota({
    children
}: ProtecaoRotaProps) {

    const sessaoValida =
        verificarSessao();

    /*
     * A assinatura não bloqueia mais
     * o acesso ao dashboard.
     *
     * Aqui verificamos somente se
     * o usuário está logado.
     */
    if (!sessaoValida) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    return children;
}