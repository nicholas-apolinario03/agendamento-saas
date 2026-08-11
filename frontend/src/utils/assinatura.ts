import { api } from "../services/api";

export async function verificarAssinatura(): Promise<boolean> {
  const token = localStorage.getItem("token");

  if (!token) {
    return false;
  }

  try {
    const resposta = await api.get("/empresa/acesso", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return resposta.data.acesso === true;

  } catch (erro) {
    console.error("Erro ao verificar assinatura:", erro);
    return false;
  }
}