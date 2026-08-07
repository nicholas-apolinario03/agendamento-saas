import { useEffect, useState } from "react";
import type { HorarioFuncionamento, NovoHorario } from "../types/HorarioFuncionamento";
import "./css/Formulario.css"
type FormularioHorarioProps = {
    horario: HorarioFuncionamento | null;
    onSalvar: (dados: NovoHorario) => void;
};

export function FormularioHorario({
    horario,
    onSalvar,
}: FormularioHorarioProps) {

    const [diaSemana, setDiaSemana] = useState<number>(1)
    const [horaInicio, setHoraInicio] = useState("")
    const [horaFim, setHoraFim] = useState("")
    const [ativo, setAtivo] = useState<boolean>(true)

    useEffect(() => {

        if (horario) {

            setDiaSemana(horario.diaSemana);
            setHoraInicio(horario.horaInicio);
            setHoraFim(horario.horaFim);
            setAtivo(horario.ativo);

        } else {

            setDiaSemana(1);
            setHoraInicio("");
            setHoraFim("");
            setAtivo(true);

        }

    }, [horario]);

    function cadastroHorario(event: React.FormEvent<HTMLFormElement>) {

        event.preventDefault();
        if (horaInicio >= horaFim) {

            alert("O horário de início deve ser menor que o horário de término.");

            return;
        } else {
            onSalvar({
                diaSemana,
                horaInicio,
                horaFim,
                ativo,
            });
        }

    }
    const diasSemana = [
        { valor: 0, nome: "Domingo" },
        { valor: 1, nome: "Segunda-feira" },
        { valor: 2, nome: "Terça-feira" },
        { valor: 3, nome: "Quarta-feira" },
        { valor: 4, nome: "Quinta-feira" },
        { valor: 5, nome: "Sexta-feira" },
        { valor: 6, nome: "Sábado" },
    ];
    return (

        <div>
            <form onSubmit={cadastroHorario} className="formulario">
                <div className="formulario-login__cabecalho">
                    <h2>
                        {horario
                            ? "Editar Horario"
                            : "Novo Horario"}
                    </h2>

                    <p>
                        Configure os horarios de atendimento.
                    </p>
                </div>
                <div className="formulario-login__campo">
                    <select
                        value={diaSemana}
                        onChange={(e) => setDiaSemana(Number(e.target.value))}
                    >
                        {diasSemana.map((dia) => (
                            <option key={dia.valor} value={dia.valor}>
                                {dia.nome}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="formulario-login__campo">
                    <input type="time" placeholder="hora de abertura" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                </div>
                <div className="formulario-login__campo">
                    <input type="time" placeholder="hora de fechamento" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
                </div>
                <div className="formulario-login__campo">
                    <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
                </div>

                <button className="formulario-login__botao" type="submit">

                    {horario ? "Salvar Alterações" : "Cadastrar Horário"}

                </button>

            </form>
        </div >
    )


}