import type { HorarioFuncionamento } from "../types/HorarioFuncionamento";

type CardHorarioProps = {
    horariofun: HorarioFuncionamento;
    aoExcluir: (id: number) => void;
    aoEditar: (horariofun: HorarioFuncionamento) => void;
}
export function CardHorario({ horariofun, aoEditar, aoExcluir }: CardHorarioProps) {
    var dia="";
    switch(horariofun.diaSemana){
        case  1:{
            dia = "Segunda-Feira";
            break;
        }
         case  2:{
            dia = "Terça-Feira";
               break;
        }
         case  3:{
            dia = "Quarta-Feira";
               break;
        }
         case  4:{
            dia = "Quinta-Feira";
               break;
        }
         case  5:{
            dia = "Sexta-Feira";
               break;
        }
         case  6:{
            dia = "Sabado";
               break;
        }
         case  7:{
            dia = "Domingo";
               break;
        }
        
    }
    return (

        <div>

            <h3 className="titulo-servico_cabecalho" >{dia}</h3>

            <p>
                {horariofun.horaInicio}-{horariofun.horaFim}
            </p>

            <button className="lista-botao_editar" onClick={() => aoEditar(horariofun)}>Editar</button>
            <button className="lista-botao_excluir" onClick={() => aoExcluir(horariofun.id)}>Deletar</button>

            <hr />

        </div>

    );

}