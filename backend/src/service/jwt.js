"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gerartoken = gerartoken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function gerartoken(empresaId, email) {
    const token = jsonwebtoken_1.default.sign({
        empresaId,
        email
    }, process.env.JWT_SECRET, {
        expiresIn: "1d"
    });
    return token;
}
