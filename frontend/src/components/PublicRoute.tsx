import { Navigate } from "react-router-dom";
import { verificarSessao } from "../utils/auth";

type PublicRouteProps = {
    children: React.ReactNode;
};

export function PublicRoute({ children }: PublicRouteProps) {

    if (verificarSessao()) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}