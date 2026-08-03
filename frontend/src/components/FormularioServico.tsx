import {
    useEffect,
    useState
} from "react";

import type {
    ExcecaoServico,
    NovoServico,
    Servico,
    TipoDisponibilidadeServico
} from "../types/Servico";


type FormularioServicoProps = {
    servico: Servico | null;
    onSalvar: (
        dados: NovoServico
    ) => void;
};


const diasDaSemana = [
    {
        numero: 0,
        nome: "Domingo"
    },
    {
        numero: 1,
        nome: "Segunda-feira"
    },
    {
        numero: 2,
        nome: "Terça-feira"
    },
    {
        numero: 3,
        nome: "Quarta-feira"
    },
    {
        numero: 4,
        nome: "Quinta-feira"
    },
    {
        numero: 5,
        nome: "Sexta-feira"
    },
    {
        numero: 6,
        nome: "Sábado"
    }
];


export function FormularioServico({
    servico,
    onSalvar,
}: FormularioServicoProps) {

    const [nome, setNome] =
        useState("");

    const [
        duracaoMinutos,
        setDuracaoMinutos
    ] = useState(0);

    const [descricao, setDescricao] =
        useState("");

    const [preco, setPreco] =
        useState(0);

    const [ativo, setAtivo] =
        useState(true);


    const [
        tipoDisponibilidade,
        setTipoDisponibilidade
    ] = useState<
        TipoDisponibilidadeServico
    >("TODOS_OS_DIAS");


    const [
        diasSemana,
        setDiasSemana
    ] = useState<number[]>([]);


    const [
        excecoes,
        setExcecoes
    ] = useState<ExcecaoServico[]>([]);


    const [
        novaDataExcecao,
        setNovaDataExcecao
    ] = useState("");


    const [
        novaExcecaoDisponivel,
        setNovaExcecaoDisponivel
    ] = useState(true);


    useEffect(() => {

        if (servico) {

            setNome(
                servico.nome
            );

            setDuracaoMinutos(
                servico.duracaoMinutos
            );

            setDescricao(
                servico.descricao ?? ""
            );

            setPreco(
                servico.preco
            );

            setAtivo(
                servico.ativo
            );

            setTipoDisponibilidade(
                servico.tipoDisponibilidade ??
                "TODOS_OS_DIAS"
            );

            setDiasSemana(
                servico.diasSemana ?? []
            );

            setExcecoes(
                servico.excecoes ?? []
            );

        } else {

            setNome("");
            setDuracaoMinutos(0);
            setDescricao("");
            setPreco(0);
            setAtivo(true);

            setTipoDisponibilidade(
                "TODOS_OS_DIAS"
            );

            setDiasSemana([]);

            setExcecoes([]);

        }

        setNovaDataExcecao("");
        setNovaExcecaoDisponivel(true);

    }, [servico]);


    function alternarDiaSemana(
        diaSemana: number
    ) {

        setDiasSemana(
            (diasAtuais) => {

                const diaJaSelecionado =
                    diasAtuais.includes(
                        diaSemana
                    );

                if (diaJaSelecionado) {

                    return diasAtuais.filter(
                        (dia) =>
                            dia !== diaSemana
                    );
                }

                return [
                    ...diasAtuais,
                    diaSemana
                ].sort(
                    (primeiro, segundo) =>
                        primeiro - segundo
                );
            }
        );
    }


    function adicionarExcecao() {

        if (!novaDataExcecao) {
            return;
        }

        const excecaoJaExiste =
            excecoes.some(
                (excecao) =>
                    excecao.data ===
                    novaDataExcecao
            );

        if (excecaoJaExiste) {

            setExcecoes(
                (excecoesAtuais) =>
                    excecoesAtuais.map(
                        (excecao) => {

                            if (
                                excecao.data ===
                                novaDataExcecao
                            ) {
                                return {
                                    data:
                                        novaDataExcecao,

                                    disponivel:
                                        novaExcecaoDisponivel
                                };
                            }

                            return excecao;
                        }
                    )
            );

        } else {

            setExcecoes(
                (excecoesAtuais) => [
                    ...excecoesAtuais,
                    {
                        data:
                            novaDataExcecao,

                        disponivel:
                            novaExcecaoDisponivel
                    }
                ]
            );
        }

        setNovaDataExcecao("");
        setNovaExcecaoDisponivel(true);
    }


    function removerExcecao(
        data: string
    ) {

        setExcecoes(
            (excecoesAtuais) =>
                excecoesAtuais.filter(
                    (excecao) =>
                        excecao.data !== data
                )
        );
    }


    function enviarFormulario(
        event:
            React.FormEvent<HTMLFormElement>
    ) {

        event.preventDefault();

        if (
            tipoDisponibilidade ===
            "DIAS_DA_SEMANA" &&
            diasSemana.length === 0
        ) {
            alert(
                "Selecione pelo menos um dia da semana."
            );

            return;
        }

        onSalvar({
            nome,
            duracaoMinutos,
            descricao,
            preco,
            ativo,

            tipoDisponibilidade,

            diasSemana:
                tipoDisponibilidade ===
                "DIAS_DA_SEMANA"
                    ? diasSemana
                    : [],

            excecoes
        });
    }


    return (
        <form onSubmit={enviarFormulario}>

           

                <input
                    type="text"
                    placeholder="Nome do serviço"
                    value={nome}
                    onChange={(event) =>
                        setNome(
                            event.target.value
                        )
                    }
                    required
                />
           


           

                <input
                    type="number"
                    min={1}
                    placeholder="Duração"
                    value={duracaoMinutos}
                    onChange={(event) =>
                        setDuracaoMinutos(
                            Number(
                                event.target.value
                            )
                        )
                    }
                    required
                />
           

            
                <input
                    type="text"
                    placeholder="Descrição"
                    value={descricao}
                    onChange={(event) =>
                        setDescricao(
                            event.target.value
                        )
                    }
                />
           


            
                <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Preço"
                    value={preco}
                    onChange={(event) =>
                        setPreco(
                            Number(
                                event.target.value
                            )
                        )
                    }
                    required
                />
           

            <div>
                <label>
                    <input
                        type="checkbox"
                        checked={ativo}
                        onChange={(event) =>
                            setAtivo(
                                event.target.checked
                            )
                        }
                    />

                    Serviço ativo
                </label>
            </div>


            <div>
                

                <select
                    value={
                        tipoDisponibilidade
                    }
                    onChange={(event) =>
                        setTipoDisponibilidade(
                            event.target.value as
                                TipoDisponibilidadeServico
                        )
                    }
                >
                    <option
                        value="TODOS_OS_DIAS"
                    >
                        Todos os dias de funcionamento
                    </option>

                    <option
                        value="DIAS_DA_SEMANA"
                    >
                        Dias específicos da semana
                    </option>
                </select>
            </div>


            {tipoDisponibilidade ===
                "DIAS_DA_SEMANA" && (

                <div>
                    <p>
                        Dias disponíveis
                    </p>

                    {diasDaSemana.map(
                        (dia) => (

                            <label
                                key={dia.numero}
                            >
                                <input
                                    type="checkbox"
                                    checked={
                                        diasSemana.includes(
                                            dia.numero
                                        )
                                    }
                                    onChange={() =>
                                        alternarDiaSemana(
                                            dia.numero
                                        )
                                    }
                                />

                                {dia.nome}
                            </label>
                        )
                    )}
                </div>
            )}


            <div>
                <h3>
                    Exceções por data
                </h3>

                <p>
                    Use para liberar ou bloquear
                    uma data específica.
                </p>

                <input
                    type="date"
                    value={novaDataExcecao}
                    onChange={(event) =>
                        setNovaDataExcecao(
                            event.target.value
                        )
                    }
                />

                <select
                    value={
                        novaExcecaoDisponivel
                            ? "DISPONIVEL"
                            : "BLOQUEADO"
                    }
                    onChange={(event) =>
                        setNovaExcecaoDisponivel(
                            event.target.value ===
                            "DISPONIVEL"
                        )
                    }
                >
                    <option
                        value="DISPONIVEL"
                    >
                        Disponível nesta data
                    </option>

                    <option
                        value="BLOQUEADO"
                    >
                        Bloqueado nesta data
                    </option>
                </select>

                <button
                    type="button"
                    onClick={
                        adicionarExcecao
                    }
                >
                    Adicionar exceção
                </button>
            </div>


            {excecoes.length > 0 && (

                <div>
                    <h4>
                        Exceções cadastradas
                    </h4>

                    {excecoes.map(
                        (excecao) => (

                            <div
                                key={
                                    excecao.data
                                }
                            >
                                <span>
                                    {excecao.data}
                                </span>

                                <span>
                                    {" - "}

                                    {excecao.disponivel
                                        ? "Disponível"
                                        : "Bloqueado"}
                                </span>

                                <button
                                    type="button"
                                    onClick={() =>
                                        removerExcecao(
                                            excecao.data
                                        )
                                    }
                                >
                                    Remover
                                </button>
                            </div>
                        )
                    )}
                </div>
            )}


            <button type="submit">
                {servico
                    ? "Salvar alterações"
                    : "Registrar"}
            </button>

        </form>
    );
}