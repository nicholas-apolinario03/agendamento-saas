import { CardHorario } from "./CardHorario";
import type { HorarioFuncionamento } from "../types/HorarioFuncionamento";

type ListarHorariosProps = {

    horarios: HorarioFuncionamento[];
    aoExcluir: (id: number) => void;
    aoEditar: (horario: HorarioFuncionamento) => void
};

export function ListarHorarios({ horarios, aoExcluir, aoEditar }: ListarHorariosProps) {
    return (

        <div>
            {horarios.map((horario) => (

                <CardHorario
                    key={horario.id}
                    horariofun={horario}
                    aoExcluir={aoExcluir}
                    aoEditar={aoEditar}

                />

            ))}
        </div>
    )
}
