export const FUSO_AGENDA = "America/Sao_Paulo";
const OFFSET_SAO_PAULO = "-03:00";

export function converterDatahoraRecebidaParaUtc(
    valor: unknown
) {
    if (
        typeof valor !== "string" ||
        !valor.trim()
    ) {
        return null;
    }

    const datahora = valor.trim();

    const possuiFuso =
        /(?:Z|[+-]\d{2}:\d{2})$/i.test(
            datahora
        );

    const valorNormalizado =
        possuiFuso
            ? datahora
            : `${datahora.length === 16
                ? `${datahora}:00`
                : datahora
            }${OFFSET_SAO_PAULO}`;

    const data = new Date(
        valorNormalizado
    );

    if (
        Number.isNaN(
            data.getTime()
        )
    ) {
        return null;
    }

    return data;
}

export function obterPartesDataSaoPaulo(
    data: Date
) {
    const formatador =
        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone:
                    FUSO_AGENDA,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                weekday: "short",
            }
        );

    const partes =
        Object.fromEntries(
            formatador
                .formatToParts(data)
                .filter(
                    (parte) =>
                        parte.type !==
                        "literal"
                )
                .map(
                    (parte) => [
                        parte.type,
                        parte.value,
                    ]
                )
        ) as Record<string, string>;

    const diasSemana: Record<
        string,
        number
    > = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
    };

    return {
        ano: Number(partes.year),
        mes: Number(partes.month),
        dia: Number(partes.day),
        hora: Number(partes.hour),
        minuto: Number(partes.minute),
        diaSemana:
            diasSemana[
            partes.weekday
            ],
    };
}

export function horarioParaMinutos(
    horario: string
) {
    const [hora, minuto] =
        horario
            .substring(0, 5)
            .split(":")
            .map(Number);

    return (
        hora * 60 +
        minuto
    );
}