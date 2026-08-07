import {
    useEffect,
    useState
} from "react";
import "./css/Formulario.css"
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
    <form className="formulario" onSubmit={enviarFormulario}>
        <div className="formulario-login__cabecalho">
            <h2>
                {servico
                    ? "Editar serviço"
                    : "Novo serviço"}
            </h2>

            <p>
                Configure as informações,
                disponibilidade e exceções
                deste serviço.
            </p>
        </div>

        <div className="formulario-login__campo">
            <label htmlFor="servico-nome">
                Nome do serviço
            </label>

            <input
                id="servico-nome"
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
        </div>

        <div className="formulario-login__campo">
            <label htmlFor="servico-duracao">
                Duração (Minutos)
            </label>

            <input
                id="servico-duracao"
                type="number"
                min={1}
                placeholder="Duração em minutos"
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
        </div>

        <div className="formulario-login__campo">
            <label htmlFor="servico-descricao">
                Descrição (Opcional)
            </label>

            <input
                id="servico-descricao"
                type="text"
                placeholder="Descrição"
                value={descricao}
                onChange={(event) =>
                    setDescricao(
                        event.target.value
                    )
                }
            />
        </div>

        <div className="formulario-login__campo">
            <label htmlFor="servico-preco">
                Preço
            </label>

            <input
                id="servico-preco"
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
        </div>

        <div className="formulario-login__campo">
            <label className="formulario__checkbox">
                <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(event) =>
                        setAtivo(
                            event.target.checked
                        )
                    }
                />

                <span>
                    Serviço ativo
                </span>
            </label>
        </div>

        <div className="formulario-login__campo">
            <label htmlFor="servico-disponibilidade">
                Disponibilidade
            </label>

            <select
                id="servico-disponibilidade"
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
            <div className="formulario-login__grupo">
                <div className="formulario-login__grupo-cabecalho">
                    <h3>
                        Dias disponíveis
                    </h3>

                    <p>
                        Selecione os dias da
                        semana em que este
                        serviço poderá ser
                        agendado.
                    </p>
                </div>

                <div className="formulario-login__dias-semana">
                    {diasDaSemana.map(
                        (dia) => (
                            <label
                                key={
                                    dia.numero
                                }
                                className="formulario__checkbox"  
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

                                <span>
                                    {dia.nome}
                                </span>
                            </label>
                        )
                    )}
                </div>
            </div>
        )}
    <br />
    <br />
        <div className="formulario-login__grupo">
            <div className="formulario-login__grupo-cabecalho">
                <h3>
                    Exceções por data
                </h3>

                <p>
                    Use para liberar ou
                    bloquear uma data
                    específica.
                </p>
            </div>

            <div className="formulario-login__campo">
                <label htmlFor="servico-excecao-data">
                    Data
                </label>

                <input
                    id="servico-excecao-data"
                    type="date"
                    value={
                        novaDataExcecao
                    }
                    onChange={(event) =>
                        setNovaDataExcecao(
                            event.target.value
                        )
                    }
                />
            </div>

            <div className="formulario-login__campo">
                <label htmlFor="servico-excecao-status">
                    Disponibilidade na data
                </label>

                <select
                    id="servico-excecao-status"
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
            </div>

            <button
                type="button"
                className="formulario-login__botao-secundario"
                onClick={
                    adicionarExcecao
                }
            >
                Adicionar exceção
            </button>
        </div>

        {excecoes.length > 0 && (
            <div className="formulario-login__grupo">
                <div className="formulario-login__grupo-cabecalho">
                    <h3>
                        Exceções cadastradas
                    </h3>

                    <p>
                        Datas com disponibilidade
                        diferente da configuração
                        padrão.
                    </p>
                </div>

                <div className="formulario-login__excecoes">
                    {excecoes.map(
                        (excecao) => (
                            <div
                                key={
                                    excecao.data
                                }
                                className="formulario-login__excecao"
                            >
                                <div className="formulario-login__excecao-info">
                                    <strong>
                                        {
                                            excecao.data
                                        }
                                    </strong>

                                    <span
                                        className={
                                            excecao.disponivel
                                                ? "formulario-login__excecao-status formulario-login__excecao-status--disponivel"
                                                : "formulario-login__excecao-status formulario-login__excecao-status--bloqueado"
                                        }
                                    >
                                        {excecao.disponivel
                                            ? "Disponível"
                                            : "Bloqueado"}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    className="formulario-login__remover"
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
            </div>
        )}

        <button
            type="submit"
            className="formulario-login__botao"
        >
            {servico
                ? "Salvar alterações"
                : "Registrar serviço"}
        </button>
    </form>
);
}