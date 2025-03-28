"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSum = checkSum;
function checkSum(buffer) {
    // Percorre cada byte do buffer e soma no acumulador. 
    // O operador % 0xffffffff limita o valor do sum pra ele ficar sempre no intervalo de 32 bits (evita overflow).
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
        sum = (sum + buffer[i]) % 0xffffffff;
    }
    return sum;
}
