"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-unused-vars */
const dgram_1 = __importDefault(require("dgram"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const env_1 = require("./env");
const checkSum_1 = require("./functions/checkSum");
const generateHash_1 = require("./functions/generateHash");
const generateHeader_1 = require("./functions/generateHeader");
const server = dgram_1.default.createSocket('udp4');
const STORAGE = path_1.default.join(__dirname, '../storage');
const UPLOADS = path_1.default.join(__dirname, '../uploads');
const authenticatedClients = new Set();
server.on('error', (err) => {
    /*
        Responsável por emitir erro (caso haja) no início da ligação
        cliente-servidor, através da flag 'error'.
     */
    console.error(`Erro no servidor:\n${err.stack}`);
    server.close();
});
server.on('message', (msg, rinfo) => {
    /*
        Parâmetros:
        - msg: É o conteúdo do pacote recebido pelo servidor, que contém os dados
        enviados pelo cliente.
        - rinfo: Contém informações sobre quem enviou o pacote, como endereço IP, porta...

        Responsável por realizar a ligação com o cliente. Caso ele
        não esteja autenticado, chama a função de autenticar cliente.
        Caso já esteja autenticado, continua a execução normal e se o cliente
        fizer um comando específico, chama sua respectiva função no switch-case.
    */
    const cmd = msg.toString().trim();
    const clientKey = `${rinfo.address}:${rinfo.port}`;
    if (!authenticatedClients.has(clientKey)) {
        verifyClient(cmd, rinfo, clientKey);
        return;
    }
    console.log(`💬 Pacote recebido do cliente (${rinfo.address}:${rinfo.port}), tamanho: ${msg.length} bytes`);
    const [command, ...args] = cmd.split(' ');
    switch (command) {
        case 'LISTFILE':
            return listFile(rinfo);
        case 'DOWNLOADFILE':
            return downloadFile(rinfo, args);
        case 'UPLOADFILE':
            return startReceiving(args.join(''), rinfo);
    }
});
server.on('listening', () => {
    /*
        Responsável por "ligar" o servidor através da flag 'listening'.
    */
    const address = server.address();
    console.log(`🖥️ Server operando no endereço ${address.address}:${address.port}`);
});
server.bind(Number(env_1.env.port));
function verifyClient(msg, rinfo, clientKey) {
    /*
        Parâmetros:
        - msg: É o conteúdo do pacote recebido pelo servidor, que contém os dados
        enviados pelo cliente.
        - rinfo: Contém informações sobre quem enviou o pacote, como endereço IP, porta...
        - clientKey: Combinação IP e chave do cliente.

        Responsável por autenticar o cliente. Caso a mensagem não seja igual a palavra-passe,
        emite a mensagem de autenticação. Caso contrário adiciona o cliente na lista de autenticados.
    */
    if (msg !== env_1.env.pass) {
        server.send(Buffer.from('🔒 Digite a senha para autenticação:'), rinfo.port, rinfo.address);
        return;
    }
    authenticatedClients.add(clientKey);
    console.log(`✅ Cliente autenticado com sucesso!`);
    server.send(Buffer.from('✅ Autenticação concluída com sucesso!'), rinfo.port, rinfo.address);
}
function listFile(rinfo) {
    /*
        Parâmetros:
        - rinfo: Contém informações sobre quem enviou o pacote, como endereço IP, porta...

        Lista os arquivos que estão no diretório/pasta storage.
    */
    try {
        const files = (0, fs_1.readdirSync)(STORAGE);
        if (files.length === 0) {
            const answer = Buffer.from('Não há arquivos no servidor!');
            server.send(answer, rinfo.port, rinfo.address);
        }
        else {
            const lista = files.join('\n');
            const answer = Buffer.from(`📁 Arquivos disponíveis:\n${lista}`);
            server.send(answer, rinfo.port, rinfo.address);
        }
    }
    catch (err) {
        const errorMessage = Buffer.from('Erro ao listar arquivos!');
        server.send(errorMessage, rinfo.port, rinfo.address);
    }
}
function downloadFile(rinfo, args) {
    /*
        Parâmetros:
        - rinfo: Contém informações sobre quem enviou o pacote, como endereço IP, porta...
        - args: O restante da string do comando de download, ou seja, o nome do arquivo que
        se deseja baixar.

        Essa função realiza o download do arquivo desejado pelo cliente. Ela verifica se o nome foi passado, se
        foi com sucesso já cria o caminho para salvamento do arquivo, após isso gera o hash do mesmo
        e chama a função de envio.
        Caso aconteça um erro na leitura, emite o erro.
    */
    const fileName = args.join('');
    if (!fileName) {
        const answer = Buffer.from('⚠️ Nome do arquivo não especificado.');
        server.send(answer, rinfo.port, rinfo.address);
        return;
    }
    const filePath = path_1.default.join(STORAGE, fileName);
    try {
        const hash = (0, generateHash_1.generateHash)(filePath);
        sendFile(rinfo, filePath, hash);
    }
    catch (err) {
        console.error('Erro ao ler o arquivo:', err);
        const answer = Buffer.from('Erro: arquivo não encontrado ou erro na leitura.');
        server.send(answer, rinfo.port, rinfo.address);
    }
}
function sendFile(rinfo, filePath, hash) {
    /*
        Parâmetros:
        - rinfo: Contém informações sobre quem enviou o pacote, como endereço IP, porta...
        - filePath: É o caminho de salvamento do arquivo que está sendo enviado pelo servidor.
        - hash: Hash de verificação do arquivo.

        Lê o arquivo indicado por `filePath` como um Buffer e o divide em pedaços (`chunks`) de tamanho máximo `chunkSize` (1450 bytes).
        Utiliza uma janela deslizante (`Sliding Window`) com tamanho fixo definido por `windowSize` (4 pacotes simultâneos) e
        implementa retransmissão automática de pacotes através de um sistema de timeout (`setTimeout`), redefinido a cada envio bem-sucedido.
        O listener (`server.on('message', ackHandler)`) serve para receber confirmações (`ACKs`) do cliente, e quando todos os pacotes
        são enviados e reconhecidos, o servidor envia um pacote especial de EOF (End of File) para indicar o término da transmissão e
        ainda limpar os timeouts pendentes e remove o listener `ackHandler` após a conclusão da transmissão.

        Fluxo:
        * 1. Leitura do arquivo e inicialização das variáveis de controle.
        * 2. Envio dos pacotes dentro da janela deslizante (`sendPacketsInSlidingWindow()`).
        * 3. Recebimento e tratamento de ACKs (`ackHandler()`).
        * 4. Controle de retransmissão automática em caso de timeout (`setRetransmission()`).
        * 5. Envio de pacote de EOF e limpeza dos recursos após finalização.
    */
    const fileBuffer = (0, fs_1.readFileSync)(filePath);
    const chunkSize = 1450;
    const windowSize = 4;
    let base = 0;
    let nextSeqNum = 0;
    let offset = 0;
    const timeouts = [];
    sendPacketsInSlidingWindow();
    function ackHandler(ackMsg, ackRinfo) {
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
        if (ackRinfo.address !== rinfo.address || ackRinfo.port !== rinfo.port)
            return;
        const ackSeqNum = ackMsg.readUInt32BE(0);
        const isAck = ackMsg.readUInt8(4);
        if (isAck === 1) {
            console.log(`✅ ACK recebido para Seq ${ackSeqNum}`);
            clearTimeout(timeouts[ackSeqNum]);
            console.log(`Base: ${base}, NextSeqNum: ${nextSeqNum}, ackSeqNum: ${ackSeqNum}`);
            if (ackSeqNum === base) {
                console.log('teste');
                base++;
                sendPacketsInSlidingWindow();
            }
            if (base * chunkSize >= fileBuffer.length) {
                const eofHeader = (0, generateHeader_1.generateHeader)(nextSeqNum, 0, 1, 0);
                server.send(eofHeader, rinfo.port, rinfo.address);
                console.log('✅ EOF enviado, finalizando transmissão!');
                console.log(`🔑 Hash SHA-256 do arquivo enviado: ${hash}`);
                timeouts.forEach(timeout => clearTimeout(timeout));
                server.off('message', ackHandler);
            }
        }
    }
    server.on('message', ackHandler);
    function sendPacketsInSlidingWindow() {
        return __awaiter(this, void 0, void 0, function* () {
            /*
                Envia os pacotes para o cliente dentro de uma janela deslizante de tamanho fixo (windowSize). Ela envia
                os pacotes enquanto o próximo número de sequência está dentro da janela permitida (base + windowSize) e
                enquanto houver dados para enviar (offset < fileBuffer.length).
                O arquivo é dividido em pedaços definidos por chunkSize, e para cada pedaço é calculado
                um checkum para ser colocado no cabeçalho e garantir a integridade desse pacote.
                Depois disso, ao transmitir o pacote, se um ACK não foi recebido, ele será retransmitido pela função
                setRetransmission.
                No final o offset é atualizado e o próximo pedaço do arquivo e o nextSeqNum é incrementado.
            */
            while (nextSeqNum < base + windowSize && offset < fileBuffer.length) {
                const chunk = fileBuffer.slice(offset, offset + chunkSize);
                const checksum = (0, checkSum_1.checkSum)(chunk);
                const header = (0, generateHeader_1.generateHeader)(nextSeqNum, 0, 0, checksum);
                const packet = Buffer.concat([header, chunk]);
                server.send(packet, rinfo.port, rinfo.address);
                console.log(`📤 Pacote enviado: Seq ${nextSeqNum}`);
                setRetransmission(nextSeqNum, packet);
                offset += chunkSize;
                nextSeqNum++;
                console.log('sliding');
            }
        });
    }
    function setRetransmission(seqNum, packet) {
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
            server.send(packet, rinfo.port, rinfo.address);
            setRetransmission(seqNum, packet);
        }, time);
    }
}
function startReceiving(fileName, rinfo) {
    /*
        Parâmetros:
        - fileName: Nome do arquivo que está sendo recebido pelo servidor.
        - rinfo: Contém informações sobre quem enviou o pacote, como endereço IP, porta...

        Essa função é responsável por receber o arquivo vindo do cliente. Ela recebe o arquivo em pacotes, verifica
        a integridade de cada pacote utilizando checksum e monta o arquivo completo quando o processo é finalizado.
        Também envia confirmações (ACKs) ao cliente para cada pacote recebido corretamente.

        Fluxo:

        * 1. Valida o nome do arquivo, caso não seja passado, emite um erro.
        * 2. Caminho de salvamento do arquivo é determinado.
        * 3. Array de chunks é usado para armazenar os pacotes recebidos.
        * 4. expectedSeq representa o número de sequência do próximo pacote esperado.
    */
    if (!fileName) {
        server.send(Buffer.from('Erro: Nome do arquivo não especificado!'), rinfo.port, rinfo.address);
        return;
    }
    console.log(`📥 Iniciando recepção do arquivo: ${fileName}`);
    const destination = path_1.default.join(UPLOADS, fileName);
    const chunks = [];
    let expectedSeq = 0;
    function messageHandler(msg, senderInfo) {
        /*
            Parâmetros:
            - msg: Pacote de dados recebido do cliente.
            - senderInfo: Contém informações sobre o cliente que enviou o pacote, como endereço IP, porta...

            Essa função é responsável por tratar os pacotes recebidos pelo servidor
            durante o processo de upload de arquivos. Ela valida os pacotes, verifica
            a integridade dos dados, confirmaa a recepção dos pacotes com ACKs e salvaa o arquivo
            completo após a recepção de todos os pacotes.

            Fluxo:

            * 1. Valida o remetente do pacote, se for um cliente diferente do que está
            no cabeçalho, ignora o pacote.
            * 2. Extrai informações sobre o cabeçalho.
            * 3. Se for um pacote com eofFlag, salve o arquivo e gera um hash.
            * 4. Verifica se o pacote tem o número de sequência esperado e se o checksum é válido.
            * 5. Se for inválido, envia um ACK referente ao último pacote válido recebido.
        */
        if (senderInfo.address !== rinfo.address || senderInfo.port !== rinfo.port)
            return;
        const seqNum = msg.readUInt32BE(0);
        const isAck = msg.readUInt8(4);
        const eofFlag = msg.readUInt8(5);
        const checksum = msg.readUInt32BE(6);
        const payload = msg.slice(10);
        if (eofFlag === 1) {
            const finalFile = Buffer.concat(chunks);
            (0, fs_1.writeFileSync)(destination, finalFile);
            console.log(`✅ EOF recebido. Arquivo "${fileName}" montado com sucesso!`);
            const hash = (0, generateHash_1.generateHash)(destination);
            console.log(`🔑 Hash SHA-256 do arquivo recebido: ${hash}`);
            server.off('message', messageHandler);
            return;
        }
        if (seqNum === expectedSeq && isAck === 0 && (0, checkSum_1.checkSum)(payload) === checksum) {
            console.log(`✅ Pacote válido recebido: Seq ${seqNum}`);
            chunks.push(payload);
            const ack = (0, generateHeader_1.generateHeader)(seqNum, 1, 0, 0);
            server.send(ack, rinfo.port, rinfo.address);
            expectedSeq++;
        }
        else {
            console.log(`⚠️ Pacote inválido ou fora de ordem! Esperado: ${expectedSeq}, Recebido: ${seqNum}`);
            const ack = (0, generateHeader_1.generateHeader)(expectedSeq - 1, 1, 0, 0);
            server.send(ack, rinfo.port, rinfo.address);
        }
    }
    server.on('message', messageHandler);
}
