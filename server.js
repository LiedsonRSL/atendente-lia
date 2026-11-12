const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const lia = require('./lia.js');

// Guarda onde cada cliente parou na conversa
const estados = {};

function pegarEstado(numero) {
  if (!estados[numero]) {
    estados[numero] = { etapa: "inicio", produto: null, fio: null, cor: null };
  }
  return estados[numero];
}

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

// Mostra o QR Code pra você escanear
client.on('qr', (qr) => {
  console.log('ESCANEIA ESSE QR CODE NO SEU WHATSAPP BUSINESS:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Lia conectada no WhatsApp Business! Prontinha!');
});

client.on('message', async (msg) => {
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
});

client.initialize();