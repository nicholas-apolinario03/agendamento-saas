import { CardCliente } from "./CardCliente";
import type { Cliente } from "../types/Cliente";

type ListarHorariosProps = {

    clientes: Cliente[];
   
};

export function ListarHorarios({ clientes }: ListarHorariosProps) {
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
