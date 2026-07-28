export function verificarSessao(): boolean {

    const token = localStorage.getItem("token");

    if (!token) {
        return false;
    }

    try {

        const partes = token.split(".");
        if (partes.length !== 3) {
            localStorage.removeItem("token");
            return false;
        }
        const payload = partes[1];

        const payloadDecodificado = atob(payload);
        const dados = JSON.parse(payloadDecodificado);

        const agora = Date.now() / 1000;

        if (dados.exp < agora) {

            localStorage.removeItem("token");

            return false;

        }

        return true;

    } catch {

        localStorage.removeItem("token");

        return false;

    }

}