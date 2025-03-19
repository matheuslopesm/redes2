/* eslint-disable @typescript-eslint/no-unused-vars */
import dgram from 'dgram';
import { readdirSync } from 'fs';
import path from 'path';

const server = dgram.createSocket('udp4');
const UPLOADS = path.join(__dirname, '../uploads');

server.on('error', (err) => {
    console.error(`Erro no servidor:\n${err.stack}`);
    server.close();
});

server.on('message', (msg, rinfo) => {
    const cmd = msg.toString().trim();
    console.log(`Nova mensagem: ${msg} de ${rinfo.address}:${rinfo.port}`);

    switch (cmd) {
        case 'LISTFILES':
            return listFiles(rinfo);
    }

});

server.on('listening', () => {
    const address = server.address();
    console.log(`Server operando no endereço ${address.address}:${address.port}`);
});

server.bind(3001);

function listFiles(rinfo: dgram.RemoteInfo) {
    try {
        const arquivos = readdirSync(UPLOADS);

        if (arquivos.length === 0) {
            const resposta = Buffer.from('Nenhum arquivo disponível no servidor.');
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

function downloadFile() {

}