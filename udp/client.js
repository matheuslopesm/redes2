"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dgram_1 = __importDefault(require("dgram"));
const readline_1 = __importDefault(require("readline"));
const PORT = 3001;
const HOST = '127.0.0.1';
const client = dgram_1.default.createSocket('udp4');
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout
});
function enviarMensagem(mensagem) {
    const buffer = Buffer.from(mensagem);
    client.send(buffer, 0, buffer.length, PORT, HOST, (err) => {
        if (err) {
            console.error('Erro ao enviar mensagem:', err);
            client.close();
        }
        else {
            console.log(`Mensagem enviada para o servidor: "${mensagem}"`);
        }
    });
}
rl.on('line', (input) => {
    if (input.toLowerCase() === 'exit') {
        console.log('Encerrando cliente...');
        rl.close();
        client.close();
    }
    else {
        enviarMensagem(input);
    }
});
client.on('message', (msg, rinfo) => {
    console.log(`Resposta do servidor ${rinfo.address}:${rinfo.port}: ${msg.toString()}`);
});
