"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ackHandler = ackHandler;
const env_1 = require("../env");
const generateHeader_1 = require("./generateHeader");
const sendPacketsInSlidingWindow_1 = require("./sendPacketsInSlidingWindow");
function ackHandler(sender, timeouts, base, ackMsg, chunkSize, fileBuffer, nextSeqNum, windowSize, offset, hash) {
    const ackSeqNum = ackMsg.readUint32BE(0);
    const isAck = ackMsg.readUint8(4);
    if (isAck === 1) {
        console.log(`✅ ACK recebido para Seq ${ackSeqNum}`);
        clearTimeout(timeouts[ackSeqNum]);
        if (ackSeqNum === base) {
            base++;
            (0, sendPacketsInSlidingWindow_1.sendPacketsInSlidingWindow)(sender, nextSeqNum, base, windowSize, offset, fileBuffer, chunkSize, timeouts);
        }
        if (base * chunkSize >= fileBuffer.length) {
            const eofHeader = (0, generateHeader_1.generateHeader)(nextSeqNum, 0, 1, 0);
            sender.send(eofHeader, 0, eofHeader.length, Number(env_1.env.port), env_1.env.host);
            console.log('✅ EOF enviado, finalizando upload!');
            console.log(`🔑 Hash SHA-256 do arquivo enviado: ${hash}`);
            sender.off('message', ackHandler);
        }
    }
}
