"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHeader = generateHeader;
function generateHeader(seqNum, ackFlag, eofFlag, checksum) {
    /*
        Cria um cabeçalho de 10 bytes para cada pacote, com informações
        da transmissão para verificar integridade deles.

        * seqNum: Número de sequência dos pacotes para ajudar na ordenação.
        * ackFlag: Indica se o pacote é um ACK ou um comum.
        * eofFlag: Indica se é o último pacote do arquivo.
        * checkSum: Valor calculado para verificar a integridade do pacote.
    */
    const header = Buffer.alloc(10);
    header.writeUInt32BE(seqNum, 0); // SEQ_NUM (4 bytes)
    header.writeUInt8(ackFlag, 4); // ACK_FLAG (1 byte)
    header.writeUInt8(eofFlag, 5); // EOF_FLAG (1 byte)
    header.writeUInt32BE(checksum, 6); // CHECKSUM (4 bytes)
    return header;
}
