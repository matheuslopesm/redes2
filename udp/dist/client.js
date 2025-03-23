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
const checkSum_1 = require("./functions/checkSum");
const generateHash_1 = require("./functions/generateHash");
const generateHeader_1 = require("./functions/generateHeader");
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
            return; // Falta implementar
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
    iniciarRecepcao(nomeArquivo);
}
function iniciarRecepcao(fileName) {
    const destino = path_1.default.join(__dirname, `../downloads/${fileName}`);
    const chunks = [];
    let expectedSeq = 0;
    console.log(`📥 Iniciando recebimento do arquivo: ${fileName}`);
    function messageHandler(msg) {
        const msgString = msg.toString();
        if (msgString.startsWith('Erro:') || msgString.startsWith('Nome do arquivo não especificado')) {
            console.log(`⚠️ ${msgString}`);
            client.off('message', messageHandler);
            return;
        }
        // Trata como pacote binário com header + payload
        const seqNum = msg.readUInt32BE(0);
        const isAck = msg.readUInt8(4);
        const eofFlag = msg.readUInt8(5);
        const checksum = msg.readUInt32BE(6);
        const payload = msg.slice(10);
        // Se EOF, finaliza o recebimento
        if (eofFlag === 1) {
            const arquivoFinal = Buffer.concat(chunks);
            (0, fs_1.writeFileSync)(destino, arquivoFinal);
            console.log(`✅ EOF recebido. Arquivo "${fileName}" montado!`);
            const hash = (0, generateHash_1.generateHash)(destino);
            console.log(`🔑 Hash SHA-256 do arquivo recebido: ${hash}`);
            client.off('message', messageHandler); // Remove listener depois de receber tudo
            return;
        }
        // Validação de pacote recebido
        if (seqNum === expectedSeq && isAck === 0 && (0, checkSum_1.checkSum)(payload) === checksum) {
            console.log(`✅ Pacote válido recebido: Seq ${seqNum}`);
            chunks.push(payload);
            const ack = (0, generateHeader_1.generateHeader)(seqNum, 1, 0, 0);
            client.send(ack, 0, ack.length, Number(env_1.env.port), env_1.env.host);
            expectedSeq++;
        }
        else {
            console.log(`⚠️ Pacote inválido ou fora de ordem! Esperado: ${expectedSeq}, Recebido: ${seqNum}`);
            // Reenvia o ACK do último pacote válido (ou anterior)
            const ack = (0, generateHeader_1.generateHeader)(expectedSeq - 1, 1, 0, 0);
            client.send(ack, 0, ack.length, Number(env_1.env.port), env_1.env.host);
        }
    }
    client.on('message', messageHandler);
}
