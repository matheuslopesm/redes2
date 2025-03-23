export function generateHeader(seqNum: number, ackFlag: number, eofFlag: number, checksum: number): Buffer {
    const header = Buffer.alloc(10);
    header.writeUInt32BE(seqNum, 0);   // SEQ_NUM (4 bytes)
    header.writeUInt8(ackFlag, 4);     // ACK_FLAG (1 byte)
    header.writeUInt8(eofFlag, 5);     // EOF_FLAG (1 byte)
    header.writeUInt32BE(checksum, 6); // CHECKSUM (4 bytes)
    return header;
}
