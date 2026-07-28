import type { HorarioFuncionamento } from "../types/HorarioFuncionamento";

type CardHorarioProps = {
    horariofun: HorarioFuncionamento;
    aoExcluir: (id: number) => void;
    aoEditar: (horariofun: HorarioFuncionamento) => void;
}
export function CardHorario({ horariofun, aoEditar, aoExcluir }: CardHorarioProps) {

    return (

        <div>

            <h3>{horariofun.diaSemana}</h3>

            <p>
                {horariofun.horaInicio}
            </p>

            <p>
                {horariofun.horaFim}
            </p>

            <button onClick={() => aoExcluir(horariofun.id)}>Deletar</button>
            <button onClick={() => aoEditar(horariofun)}>Editar</button>

            <hr />

        </div>

    );

}