import dgram from 'dgram';
import { writeFileSync } from 'fs';
import path from 'path';
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
    }
  });
}

rl.on('line', (input: string) => {
  const [comando, ...args] = input.trim().split(' ');

  switch (comando.toLowerCase()) {
    case 'exit':
      console.log('Encerrando cliente...');
      rl.close();
      client.close();
      return;
    case 'listfiles':
      enviarMensagem('LISTFILES');
      return;
    case 'downloadfile':
      downloadMessage(args)
      return;
  }
  enviarMensagem(input);
});

client.on('message', (msg: Buffer, rinfo) => {
  console.log(`🔥 Servidor (${rinfo.address}:${rinfo.port}): ${msg.toString()}`);
});

function downloadMessage(args: string[]) {
  const nomeArquivo = args.join(' ');

  if (!nomeArquivo) {
    console.log('Você precisa informar o nome do arquivo!');
    return;
  }

  enviarMensagem(`DOWNLOADFILE ${nomeArquivo}`);

  client.once('message', (msg) => {
    const destino = path.join(__dirname, `../downloads/${nomeArquivo}`);
    writeFileSync(destino, msg);
    console.log(`Arquivo "${nomeArquivo}" salvo em downloads/`);
  });
}