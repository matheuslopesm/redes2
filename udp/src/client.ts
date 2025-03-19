import dgram from 'dgram';
import readline from 'readline';

const PORT = 3001;
const HOST = '127.0.0.1';

const client = dgram.createSocket('udp4');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function enviarMensagem(mensagem: string) {
  const buffer = Buffer.from(mensagem);

  client.send(buffer, 0, buffer.length, PORT, HOST, (err) => {
    if (err) {
      console.error('Erro ao enviar mensagem:', err);
      client.close();
    } else {
      console.log(`Mensagem enviada para o servidor: "${mensagem}"`);
    }
  });
}

rl.on('line', (input: string) => {
  if (input.toLowerCase() === 'exit') {
    console.log('Encerrando cliente...');
    rl.close();
    client.close();
  } else {
    enviarMensagem(input);
  }
});

client.on('message', (msg: Buffer, rinfo) => {
  console.log(`Resposta do servidor ${rinfo.address}:${rinfo.port}: ${msg.toString()}`);
});
