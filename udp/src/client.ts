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

function sendMessage(msg: string) {
    /*
      Parâmetros:
      - msg: Mensagem a ser enviada pelo cliente.

      Responsável por enviar qualquer mensagem do cliente para o servidor.
    */
    const buffer = Buffer.from(msg);

    client.send(buffer, 0, buffer.length, Number(env.port), env.host, (err) => {
        if (err) {
            console.error('Erro ao enviar mensagem:', err);
            client.close();
        }
    });
}

rl.on('line', (input: string, rinfo: dgram.RemoteInfo) => {
    /*
      Parâmetros:
      - input: Toda e qualquer mensagem passada pelo teclado do cliente.
      - rinfo: Contém informações sobre quem enviou o pacote, como endereço IP, porta...

      Responsável por identificar comandos específicos e seguir os fluxos dos mesmos.
    */
    const [command, ...args] = input.trim().split(' ');

    switch (command.toLowerCase()) {
        case 'exit':
            console.log('Encerrando cliente...');
            rl.close();
            client.close();
            return;
        case 'listfile':
            sendMessage('LISTFILE');
            return;
        case 'downloadfile':
            downloadFileMsg(args);
            return;
        case 'uploadfile':
            uploadFileMsg(rinfo, args);
            return;
    }

    sendMessage(input);
});

client.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
    /*
      Parâmetros:
      - msg: Pacote recebido pelo servidor.
      - rinfo: Objeto contendo informações sobre o servidor que enviou o pacote.

      Processa e exibe as mensagens vindas do servidor. Dependendo da mensagem
      ele a exibe, senão trata como padrão.
    */
    const mensagem = msg.toString();
    const defaults = ['🔒', '📁', '✅', '⏰', '⚠️'];

    if (defaults.some(emoji => mensagem.startsWith(emoji))) {
        console.log(mensagem);
        return;
    }

    console.log(`🔥 Pacote recebido do servidor (${rinfo.address}:${rinfo.port}): tamanho: ${msg.length} bytes`);
});

function downloadFileMsg(args: string[]) {
    /*
      Parâmetros:
      - args: O restante da string do comando de download, ou seja, o nome do arquivo que
      se deseja baixar.

      Inicia o processo de download chamando a função que fará a recepção do arquivo.
     */
    const fileName = args.join(' ');

    if (!fileName) {
        console.log('Você precisa informar o nome do arquivo!');
        return;
    }

    sendMessage(`DOWNLOADFILE ${fileName}`);

    startReceiving(fileName);
}

function startReceiving(fileName: string) {
    /*
      Parâmetros:
      - fileName: Nome do arquivo que está sendo recebido pelo servidor.

      Essa função é responsável por receber o arquivo vindo do servidor. Gerenciando
      a montagem do arquivo a partir de pacotes recebidos e garantindo a integridade deles.

      Fluxo:
      * 1. Cria um array para armazenar os pacotes recebidos e inicializa o número de
      sequência esperado.
      * 2. Inicia a função responsável por tratar os pacotes recebidos.
    */
    const destination = path.join(__dirname, `../downloads/${fileName}`);
    const chunks: Buffer[] = [];
    let expectedSeq = 0;

    console.log(`📥 Iniciando recebimento do arquivo: ${fileName}`);

    function messageHandler(msg: Buffer) {
        /*
          Parâmetros:
          - msg: Pacote de dados recebido do servidor.

          Responsável por processar cada mensagem (pacote) recebida do servidor
          durante o processo de download de um arquivo.

          Fluxo:
          * 1. É verificado se existe algum erro, desliga o cliente.
          * 2. Se for um pacote com eofFlag, salve o arquivo e gera um hash.
          * 3. Verifica se o pacote tem o número de sequência esperado e se o checksum é válido.
          * 4. Se for inválido, envia um ACK referente ao último pacote válido recebido.
        */
        const msgString = msg.toString();

        if (msgString.startsWith('Erro:') || msgString.startsWith('Nome do arquivo não especificado')) {
            console.log(`⚠️ ${msgString}`);
            client.off('message', messageHandler);
            return;
        }

        const seqNum = msg.readUInt32BE(0);
        const isAck = msg.readUInt8(4);
        const eofFlag = msg.readUInt8(5);
        const checksum = msg.readUInt32BE(6);
        const payload = msg.slice(10);

        if (eofFlag === 1) {
            const arquivoFinal = Buffer.concat(chunks);
            writeFileSync(destination, arquivoFinal);
            console.log(`✅ EOF recebido. Arquivo "${fileName}" montado!`);

            const hash = generateHash(destination);
            console.log(`🔑 Hash SHA-256 do arquivo recebido: ${hash}`);

            client.off('message', messageHandler);
            return;
        }

        if (seqNum === expectedSeq && isAck === 0 && checkSum(payload) === checksum) {
            console.log(`✅ Pacote válido recebido: Seq ${seqNum}`);

            chunks.push(payload);

            const ack = generateHeader(seqNum, 1, 0, 0);
            client.send(ack, 0, ack.length, Number(env.port), env.host);

            expectedSeq++;
        } else {
            console.log(`⚠️ Pacote inválido ou fora de ordem! Esperado: ${expectedSeq}, Recebido: ${seqNum}`);
            const ack = generateHeader(expectedSeq - 1, 1, 0, 0);
            client.send(ack, 0, ack.length, Number(env.port), env.host);
        }
    }

    client.on('message', messageHandler);
}

