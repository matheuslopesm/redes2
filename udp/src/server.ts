import dgram from 'dgram';

const server = dgram.createSocket('udp4');

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