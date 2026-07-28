import { CardServico } from "./CardServico";
import type { Servico } from "../types/Servico";

type ListarServicosProps = {
    servicos: Servico[];
     aoExcluir: (id:number)=>void;
     aoEditar: (servico: Servico)=>void
};
export function ListaServicos({ servicos, aoExcluir, aoEditar }: ListarServicosProps) {
    return (

        <div>
            {servicos.map((servico) => (

                <CardServico
                    key={servico.id}
                    servico={servico}
                    aoExcluir={aoExcluir}
                    aoEditar={aoEditar}

                />

            ))}
        </div>
    )
}