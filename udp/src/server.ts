/* eslint-disable @typescript-eslint/no-unused-vars */
import dgram from 'dgram';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { env } from './env';
import { checkSum } from './functions/checkSum';
import { generateHash } from './functions/generateHash';
import { generateHeader } from './functions/generateHeader';

const server = dgram.createSocket('udp4');
const UPLOADS = path.join(__dirname, '../uploads');

const clientesAutenticados = new Set<string>();

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
            return; // ainda não implementado
    }
});

server.on('listening', () => {
    const address = server.address();
    console.log(`🖥️ Server operando no endereço ${address.address}:${address.port}`);
});

server.bind(Number(env.port));

function autenticarCliente(msg: string, rinfo: dgram.RemoteInfo, clienteChave: string) {
    if (msg !== env.pass) {
        server.send(Buffer.from('🔒 Digite a senha para autenticação:'), rinfo.port, rinfo.address);
        return;
    }

    clientesAutenticados.add(clienteChave);
    console.log(`✅ Cliente autenticado com sucesso!`);
    server.send(Buffer.from('✅ Autenticação concluída com sucesso!'), rinfo.port, rinfo.address);
}

function listFile(rinfo: dgram.RemoteInfo) {
    try {
        const arquivos = readdirSync(UPLOADS);

        if (arquivos.length === 0) {
            const resposta = Buffer.from('Não há arquivos no servidor!');
            server.send(resposta, rinfo.port, rinfo.address);
        } else {
            const lista = arquivos.join('\n');
            const resposta = Buffer.from(`📁 Arquivos disponíveis:\n${lista}`);
            server.send(resposta, rinfo.port, rinfo.address);
        }
    } catch (err) {
        const erroMsg = Buffer.from('Erro ao listar arquivos!');
        server.send(erroMsg, rinfo.port, rinfo.address);
    }
}

function downloadFile(rinfo: dgram.RemoteInfo, args: string[]) {
    const nomeArquivo = args.join('');

    if (!nomeArquivo) {
        const resposta = Buffer.from('Nome do arquivo não especificado.');
        server.send(resposta, rinfo.port, rinfo.address);
        return;
    }

    const caminhoArquivo = path.join(UPLOADS, nomeArquivo);

    try {
        const hash = generateHash(caminhoArquivo);
        sendFile(rinfo, caminhoArquivo, hash);
    } catch (err) {
        console.error('Erro ao ler o arquivo:', err);
        const resposta = Buffer.from('Erro: arquivo não encontrado ou erro na leitura.');
        server.send(resposta, rinfo.port, rinfo.address);
    }
}

function sendFile(rinfo: dgram.RemoteInfo, filePath: string, hash: string) {
    const fileBuffer = readFileSync(filePath);
    const chunkSize = 1450;

    const windowSize = 4;
    let base = 0;
    let nextSeqNum = 0;
    let offset = 0;
    const timeouts: NodeJS.Timeout[] = [];

    sendPacketsInWindow();

    function ackHandler(ackMsg: Buffer, ackRinfo: dgram.RemoteInfo) {
        if (ackRinfo.address !== rinfo.address || ackRinfo.port !== rinfo.port) return;

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
                const eofHeader = generateHeader(nextSeqNum, 0, 1, 0);
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
            const checksum = checkSum(chunk);
            const header = generateHeader(nextSeqNum, 0, 0, checksum);
            const packet = Buffer.concat([header, chunk]);

            server.send(packet, rinfo.port, rinfo.address);
            console.log(`📤 Pacote enviado: Seq ${nextSeqNum}`);

            setRetransmission(nextSeqNum, packet);

            offset += chunkSize;
            nextSeqNum++;
        }
    }

    function setRetransmission(seqNum: number, packet: Buffer) {
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
