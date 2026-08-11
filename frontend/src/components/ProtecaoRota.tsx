import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { verificarSessao } from "../utils/auth";
import { verificarAssinatura } from "../utils/assinatura";

type ProtecaoRotaProps = {
  children: React.ReactNode;
};

export function ProtecaoRota({ children }: ProtecaoRotaProps) {
  const [assinaturaValida, setAssinaturaValida] =
    useState<boolean | null>(null);

  const sessaoValida = verificarSessao();

  useEffect(() => {
    if (!sessaoValida) {
      return;
    }

    async function consultarAssinatura() {
      const valida = await verificarAssinatura();

      setAssinaturaValida(valida);
    }

    consultarAssinatura();
  }, [sessaoValida]);

  if (!sessaoValida) {
    return <Navigate to="/login" replace />;
  }

  if (assinaturaValida === null) {
    return <p>Carregando...</p>;
  }

  if (!assinaturaValida) {
    return <Navigate to="/assinatura" replace />;
  }

  return children;
}