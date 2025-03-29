export function checkSum(buffer: Buffer): number {
    /*
        Parâmetros:
        - buffer: Buffer contendo os dados para calcular o checksum.

        Percorre cada byte do buffer e acumula seu valor em uma variável de soma.
        Para evitar estouro (overflow), a soma é mantida dentro do intervalo de 32 bits,
        aplicando a operação módulo `0xffffffff` (máximo valor de um inteiro sem sinal de 32 bits)
    */
    let sum = 0;

    for (let i = 0; i < buffer.length; i++) {
        sum = (sum + buffer[i]) % 0xffffffff;
    }
    return sum;
}
