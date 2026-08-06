import "./css/FeatureCard.css";

type FeatureCardProps = {
    titulo: string;
    descricao: string;
    imagem: string;
    imagemAlt: string;
    inverter?: boolean;
};

export default function FeatureCard({
    titulo,
    descricao,
    imagem,
    imagemAlt,
    inverter = false,
}: FeatureCardProps) {
    return (
        <article
            className={[
                "feature-card",
                inverter
                    ? "feature-card--invertido"
                    : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <div className="feature-card__conteudo">
                <h3 className="feature-card__titulo">
                    {titulo}
                </h3>

                <p className="feature-card__descricao">
                    {descricao}
                </p>
            </div>

            <div className="feature-card__imagem-container">
                <img
                    src={imagem}
                    alt={imagemAlt}
                    className="feature-card__imagem"
                />
            </div>
        </article>
    );
}