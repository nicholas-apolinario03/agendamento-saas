"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const prisma_1 = require("./lib/prisma");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwt_1 = require("./service/jwt");
const auth_1 = require("./middleware/auth");
const whatsappRoutes_1 = __importDefault(require("./routes/whatsappRoutes"));
const integracaoWhatsAppRoutes_1 = __importDefault(require("./routes/integracaoWhatsAppRoutes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(whatsappRoutes_1.default);
app.use(integracaoWhatsAppRoutes_1.default);
app.get("/teste", (req, res) => {
    res.json({
        mensagem: "API funcionando",
    });
});
exports.default = app;
app.get("/empresa", async (req, res) => {
    const empresas = await prisma_1.prisma.empresa.findMany();
    res.json(empresas);
});
app.post("/empresa/cadastro", async (req, res) => {
    try {
        const { nome, email, senha, telefone } = req.body;
        const senhaHash = await bcrypt_1.default.hash(senha, 10);
        const empresaExistente = await prisma_1.prisma.empresa.findUnique({
            where: {
                email,
            },
        });
        if (empresaExistente) {
            return res.status(409).json({
                erro: "email ja cadastrado"
            });
        }
        const empresa = await prisma_1.prisma.empresa.create({
            data: {
                nome,
                email,
                senhaHash,
                telefone
            }
        });
        res.status(201).json(empresa);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            erro: "erro ao cadastrar empresa"
        });
    }
});
app.post("/empresa/login", async (req, res) => {
    try {
        const { email, senha } = req.body;
        const empresa = await prisma_1.prisma.empresa.findUnique({
            where: {
                email,
            },
        });
        if (!empresa) {
            return res.status(401).json({
                erro: "email ou senha invalidos",
            });
        }
        const senhaValida = await bcrypt_1.default.compare(senha, empresa.senhaHash);
        if (!senhaValida) {
            return res.status(401).json({
                erro: "email ou senha invalidos",
            });
        }
        const token = (0, jwt_1.gerartoken)(empresa.id, empresa.email);
        return res.status(200).json({
            mensagem: "Login realizado com sucesso",
            token
        });
    }
    catch (erro) {
        console.error(erro);
        return res.status(500).json({
            erro: "erro interno",
        });
    }
});
app.get("/teste-auth", auth_1.auth, (req, res) => {
    res.status(200).json({
        mensagem: "Você está autenticado"
    });
});
app.get("/perfil", auth_1.auth, (req, res) => {
    return res.json({
        usuario: req.usuario
    });
});
app.post("/empresa/servicos", auth_1.auth, async (req, res) => {
    try {
        const empresaId = req.usuario.empresaId;
        const { nome, duracaoMinutos, descricao, ativo, preco, tipoDisponibilidade, diasSemana, excecoes, } = req.body;
        if (!nome ||
            !duracaoMinutos ||
            preco === undefined) {
            return res.status(400).json({
                erro: "Preencha os campos obrigatórios",
            });
        }
        if (tipoDisponibilidade !==
            "TODOS_OS_DIAS" &&
            tipoDisponibilidade !==
                "DIAS_DA_SEMANA") {
            return res.status(400).json({
                erro: "Tipo de disponibilidade inválido",
            });
        }
        if (tipoDisponibilidade ===
            "DIAS_DA_SEMANA" &&
            (!Array.isArray(diasSemana) ||
                diasSemana.length === 0)) {
            return res.status(400).json({
                erro: "Selecione pelo menos um dia da semana",
            });
        }
        const servicoCriado = await prisma_1.prisma.$transaction(async (tx) => {
            const servico = await tx.servico.create({
                data: {
                    empresaId,
                    nome,
                    duracaoMinutos,
                    descricao: descricao || null,
                    ativo: ativo ?? true,
                    preco,
                    tipoDisponibilidade,
                },
            });
            if (tipoDisponibilidade ===
                "DIAS_DA_SEMANA" &&
                Array.isArray(diasSemana)) {
                const diasValidos = diasSemana.filter((dia) => Number.isInteger(dia) &&
                    dia >= 0 &&
                    dia <= 6);
                if (diasValidos.length !==
                    diasSemana.length) {
                    throw new Error("Dia da semana inválido");
                }
                await tx
                    .disponibilidadeSemanalServico
                    .createMany({
                    data: diasValidos.map((diaSemana) => ({
                        servicoId: servico.id,
                        diaSemana,
                        ativo: true,
                    })),
                });
            }
            if (Array.isArray(excecoes) &&
                excecoes.length > 0) {
                await tx
                    .excecaoDisponibilidadeServico
                    .createMany({
                    data: excecoes.map((excecao) => ({
                        servicoId: servico.id,
                        data: new Date(`${excecao.data}T12:00:00-03:00`),
                        disponivel: Boolean(excecao.disponivel),
                    })),
                });
            }
            return tx.servico.findUnique({
                where: {
                    id: servico.id,
                },
                include: {
                    disponibilidadesSemanais: true,
                    excecoesDisponibilidade: true,
                },
            });
        });
        return res
            .status(201)
            .json(servicoCriado);
    }
    catch (erro) {
        console.error("Erro ao criar serviço:", erro);
        return res.status(400).json({
            erro: "Erro ao criar serviço",
        });
    }
});
app.get("/empresa/servicos", auth_1.auth, async (req, res) => {
    try {
        const empresaId = req.usuario.empresaId;
        const servicos = await prisma_1.prisma.servico.findMany({
            where: {
                empresaId,
            },
            include: {
                disponibilidadesSemanais: true,
                excecoesDisponibilidade: true,
            },
            orderBy: {
                nome: "asc",
            },
        });
        const resposta = servicos.map((servico) => ({
            id: servico.id,
            empresaId: servico.empresaId,
            nome: servico.nome,
            duracaoMinutos: servico.duracaoMinutos,
            descricao: servico.descricao,
            preco: Number(servico.preco),
            ativo: servico.ativo,
            tipoDisponibilidade: servico.tipoDisponibilidade,
            diasSemana: servico
                .disponibilidadesSemanais
                .filter((item) => item.ativo)
                .map((item) => item.diaSemana)
                .sort((a, b) => a - b),
            excecoes: servico
                .excecoesDisponibilidade
                .map((excecao) => ({
                data: new Intl.DateTimeFormat("en-CA", {
                    timeZone: "America/Sao_Paulo",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                }).format(excecao.data),
                disponivel: excecao.disponivel,
            })),
            createdAt: servico.createdAt,
            updatedAt: servico.updatedAt,
        }));
        return res.json(resposta);
    }
    catch (erro) {
        console.error("Erro ao buscar serviços:", erro);
        return res.status(500).json({
            erro: "Erro ao buscar serviços",
        });
    }
});
app.delete("/empresa/servicos/:id", auth_1.auth, async (req, res) => {
    const empresaId = req.usuario.empresaId;
    const id = Number(req.params.id);
    const servico = await prisma_1.prisma.servico.findFirst({
        where: {
            id,
            empresaId
        }
    });
    if (!servico) {
        return res.status(404).json({
            erro: "Serviço não encontrado"
        });
    }
    await prisma_1.prisma.servico.delete({
        where: {
            id
        }
    });
    return res.json({
        messagem: "Serviço excluido com sucesso"
    });
});
app.put("/empresa/servicos/:id", auth_1.auth, async (req, res) => {
    try {
        const empresaId = req.usuario.empresaId;
        const id = Number(req.params.id);
        const { nome, preco, duracaoMinutos, descricao, ativo, tipoDisponibilidade, diasSemana, excecoes, } = req.body;
        if (Number.isNaN(id)) {
            return res.status(400).json({
                erro: "ID inválido",
            });
        }
        const servicoExistente = await prisma_1.prisma.servico.findFirst({
            where: {
                id,
                empresaId,
            },
        });
        if (!servicoExistente) {
            return res.status(404).json({
                erro: "Serviço não encontrado",
            });
        }
        if (tipoDisponibilidade !==
            "TODOS_OS_DIAS" &&
            tipoDisponibilidade !==
                "DIAS_DA_SEMANA") {
            return res.status(400).json({
                erro: "Tipo de disponibilidade inválido",
            });
        }
        if (tipoDisponibilidade ===
            "DIAS_DA_SEMANA" &&
            (!Array.isArray(diasSemana) ||
                diasSemana.length === 0)) {
            return res.status(400).json({
                erro: "Selecione pelo menos um dia da semana",
            });
        }
        const servicoAtualizado = await prisma_1.prisma.$transaction(async (tx) => {
            await tx
                .disponibilidadeSemanalServico
                .deleteMany({
                where: {
                    servicoId: id,
                },
            });
            await tx
                .excecaoDisponibilidadeServico
                .deleteMany({
                where: {
                    servicoId: id,
                },
            });
            await tx.servico.update({
                where: {
                    id,
                },
                data: {
                    nome,
                    preco,
                    duracaoMinutos,
                    descricao: descricao || null,
                    ativo,
                    tipoDisponibilidade,
                },
            });
            if (tipoDisponibilidade ===
                "DIAS_DA_SEMANA" &&
                Array.isArray(diasSemana)) {
                const diasValidos = diasSemana.filter((dia) => Number.isInteger(dia) &&
                    dia >= 0 &&
                    dia <= 6);
                if (diasValidos.length !==
                    diasSemana.length) {
                    throw new Error("Dia da semana inválido");
                }
                await tx
                    .disponibilidadeSemanalServico
                    .createMany({
                    data: diasValidos.map((diaSemana) => ({
                        servicoId: id,
                        diaSemana,
                        ativo: true,
                    })),
                });
            }
            if (Array.isArray(excecoes) &&
                excecoes.length > 0) {
                await tx
                    .excecaoDisponibilidadeServico
                    .createMany({
                    data: excecoes.map((excecao) => ({
                        servicoId: id,
                        data: new Date(`${excecao.data}T12:00:00-03:00`),
                        disponivel: Boolean(excecao.disponivel),
                    })),
                });
            }
            return tx.servico.findUnique({
                where: {
                    id,
                },
                include: {
                    disponibilidadesSemanais: true,
                    excecoesDisponibilidade: true,
                },
            });
        });
        return res.json(servicoAtualizado);
    }
    catch (erro) {
        console.error("Erro ao atualizar serviço:", erro);
        return res.status(500).json({
            erro: "Erro ao atualizar serviço",
        });
    }
});
//horario
app.post("/empresa/horarios", auth_1.auth, async (req, res) => {
    try {
        const { diaSemana, horaInicio, horaFim, ativo } = req.body;
        const empresaId = req.usuario.empresaId;
        const horario = await prisma_1.prisma.horarioFuncionamento.create({
            data: {
                empresaId,
                diaSemana,
                horaInicio,
                horaFim,
                ativo
            }
        });
        return res.status(201).json(horario);
    }
    catch (erro) {
        res.status(400).json({
            erro: "erro ao criar horario"
        });
    }
});
app.get("/empresa/horarios", auth_1.auth, async (req, res) => {
    try {
        const empresaId = req.usuario.empresaId;
        const horario = await prisma_1.prisma.horarioFuncionamento.findMany({
            where: {
                empresaId
            }
        });
        return res.json(horario);
    }
    catch (erro) {
        console.error(erro);
        return res.status(500).json({
            erro: "Erro ao buscar horario"
        });
    }
});
app.delete("/empresa/horarios/:id", auth_1.auth, async (req, res) => {
    const empresaId = req.usuario.empresaId;
    const id = Number(req.params.id);
    const servico = await prisma_1.prisma.horarioFuncionamento.findFirst({
        where: {
            id,
            empresaId
        }
    });
    if (!servico) {
        return res.status(404).json({
            erro: "Horario não encontrado"
        });
    }
    await prisma_1.prisma.horarioFuncionamento.delete({
        where: {
            id
        }
    });
    return res.json({
        messagem: "horario excluido com sucesso"
    });
});
app.put("/empresa/horarios/:id", auth_1.auth, async (req, res) => {
    const empresaId = req.usuario.empresaId;
    const id = Number(req.params.id);
    const { diaSemana, horaInicio, horaFim, ativo } = req.body;
    try {
        const horario = await prisma_1.prisma.horarioFuncionamento.findFirst({
            where: {
                id,
                empresaId
            }
        });
        if (!horario) {
            return res.status(404).json({
                erro: "horario não encontrado"
            });
        }
        const atualizado = await prisma_1.prisma.horarioFuncionamento.update({
            where: {
                id
            },
            data: {
                diaSemana,
                horaInicio,
                horaFim,
                ativo
            }
        });
        return res.json(atualizado);
    }
    catch (erro) {
        return res.status(500).json({
            erro: "Erro ao atualizar horario"
        });
    }
});
app.post("/empresa/clientes", auth_1.auth, async (req, res) => {
    try {
        const { nome, email, telefone } = req.body;
        const empresaId = req.usuario.empresaId;
        const clienteExistente = await prisma_1.prisma.cliente.findFirst({
            where: {
                empresaId,
                telefone,
            },
        });
        if (clienteExistente) {
            return res.status(409).json({
                erro: "telefone ja cadastrado"
            });
        }
        const cliente = await prisma_1.prisma.cliente.create({
            data: {
                empresaId,
                nome,
                email,
                telefone
            }
        });
        res.status(201).json(cliente);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            erro: "erro ao cadastrar cliente"
        });
    }
});
app.get("/empresa/clientes", auth_1.auth, async (req, res) => {
    try {
        const empresaId = req.usuario.empresaId;
        const cliente = await prisma_1.prisma.cliente.findMany({
            where: {
                empresaId
            }
        });
        return res.json(cliente);
    }
    catch (erro) {
        console.error(erro);
        return res.status(500).json({
            erro: "Erro ao buscar cliente"
        });
    }
});
function criarDataComHorario(data, horario) {
    const resultado = new Date(data);
    const [hora, minuto] = horario.split(":");
    resultado.setHours(Number(hora), Number(minuto), 0, 0);
    return resultado;
}
app.post("/empresa/agendamentos", auth_1.auth, async (req, res) => {
    try {
        const { clienteId, servicoId, datahoraInicio } = req.body;
        const empresaId = req.usuario.empresaId;
        // 1. Verificar cliente
        const cliente = await prisma_1.prisma.cliente.findFirst({
            where: {
                id: clienteId,
                empresaId
            }
        });
        if (!cliente) {
            return res.status(404).json({
                erro: "Cliente não encontrado"
            });
        }
        // 2. Verificar serviço
        const servico = await prisma_1.prisma.servico.findFirst({
            where: {
                id: servicoId,
                empresaId
            }
        });
        if (!servico) {
            return res.status(404).json({
                erro: "Serviço não encontrado"
            });
        }
        // 3. Calcular horário final
        const inicio = new Date(datahoraInicio);
        const fim = new Date(inicio.getTime() +
            servico.duracaoMinutos *
                60 *
                1000);
        // 4. Descobrir o dia da semana
        const diaSemana = inicio.getDay();
        // 5. Buscar horários de funcionamento
        const horariosFuncionamento = await prisma_1.prisma.horarioFuncionamento.findMany({
            where: {
                empresaId,
                diaSemana,
                ativo: true
            }
        });
        // 6. Verificar se o agendamento
        // cabe em algum intervalo
        const dentroDoHorario = horariosFuncionamento.some((horario) => {
            const inicioFuncionamento = criarDataComHorario(inicio, horario.horaInicio);
            const fimFuncionamento = criarDataComHorario(inicio, horario.horaFim);
            return (inicio >= inicioFuncionamento &&
                fim <= fimFuncionamento);
        });
        if (!dentroDoHorario) {
            return res.status(400).json({
                erro: "O horário escolhido está fora do horário de funcionamento"
            });
        }
        // 7. Verificar conflito
        const conflito = await prisma_1.prisma.agendamento.findFirst({
            where: {
                empresaId,
                status: {
                    in: [
                        "AGUARDANDO_CONFIRMACAO",
                        "AGENDADO"
                    ]
                },
                datahoraInicio: {
                    lt: fim
                },
                datahoraFim: {
                    gt: inicio
                }
            }
        });
        if (conflito) {
            return res.status(409).json({
                erro: "Horário já está ocupado"
            });
        }
        // 8. Criar agendamento
        const agendamento = await prisma_1.prisma.agendamento.create({
            data: {
                empresaId,
                clienteId,
                servicoId,
                datahoraInicio: inicio,
                datahoraFim: fim,
                status: "AGENDADO"
            }
        });
        return res.status(201).json(agendamento);
    }
    catch (erro) {
        console.error("Erro ao criar agendamento:", erro);
        return res.status(500).json({
            erro: "Erro ao criar agendamento"
        });
    }
});
app.get("/empresa/agendamentos", auth_1.auth, async (req, res) => {
    try {
        const empresaId = req.usuario.empresaId;
        const agendamento = await prisma_1.prisma.agendamento.findMany({
            where: {
                empresaId
            }
        });
        return res.json(agendamento);
    }
    catch (erro) {
        console.error(erro);
        return res.status(500).json({
            erro: "Erro ao buscar agendamentos"
        });
    }
});
//cancelar agendamento
app.patch("/empresa/agendamentos/:id/cancelar", auth_1.auth, async (req, res) => {
    try {
        const empresaId = req.usuario.empresaId;
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({
                erro: "ID do agendamento inválido",
            });
        }
        const agendamento = await prisma_1.prisma.agendamento.findFirst({
            where: {
                id,
                empresaId,
            },
        });
        if (!agendamento) {
            return res.status(404).json({
                erro: "Agendamento não encontrado",
            });
        }
        if (agendamento.status === "CANCELADO") {
            return res.status(409).json({
                erro: "Agendamento já está cancelado",
            });
        }
        if (agendamento.status === "CONCLUIDO") {
            return res.status(409).json({
                erro: "Não é possível cancelar um agendamento concluído",
            });
        }
        const agendamentoCancelado = await prisma_1.prisma.agendamento.update({
            where: {
                id,
            },
            data: {
                status: "CANCELADO",
            },
        });
        return res.json(agendamentoCancelado);
    }
    catch (erro) {
        console.error("Erro ao cancelar agendamento:", erro);
        return res.status(500).json({
            erro: "Erro ao cancelar agendamento",
        });
    }
});
app.put("/empresa/agendamentos/:id", auth_1.auth, async (req, res) => {
    try {
        const empresaId = req.usuario.empresaId;
        const id = Number(req.params.id);
        const { datahoraInicio } = req.body;
        if (Number.isNaN(id)) {
            return res.status(400).json({
                erro: "ID do agendamento inválido"
            });
        }
        if (!datahoraInicio) {
            return res.status(400).json({
                erro: "Informe a nova data e horário"
            });
        }
        // 1. Buscar agendamento
        const agendamento = await prisma_1.prisma.agendamento.findFirst({
            where: {
                id,
                empresaId
            },
            include: {
                servico: true
            }
        });
        if (!agendamento) {
            return res.status(404).json({
                erro: "Agendamento não encontrado"
            });
        }
        // 2. Permitir edição apenas de AGENDADO
        if (agendamento.status !== "AGENDADO") {
            return res.status(400).json({
                erro: "Somente agendamentos confirmados podem ser editados"
            });
        }
        // 3. Criar nova data de início
        const inicio = new Date(datahoraInicio);
        if (Number.isNaN(inicio.getTime())) {
            return res.status(400).json({
                erro: "Data e horário inválidos"
            });
        }
        // 4. Calcular novo horário final
        const fim = new Date(inicio.getTime() +
            agendamento.servico.duracaoMinutos *
                60 *
                1000);
        // 5. Buscar horários de funcionamento
        const diaSemana = inicio.getDay();
        const horariosFuncionamento = await prisma_1.prisma.horarioFuncionamento.findMany({
            where: {
                empresaId,
                diaSemana,
                ativo: true
            }
        });
        // 6. Verificar se cabe no funcionamento
        const dentroDoHorario = horariosFuncionamento.some((horario) => {
            const inicioFuncionamento = criarDataComHorario(inicio, horario.horaInicio);
            const fimFuncionamento = criarDataComHorario(inicio, horario.horaFim);
            return (inicio >= inicioFuncionamento &&
                fim <= fimFuncionamento);
        });
        if (!dentroDoHorario) {
            return res.status(400).json({
                erro: "O novo horário está fora do horário de funcionamento"
            });
        }
        // 7. Verificar conflito
        const conflito = await prisma_1.prisma.agendamento.findFirst({
            where: {
                empresaId,
                id: {
                    not: id
                },
                status: {
                    in: [
                        "AGUARDANDO_CONFIRMACAO",
                        "AGENDADO"
                    ]
                },
                datahoraInicio: {
                    lt: fim
                },
                datahoraFim: {
                    gt: inicio
                }
            }
        });
        if (conflito) {
            return res.status(409).json({
                erro: "O novo horário já está ocupado"
            });
        }
        // 8. Atualizar agendamento
        const agendamentoAtualizado = await prisma_1.prisma.agendamento.update({
            where: {
                id
            },
            data: {
                datahoraInicio: inicio,
                datahoraFim: fim
            }
        });
        return res.status(200).json(agendamentoAtualizado);
    }
    catch (erro) {
        console.error("Erro ao editar agendamento:", erro);
        return res.status(500).json({
            erro: "Erro ao editar agendamento"
        });
    }
});
const enviarMensagemWhatsApp_1 = require("./service/enviarMensagemWhatsApp");
app.post("/teste-whatsapp", async (req, res) => {
    try {
        const { telefone, mensagem } = req.body;
        const resultado = await (0, enviarMensagemWhatsApp_1.enviarMensagemWhatsApp)({
            telefone,
            mensagem,
        });
        return res.json({
            sucesso: true,
            resultado,
        });
    }
    catch (erro) {
        console.error(erro);
        return res.status(500).json({
            sucesso: false,
            erro: erro instanceof Error
                ? erro.message
                : "Erro desconhecido",
        });
    }
});
