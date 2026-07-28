import type { Cliente } from "../types/Cliente";

type CardClienteProps = {
    cliente: Cliente;
}
export function CardCliente({ cliente }: CardClienteProps) {

    return (

        <div>

            <h3>{cliente.nome}</h3>

            <p>
                {cliente.telefone}
            </p>

            <p>
                {cliente.email}
            </p>


            <hr />

        </div>

    );

}