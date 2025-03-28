"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-unused-vars */
const dgram_1 = __importDefault(require("dgram"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const env_1 = require("./env");
const checkSum_1 = require("./functions/checkSum");
const generateHash_1 = require("./functions/generateHash");
const generateHeader_1 = require("./functions/generateHeader");
const server = dgram_1.default.createSocket('udp4');
const STORAGE = path_1.default.join(__dirname, '../storage');
const UPLOADS = path_1.default.join(__dirname, '../uploads');
const clientesAutenticados = new Set();
server.on('error', (err) => {
    console.error(`Erro no servidor:\n${err.stack}`);
    server.close();
});
server.on('message', (msg, rinfo) => {
    const cmd = msg.toString().trim();
    const clienteChave = `${rinfo.address}:${rinfo.port}`;
    if (!clientesAutenticados.has(clienteChave)) {
        autenticarCliente(cmd, rinfo, clienteChave);
        return;
    }
    console.log(`💬 Cliente (${rinfo.address}:${rinfo.port}): ${msg}`);
    const [comando, ...args] = cmd.split(' ');
    switch (comando) {
        case 'LISTFILE':
            return listFile(rinfo);
        case 'DOWNLOADFILE':
            return downloadFile(rinfo, args);
        case 'UPLOADFILE':
            return iniciarRecepcao(args.join(''), rinfo);
    }
});
server.on('listening', () => {
    const address = server.address();
    console.log(`🖥️ Server operando no endereço ${address.address}:${address.port}`);
});
server.bind(Number(env_1.env.port));
function autenticarCliente(msg, rinfo, clienteChave) {
    if (msg !== env_1.env.pass) {
        server.send(Buffer.from('🔒 Digite a senha para autenticação:'), rinfo.port, rinfo.address);
        return;
    }
    clientesAutenticados.add(clienteChave);
    console.log(`✅ Cliente autenticado com sucesso!`);
    server.send(Buffer.from('✅ Autenticação concluída com sucesso!'), rinfo.port, rinfo.address);
}
function listFile(rinfo) {
    try {
        const arquivos = (0, fs_1.readdirSync)(STORAGE);
        if (arquivos.length === 0) {
            const resposta = Buffer.from('Não há arquivos no servidor!');
            server.send(resposta, rinfo.port, rinfo.address);
        }
        else {
            const lista = arquivos.join('\n');
            const resposta = Buffer.from(`📁 Arquivos disponíveis:\n${lista}`);
            server.send(resposta, rinfo.port, rinfo.address);
        }
    }
    catch (err) {
        const erroMsg = Buffer.from('Erro ao listar arquivos!');
        server.send(erroMsg, rinfo.port, rinfo.address);
    }
}
function downloadFile(rinfo, args) {
    const nomeArquivo = args.join('');
    if (!nomeArquivo) {
        const resposta = Buffer.from('Nome do arquivo não especificado.');
        server.send(resposta, rinfo.port, rinfo.address);
        return;
    }
    const caminhoArquivo = path_1.default.join(STORAGE, nomeArquivo);
    try {
        const hash = (0, generateHash_1.generateHash)(caminhoArquivo);
        sendFile(rinfo, caminhoArquivo, hash);
    }
    catch (err) {
        console.error('Erro ao ler o arquivo:', err);
        const resposta = Buffer.from('Erro: arquivo não encontrado ou erro na leitura.');
        server.send(resposta, rinfo.port, rinfo.address);
    }
}
function sendFile(rinfo, filePath, hash) {
    const fileBuffer = (0, fs_1.readFileSync)(filePath);
    const chunkSize = 1450;
    const windowSize = 4;
    let base = 0;
    let nextSeqNum = 0;
    let offset = 0;
    const timeouts = [];
    sendPacketsInWindow();
    function ackHandler(ackMsg, ackRinfo) {
        if (ackRinfo.address !== rinfo.address || ackRinfo.port !== rinfo.port)
            return;
        const ackSeqNum = ackMsg.readUInt32BE(0);
        const isAck = ackMsg.readUInt8(4);
        if (isAck === 1) {
            console.log(`✅ ACK recebido para Seq ${ackSeqNum}`);
            clearTimeout(timeouts[ackSeqNum]);
            if (ackSeqNum === base) {
                base++;
                sendPacketsInWindow();
            }
            if (base * chunkSize >= fileBuffer.length) {
                const eofHeader = (0, generateHeader_1.generateHeader)(nextSeqNum, 0, 1, 0);
                server.send(eofHeader, rinfo.port, rinfo.address);
                console.log('✅ EOF enviado, finalizando transmissão!');
                console.log(`🔑 Hash SHA-256 do arquivo enviado: ${hash}`);
                // Limpa os timeouts
                timeouts.forEach(timeout => clearTimeout(timeout));
                // ✅ Remove o listener do ACK para esse cliente
                server.off('message', ackHandler);
            }
        }
    }
    // ✅ Adiciona o listener
    server.on('message', ackHandler);
    function sendPacketsInWindow() {
        while (nextSeqNum < base + windowSize && offset < fileBuffer.length) {
            const chunk = fileBuffer.slice(offset, offset + chunkSize);
            const checksum = (0, checkSum_1.checkSum)(chunk);
            const header = (0, generateHeader_1.generateHeader)(nextSeqNum, 0, 0, checksum);
            const packet = Buffer.concat([header, chunk]);
            server.send(packet, rinfo.port, rinfo.address);
            console.log(`📤 Pacote enviado: Seq ${nextSeqNum}`);
            setRetransmission(nextSeqNum, packet);
            offset += chunkSize;
            nextSeqNum++;
        }
    }
    function setRetransmission(seqNum, packet) {
        if (timeouts[seqNum]) {
            clearTimeout(timeouts[seqNum]);
        }
        timeouts[seqNum] = setTimeout(() => {
            console.log(`⏰ Timeout! Retransmitindo pacote Seq ${seqNum}`);
            server.send(packet, rinfo.port, rinfo.address);
            setRetransmission(seqNum, packet);
        }, 1000);
    }
}
function iniciarRecepcao(fileName, rinfo) {
    if (!fileName) {
        server.send(Buffer.from('Erro: Nome do arquivo não especificado!'), rinfo.port, rinfo.address);
        return;
    }
    console.log(`📥 Iniciando recepção do arquivo: ${fileName}`);
    const destino = path_1.default.join(UPLOADS, fileName);
    const chunks = [];
    let expectedSeq = 0;
    function messageHandler(msg, senderInfo) {
        if (senderInfo.address !== rinfo.address || senderInfo.port !== rinfo.port)
            return;
        const seqNum = msg.readUInt32BE(0);
        const isAck = msg.readUInt8(4);
        const eofFlag = msg.readUInt8(5);
        const checksum = msg.readUInt32BE(6);
        const payload = msg.slice(10);
        if (eofFlag === 1) {
            const arquivoFinal = Buffer.concat(chunks);
            (0, fs_1.writeFileSync)(destino, arquivoFinal);
            console.log(`✅ EOF recebido. Arquivo "${fileName}" montado com sucesso!`);
            const hash = (0, generateHash_1.generateHash)(destino);
            console.log(`🔑 Hash SHA-256 do arquivo recebido: ${hash}`);
            server.off('message', messageHandler);
            return;
        }
        if (seqNum === expectedSeq && isAck === 0 && (0, checkSum_1.checkSum)(payload) === checksum) {
            console.log(`✅ Pacote válido recebido: Seq ${seqNum}`);
            chunks.push(payload);
            const ack = (0, generateHeader_1.generateHeader)(seqNum, 1, 0, 0);
            server.send(ack, rinfo.port, rinfo.address);
            expectedSeq++;
        }
        else {
            console.log(`⚠️ Pacote inválido ou fora de ordem! Esperado: ${expectedSeq}, Recebido: ${seqNum}`);
            const ack = (0, generateHeader_1.generateHeader)(expectedSeq - 1, 1, 0, 0);
            server.send(ack, rinfo.port, rinfo.address);
        }
    }
    server.on('message', messageHandler);
}
