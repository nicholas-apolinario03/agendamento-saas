import { Navigate } from "react-router-dom";
import { verificarSessao } from "../utils/auth";

type ProtecaoRotaProps={

    children: React.ReactNode;
};

export function ProtecaoRota( {children}: ProtecaoRotaProps ){
    
 

    if(!verificarSessao()){
        return <Navigate to="/login" replace/>;

    }
    return children;
}