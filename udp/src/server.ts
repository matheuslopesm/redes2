/* eslint-disable @typescript-eslint/no-unused-vars */
import dgram from 'dgram';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';

const server = dgram.createSocket('udp4');
const UPLOADS = path.join(__dirname, '../uploads');

server.on('error', (err) => {
    console.error(`Erro no servidor:\n${err.stack}`);
    server.close();
});

server.on('message', (msg, rinfo) => {
    const cmd = msg.toString().trim();
    console.log(`💬 Cliente (${rinfo.address}:${rinfo.port}): ${msg}`);

    const [comando, ...args] = cmd.split(' ');

    switch (comando) {
        case 'LISTFILES':
            return listFiles(rinfo);
        case 'DOWNLOADFILE':
            return downloadFile(rinfo, args);
    }

});

server.on('listening', () => {
    const address = server.address();
    console.log(`🔥 Server operando no endereço ${address.address}:${address.port}`);
});

server.bind(3001);

function listFiles(rinfo: dgram.RemoteInfo) {
    try {
        const arquivos = readdirSync(UPLOADS);

        if (arquivos.length === 0) {
            const resposta = Buffer.from('Não há arquivos no servidor!');
            server.send(resposta, rinfo.port, rinfo.address);
        } else {
            const lista = arquivos.join('\n');
            const resposta = Buffer.from(`Arquivos disponíveis:\n${lista}`);
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
        const conteudo = readFileSync(caminhoArquivo);

        server.send(conteudo, rinfo.port, rinfo.address, (err) => {
            if (err) {
                console.error('Erro ao baixar arquivo:', err);
            } else {
                console.log(`Arquivo "${nomeArquivo}" enviado para Cliente (${rinfo.address}:${rinfo.port})`);
            }
        });
    } catch (err) {
        console.error('Erro ao ler o arquivo:', err);
        const resposta = Buffer.from('Erro: arquivo não encontrado ou erro na leitura.');
        server.send(resposta, rinfo.port, rinfo.address);
    }
}