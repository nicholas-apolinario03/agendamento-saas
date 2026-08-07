import { CardCliente } from "./CardCliente";
import type { Cliente } from "../types/Cliente";

type ListarClientesProps = {

    clientes: Cliente[];
   
};

export function ListarClientes({ clientes }: ListarClientesProps) {
    return (

        <div>
            {clientes.map((cliente) => (

                <CardCliente
                    key={cliente.id}
                    cliente={cliente}
                    

                />

            ))}
        </div>
    )
}
