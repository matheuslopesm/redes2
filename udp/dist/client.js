"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dgram_1 = __importDefault(require("dgram"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const readline_1 = __importDefault(require("readline"));
const env_1 = require("./env");
const client = dgram_1.default.createSocket('udp4');
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout
});
function enviarMensagem(mensagem) {
    const buffer = Buffer.from(mensagem);
    client.send(buffer, 0, buffer.length, Number(env_1.env.port), env_1.env.host, (err) => {
        if (err) {
            console.error('Erro ao enviar mensagem:', err);
            client.close();
        }
    });
}
rl.on('line', (input) => {
    const [comando, ...args] = input.trim().split(' ');
    switch (comando.toLowerCase()) {
        case 'exit':
            console.log('Encerrando cliente...');
            rl.close();
            client.close();
            return;
        case 'listfile':
            enviarMensagem('LISTFILE');
            return;
        case 'downloadfile':
            downloadMessage(args);
            return;
        case 'uploadfile':
            return;
    }
    enviarMensagem(input);
});
client.on('message', (msg, rinfo) => {
    console.log(`🔥 Servidor (${rinfo.address}:${rinfo.port}): ${msg.toString()}`);
});
function downloadMessage(args) {
    const nomeArquivo = args.join(' ');
    if (!nomeArquivo) {
        console.log('Você precisa informar o nome do arquivo!');
        return;
    }
    enviarMensagem(`DOWNLOADFILE ${nomeArquivo}`);
    client.once('message', (msg) => {
        const destino = path_1.default.join(__dirname, `../downloads/${nomeArquivo}`);
        (0, fs_1.writeFileSync)(destino, msg);
        console.log(`Arquivo "${nomeArquivo}" salvo em downloads/`);
    });
}
