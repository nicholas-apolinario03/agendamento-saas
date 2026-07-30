"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*import app from "./app";

const PORT = 3000;

app.listen(PORT, ()=> {

    console.log(`servidor rodando na porta ${PORT}`)
});*/
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const PORT = 3000;
app_1.default.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
