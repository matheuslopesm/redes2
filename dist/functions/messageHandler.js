"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageHandler = messageHandler;
const fs_1 = require("fs");
const generateHash_1 = require("./generateHash");
const checkSum_1 = require("./checkSum");
const env_1 = require("../env");
const generateHeader_1 = require("./generateHeader");
function messageHandler(sender, msg, chunks, destino, expectedSeq, fileName) {
    /*
      Parâmetros:
      - msg: Pacote de dados recebido do servidor.

      Responsável por processar cada mensagem (pacote) recebida do servidor
      durante o processo de download de um arquivo.

      Fluxo:
      * 1. É verificado se existe algum erro, desliga o sendere.
      * 2. Se for um pacote com eofFlag, salve o arquivo e gera um hash.
      * 3. Verifica se o pacote tem o número de sequência esperado e se o checksum é válido.
      * 4. Se for inválido, envia um ACK referente ao último pacote válido recebido.
    */
    const msgString = msg.toString();
    if (msgString.startsWith('Erro:') || msgString.startsWith('Nome do arquivo não especificado')) {
        console.log(`⚠️ ${msgString}`);
        sender.off('message', messageHandler);
        return;
    }
    const seqNum = msg.readUInt32BE(0);
    const isAck = msg.readUInt8(4);
    const eofFlag = msg.readUInt8(5);
    const checksum = msg.readUInt32BE(6);
    const payload = msg.slice(10);
    if (eofFlag === 1) {
        const arquivoFinal = Buffer.concat(chunks);
        (0, fs_1.writeFileSync)(destino, arquivoFinal);
        console.log(`✅ EOF recebido. Arquivo "${fileName}" montado!`);
        const hash = (0, generateHash_1.generateHash)(destino);
        console.log(`🔑 Hash SHA-256 do arquivo recebido: ${hash}`);
        sender.off('message', messageHandler);
        return;
    }
    if (seqNum === expectedSeq && isAck === 0 && (0, checkSum_1.checkSum)(payload) === checksum) {
        console.log(`✅ Pacote válido recebido: Seq ${seqNum}`);
        chunks.push(payload);
        const ack = (0, generateHeader_1.generateHeader)(seqNum, 1, 0, 0);
        sender.send(ack, 0, ack.length, Number(env_1.env.port), env_1.env.host);
        expectedSeq++;
    }
    else {
        console.log(`⚠️ Pacote inválido ou fora de ordem! Esperado: ${expectedSeq}, Recebido: ${seqNum}`);
        const ack = (0, generateHeader_1.generateHeader)(expectedSeq - 1, 1, 0, 0);
        sender.send(ack, 0, ack.length, Number(env_1.env.port), env_1.env.host);
    }
}