function uploadFileMsg(rinfo: dgram.RemoteInfo, args: string[]) {
    /*
      Parâmetros:
      - rinfo: Contém informações sobre quem enviou o pacote, como endereço IP, porta...
      - args: O restante da string do comando de upload, ou seja, o nome do arquivo que
      se deseja mandar pro server.

      Essa função realiza o upload do arquivo para o servidor. Ela verifica se o nome foi passado, se
      foi com sucesso já cria o caminho para salvamento do arquivo, após isso gera o hash do mesmo
      e chama a função de envio. Caso aconteça um erro na leitura, emite o erro.
    */
    const fileName = args.join(' ');

    if (!fileName) {
        console.log('Você precisa informar o nome do arquivo!');
        return;
    }

    const filePath = path.join(STORAGE, fileName);

    try {
        const fileBuffer = readFileSync(filePath);
        const hash = generateHash(filePath);
        sendFile(rinfo, fileBuffer, hash);
    } catch (err) {
        console.log('Erro ao ler o arquivo. Verifique se ele existe na pasta storage.');
        return;
    }

    sendMessage(`UPLOADFILE ${fileName}`);
}

function sendFile(rinfo: dgram.RemoteInfo, fileBuffer: Buffer<ArrayBufferLike>, hash: string) {
    /*
      Parâmetros:
      - rinfo: Contém informações sobre quem enviou o pacote, como endereço IP, porta...
      - fileBuffer: São os dados do arquivo que está sendo enviado para o servidor.
      - hash: Hash de verificação do arquivo.

      Utiliza uma janela deslizante com tamanho fixo definido por `windowSize` (4 pacotes simultâneos) e
      implementa retransmissão automática de pacotes através de um sistema de timeout (`setTimeout`), redefinido a cada envio bem-sucedido.
      O listener (`server.on('message', ackHandler)`) serve para receber confirmações (`ACKs`) do cliente, e quando todos os pacotes
      são enviados e reconhecidos, o servidor envia um pacote especial de EOF (End of File) para indicar o término da transmissão e
      ainda limpar os timeouts pendentes e remove o listener `ackHandler` após a conclusão da transmissão.
     */
    const chunkSize = 1450;
    const windowSize = 4;
    let base = 0;
    let nextSeqNum = 0;
    let offset = 0;
    const timeouts: NodeJS.Timeout[] = [];

    sendPacketsInSlidingWindow();

    function ackHandler(ackMsg: Buffer, ackRinfo: dgram.RemoteInfo) {
        /*
            Parâmetros:
            - ackMsg: Pacote de dados recebido do cliente que contém o número de sequência
            e uma flag indicando se é um ACK.
            - ackRinfo: Objeto que contém informações sobre o remetente do ACK.

            Processa os ACKs enviados pelo cliente. Quando o server receber um, ele
            verifica se é um pacote válido e se corresponde ao arquivo enviado.
            Se for válido, limpa o timeout e avança a base da janela deslizante.
            Por fim, quando todos os pacotes são enviados e reconhecidos, envia um pacote EOF
            para indicar o término da transmissão.
        */
        const ackSeqNum = ackMsg.readUint32BE(0);
        const isAck = ackMsg.readUint8(4);

        if (isAck === 1) {
            console.log(`✅ ACK recebido para Seq ${ackSeqNum}`);
            clearTimeout(timeouts[ackSeqNum]);

            if (ackSeqNum === base) {
                base++;
                sendPacketsInSlidingWindow();
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

    function sendPacketsInSlidingWindow() {
        /*
          Envia os pacotes para o servidor dentro de uma janela deslizante de tamanho fixo (windowSize). Ela envia
          os pacotes enquanto o próximo número de sequência está dentro da janela permitida (base + windowSize) e
          enquanto houver dados para enviar (offset < fileBuffer.length).
          O arquivo é dividido em pedaços definidos por chunkSize, e para cada pedaço é calculado
          um checksum para ser colocado no cabeçalho e garantir a integridade desse pacote.
          Depois disso, ao transmitir o pacote, se um ACK não foi recebido, ele será retransmitido pela função
          setRetransmission.
          No final o offset é atualizado e o próximo pedaço do arquivo e o nextSeqNum é incrementado.
        */
        while (nextSeqNum < base + windowSize && offset < fileBuffer.length) {
            const chunk = fileBuffer.slice(offset, offset + chunkSize);
            const checksum = checkSum(chunk);
            const header = generateHeader(nextSeqNum, 0, 0, checksum);
            const packet = Buffer.concat([header, chunk]);

            client.send(packet, 0, packet.length, Number(env.port), env.host);
            console.log(`📤 Pacote enviado: Seq ${nextSeqNum}`);

            setRetransmission(nextSeqNum, packet);

            offset += chunkSize;
            nextSeqNum++;
        }
    }

    function setRetransmission(seqNum: number, packet: Buffer) {
        /*
          Parâmetros:
          - seqNum: Número de sequência do pacote que será retransmitido.
          - packet: Pacote que será retransmitido caso o ACK não seja recebido.

          Responsável por configurar um mecanismo de retransmissão automática para pacotes que
          não receberem um ACK do cliente em um período específico.

          Fluxo:

          * 1. Se já existir um timeout configurado para o número de sequência fornecido (seqNum),
          ele é limpo utilizando clearTimeout(), evitando múltiplos timeouts para o mesmo pacote.
          * 2. Um novo timeout é configurado usando setTimeout(). Se o ACK do pacote (seqNum) não
          for recebido dentro do tempo, o pacote é retransmitido para o cliente e o timeout é
          configurado novamente através de uma chamada recursiva da própria função setRetransmission().
        */
        const time = 3000;

        if (timeouts[seqNum]) {
            clearTimeout(timeouts[seqNum]);
        }

        timeouts[seqNum] = setTimeout(() => {
            console.log(`⏰ Timeout! Retransmitindo pacote Seq ${seqNum}`);
            client.send(packet, 0, packet.length, Number(env.port), env.host);
            setRetransmission(seqNum, packet);
        }, time);
    }
}
