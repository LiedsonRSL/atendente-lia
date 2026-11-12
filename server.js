const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const lia = require('./lia.js');

const app = express();
const PORT = process.env.PORT || 10000;

// Guarda onde cada cliente parou na conversa
const estados = {};

function pegarEstado(numero) {
  if (!estados[numero]) {
    estados[numero] = { etapa: "inicio", produto: null, fio: null, cor: null };
  }
  return estados[numero];
}

let ultimoQR = '';

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-extensions'
    ]
  },
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
  }
});

// Guarda o QR pra mostrar no site
client.on('qr', (qr) => {
  ultimoQR = qr;
  console.log('QR GERADO, abra /qr para escanear');
});

client.on('ready', () => {
  console.log('Lia conectada no WhatsApp Business! Prontinha!');
  ultimoQR = '';
});

client.on('authenticated', () => {
  console.log('Lia autenticada!');
});

client.on('auth_failure', (msg) => {
  console.log('FALHA NA AUTENTICACAO:', msg);
  ultimoQR = '';
});

client.on('disconnected', (reason) => {
  console.log('Lia desconectada:', reason);
});

// ISSO AQUI É O QUE IMPEDE O RESTART EM LOOP - não deixa um erro bobo matar o servidor
process.on('unhandledRejection', (err) => {
  console.log('Erro ignorado para não derrubar o servidor:', err.message);
});

client.on('message', async (msg) => {
  try {
    // Não responde grupo, nem status, nem mensagem sua mesmo
    if (msg.from.includes('@g.us') || msg.from.includes('status') || msg.fromMe) return;

    const numero = msg.from;
    const texto = msg.body || '';
    console.log('Mensagem de', numero, ':', texto);

    const estado = pegarEstado(numero);
    const resposta = lia.processarMensagem(texto, estado);

    // Se for cartão, avisa você no console pra fazer o link
    if (estado.etapa === 'aguardando_atendente') {
      console.log('--- AVISO PRA VOCE, LIEDSON ---');
      console.log(lia.mensagemParaAtendente(numero, estado.produto.nome, estado.cor, estado.fio, estado.parcelas, estado.totalCartao, estado.valorParcela));
    }

    await msg.reply(resposta);
  } catch (e) {
    console.log('Erro ao responder mensagem:', e.message);
  }
});

client.initialize();

// --- PARTE DO SITE ---
app.get('/', (req, res) => {
  res.send('Lia online! Acesse /qr para conectar');
});

app.get('/qr', async (req, res) => {
  if (!ultimoQR) {
    return res.send('<h1>Aguarde... Lia ja conectada ou gerando QR. Atualize em 10 segundos.</h1>');
  }
  const imagem = await qrcode.toDataURL(ultimoQR);
  res.send(`<h1>Escaneie com o WhatsApp Business</h1><img src="${imagem}" width="350"><br><p>Atualize a pagina se o QR expirar</p>`);
});

app.listen(PORT, () => {
  console.log(`Atendente Lia rodando na porta ${PORT}`);
});