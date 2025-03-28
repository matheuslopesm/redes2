/* eslint-disable @typescript-eslint/no-unused-vars */
import dgram from 'dgram';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import readline from 'readline';
import { env } from './env';
import { checkSum } from './functions/checkSum';
import { generateHash } from './functions/generateHash';
import { generateHeader } from './functions/generateHeader';

const client = dgram.createSocket('udp4');
const STORAGE = path.join(__dirname, '../storage');

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
      uploadMessage(args);
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

function uploadMessage(args: string[]) {
  const nomeArquivo = args.join(' ');

  if (!nomeArquivo) {
    console.log('Você precisa informar o nome do arquivo!');
    return;
  }

  const caminhoArquivo = path.join(STORAGE, nomeArquivo);

  try {
    const fileBuffer = readFileSync(caminhoArquivo);
    const hash = generateHash(caminhoArquivo);
    enviarArquivo(fileBuffer, hash);
  } catch (err) {
    console.log('Erro ao ler o arquivo. Verifique se ele existe na pasta storage.');
    return;
  }

  enviarMensagem(`UPLOADFILE ${nomeArquivo}`);

}

function enviarArquivo(fileBuffer: Buffer<ArrayBufferLike>, hash: string) {
  const chunkSize = 1450;
  const windowSize = 4;
  let base = 0;
  let nextSeqNum = 0;
  let offset = 0;
  const timeouts: NodeJS.Timeout[] = [];

  function ackHandler(ackMsg: Buffer) {
    const ackSeqNum = ackMsg.readUint32BE(0);
    const isAck = ackMsg.readUint8(4);

    if (isAck === 1) {
      console.log(`✅ ACK recebido para Seq ${ackSeqNum}`);
      clearTimeout(timeouts[ackSeqNum]);

      if (ackSeqNum === base) {
        base++;
        enviarPacotes();
      }

      if (base * chunkSize >= fileBuffer.length) {
        const eofHeader = generateHeader(nextSeqNum, 0, 1, 0);
        client.send(eofHeader, 0, eofHeader.length, Number(env.port), env.host);
        console.log('✅ EOF enviado, finalizando upload!');
        console.log(`🔑 Hash SHA-256 do arquivo enviado: ${hash}`);
        client.off('message', ackHandler);
      }
    }
  }

  client.on('message', ackHandler);

  function enviarPacotes() {
    while (nextSeqNum < base + windowSize && offset < fileBuffer.length) {
      const chunk = fileBuffer.slice(offset, offset + chunkSize);
      const checksum = checkSum(chunk);
      const header = generateHeader(nextSeqNum, 0, 0, checksum);
      const packet = Buffer.concat([header, chunk]);

      client.send(packet, 0, packet.length, Number(env.port), env.host);
      console.log(`📤 Pacote enviado: Seq ${nextSeqNum}`);

      definirReenvio(nextSeqNum, packet);

      offset += chunkSize;
      nextSeqNum++;
    }
  }

  function definirReenvio(seqNum: number, packet: Buffer) {
    if (timeouts[seqNum]) {
      clearTimeout(timeouts[seqNum]);
    }

    timeouts[seqNum] = setTimeout(() => {
      console.log(`⏰ Timeout! Retransmitindo pacote Seq ${seqNum}`);
      client.send(packet, 0, packet.length, Number(env.port), env.host);
      definirReenvio(seqNum, packet);
    }, 1000);
  }

  enviarPacotes();
}