"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setRetransmission = setRetransmission;
const env_1 = require("../env");
function setRetransmission(sender, nextSeqNum, packet, timeouts) {
    const time = 1000;
    if (timeouts[nextSeqNum]) {
        clearTimeout(timeouts[nextSeqNum]);
    }
    timeouts[nextSeqNum] = setTimeout(() => {
        console.log(`⏰ Timeout! Retransmitindo pacote Seq ${nextSeqNum}`);
        sender.send(packet, 0, packet.length, Number(env_1.env.port), env_1.env.host);
        setRetransmission(sender, nextSeqNum, packet, timeouts);
    }, time);
}
