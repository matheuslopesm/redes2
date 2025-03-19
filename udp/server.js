"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dgram_1 = __importDefault(require("dgram"));
const server = dgram_1.default.createSocket('udp4');
server.on('error', (err) => {
    console.error(`Erro no servidor:\n${err.stack}`);
    server.close();
});
server.on('message', (msg, rinfo) => {
    console.log(`Nova mensagem: ${msg} de ${rinfo.address}:${rinfo.port}`);
});
server.on('listening', () => {
    const address = server.address();
    console.log(`Server operando no endereço ${address.address}:${address.port}`);
});
server.bind(3001);
