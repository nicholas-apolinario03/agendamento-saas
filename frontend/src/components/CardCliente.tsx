import type {
    Cliente,
} from "../types/Cliente";

import "./css/Lista.css";

type CardClienteProps = {
    cliente: Cliente;
};

function formatarTelefone(
    telefone: string
) {
    const numeros =
        telefone.replace(/\D/g, "");

    if (
        numeros.length === 13 &&
        numeros.startsWith("55")
    ) {
        const ddd =
            numeros.slice(2, 4);

        const primeiraParte =
            numeros.slice(4, 9);

        const segundaParte =
            numeros.slice(9);

        return `+55 (${ddd}) ${primeiraParte}-${segundaParte}`;
    }

    return telefone;
}

export function CardCliente({
    cliente,
}: CardClienteProps) {
    return (
        <div>
            <h3 className="titulo-servico_cabecalho">
                {cliente.nome}
            </h3>

            <p>
                Celular:{" "}
                {formatarTelefone(
                    cliente.telefone
                )}
            </p>

            <p>
                Email: {cliente.email}
            </p>

        </div>
    );
}