"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPacketsInSlidingWindow = sendPacketsInSlidingWindow;
const checkSum_1 = require("./checkSum");
const generateHeader_1 = require("./generateHeader");
const env_1 = require("../env");
const setRetransmission_1 = require("./setRetransmission");
function sendPacketsInSlidingWindow(sender, nextSeqNum, base, windowSize, offset, fileBuffer, chunkSize, timeouts) {
    while (nextSeqNum < base + windowSize && offset < fileBuffer.length) {
        const chunk = fileBuffer.slice(offset, offset + chunkSize);
        const checksum = (0, checkSum_1.checkSum)(chunk);
        const header = (0, generateHeader_1.generateHeader)(nextSeqNum, 0, 0, checksum);
        const packet = Buffer.concat([header, chunk]);
        sender.send(packet, 0, packet.length, Number(env_1.env.port), env_1.env.host);
        console.log(`📤 Pacote enviado: Seq ${nextSeqNum}`);
        (0, setRetransmission_1.setRetransmission)(sender, nextSeqNum, packet, timeouts);
        offset += chunkSize;
        nextSeqNum++;
    }
}
