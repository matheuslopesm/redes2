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
const server = dgram_1.default.createSocket('udp4');
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
            return;
    }
});
server.on('listening', () => {
    const address = server.address();
    console.log(`🖥️ Server operando no endereço ${address.address}:${address.port}`);
});
server.bind(Number(env_1.env.port));
function listFile(rinfo) {
    try {
        const arquivos = (0, fs_1.readdirSync)(UPLOADS);
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
    const caminhoArquivo = path_1.default.join(UPLOADS, nomeArquivo);
    try {
        const conteudo = (0, fs_1.readFileSync)(caminhoArquivo);
        server.send(conteudo, rinfo.port, rinfo.address, (err) => {
            if (err) {
                console.error('Erro ao baixar arquivo:', err);
            }
            else {
                console.log(`Arquivo "${nomeArquivo}" enviado para Cliente (${rinfo.address}:${rinfo.port})`);
            }
        });
    }
    catch (err) {
        console.error('Erro ao ler o arquivo:', err);
        const resposta = Buffer.from('Erro: arquivo não encontrado ou erro na leitura.');
        server.send(resposta, rinfo.port, rinfo.address);
    }
}
function autenticarCliente(msg, rinfo, clienteChave) {
    if (msg !== env_1.env.pass) {
        server.send(Buffer.from('🔒 Digite a senha para autenticação:'), rinfo.port, rinfo.address);
        return;
    }
    clientesAutenticados.add(clienteChave);
    console.log(`✅ Cliente autenticado com sucesso!`);
    server.send(Buffer.from('✅ Autenticação concluída com sucesso!'), rinfo.port, rinfo.address);
}
