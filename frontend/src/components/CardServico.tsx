import type { Servico } from "../types/Servico";
type CardServicoProps = {
    servico: Servico;
    aoExcluir: (id: number) => void;
    aoEditar: (servico: Servico)=>void
};
export function CardServico({ servico, aoExcluir, aoEditar }: CardServicoProps) {

    return (

        <div>

            <h3>{servico.nome}</h3>

            <p>
                {servico.duracaoMinutos} minutos
            </p>

            <p>
                R$ {servico.preco}
            </p>

             <button onClick={() => aoExcluir(servico.id)}>Deletar</button>
             <button onClick={() => aoEditar(servico)}>Editar</button>

            <hr />

        </div>

    );

}