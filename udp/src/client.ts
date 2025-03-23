import dgram from 'dgram';
import { writeFileSync } from 'fs';
import path from 'path';
import readline from 'readline';
import { env } from './env';
import { checkSum } from './functions/checkSum';
import { generateHash } from './functions/generateHash';
import { generateHeader } from './functions/generateHeader';

const client = dgram.createSocket('udp4');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function enviarMensagem(mensagem: string) {
  const buffer = Buffer.from(mensagem);

  client.send(buffer, 0, buffer.length, Number(env.port), env.host, (err) => {
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

  iniciarRecepcao(nomeArquivo);
}

function iniciarRecepcao(fileName: string) {
  const destino = path.join(__dirname, `../downloads/${fileName}`);
  const chunks: Buffer[] = [];
  let expectedSeq = 0;

  console.log(`📥 Iniciando recebimento do arquivo: ${fileName}`);

  function messageHandler(msg: Buffer) {
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
      writeFileSync(destino, arquivoFinal);
      console.log(`✅ EOF recebido. Arquivo "${fileName}" montado!`);

      const hash = generateHash(destino);
      console.log(`🔑 Hash SHA-256 do arquivo recebido: ${hash}`);

      client.off('message', messageHandler); // Remove listener depois de receber tudo
      return;
    }

    // Validação de pacote recebido
    if (seqNum === expectedSeq && isAck === 0 && checkSum(payload) === checksum) {
      console.log(`✅ Pacote válido recebido: Seq ${seqNum}`);

      chunks.push(payload);

      const ack = generateHeader(seqNum, 1, 0, 0);
      client.send(ack, 0, ack.length, Number(env.port), env.host);

      expectedSeq++;
    } else {
      console.log(`⚠️ Pacote inválido ou fora de ordem! Esperado: ${expectedSeq}, Recebido: ${seqNum}`);
      // Reenvia o ACK do último pacote válido (ou anterior)
      const ack = generateHeader(expectedSeq - 1, 1, 0, 0);
      client.send(ack, 0, ack.length, Number(env.port), env.host);
    }
  }

  client.on('message', messageHandler);
}
