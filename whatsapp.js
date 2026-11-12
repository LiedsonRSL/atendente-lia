const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const lia = require('./lia.js');
const path = require('path');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

const conversas = {};

function pegarEstado(numero) {
  if (!conversas[numero]) {
    conversas[numero] = { etapa: "inicio", produto: null, fio: null, cor: null, jaViuCatalogo: false, jaMandouCores: false };
  }
  return conversas[numero];
}

client.on('qr', (qr) => {
  console.log('Escaneia esse QR Code com o celular:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Lia conectada no WhatsApp!');
});

client.on('message', async (msg) => {
  if (msg.fromMe) return;
  if (msg.from.includes('@g.us')) return;
  if (msg.from.includes('status')) return;

  const numero = msg.from;
  const texto = msg.body || '';
  console.log('Mensagem de', numero, ':', texto);

  const estado = pegarEstado(numero);

  // 1 - Se falar SIM e ainda não viu catalogo, manda o PDF
  if (texto.toLowerCase().includes('sim') && !estado.jaViuCatalogo) {
    estado.jaViuCatalogo = true;
    try {
      const media = MessageMedia.fromFilePath(path.join(__dirname, 'catalogo.pdf'));
      await client.sendMessage(numero, media, { caption: 'Aqui está nosso catálogo completo! ❤️' });
    } catch (e) {
      console.log('Não consegui mandar o PDF');
    }
  }

  // 2 - Lia responde
  const resposta = lia.processarMensagem(texto, estado);

  // 3 - Se a Lia chegou na parte da cor, manda a foto da cartela certa
  if (estado.etapa === 'perguntando_cor' && !estado.jaMandouCores) {
    estado.jaMandouCores = true;
    try {
      let arquivo = 'cores-lisa.jpg';
      let legenda = 'Olha essa cartela linda! ❤️ São 22 cores de Corda de Algodão Lisa 6mm. Me fala o nome da cor que você mais gostou!';

      if (estado.fio && estado.fio.toLowerCase().includes('especial')) {
        arquivo = 'cores-especiais.jpg';
        legenda = 'Olha essa cartela especial! ✨ São 12 cores especiais - com Ouro, Pontilhadas e Mescladas. Me fala o nome da que você amou!';
      }
      if (estado.fio && (estado.fio.toLowerCase().includes('nautica') || estado.fio.toLowerCase().includes('náutica'))) {
        arquivo = 'cores-nauticas.jpg';
        legenda = 'Olha essa cartela náutica! São 4 cores super resistentes. Me fala qual você quer: Preto, Areia, Rami ou Caramelo?';
      }

      const foto = MessageMedia.fromFilePath(path.join(__dirname, arquivo));
      await client.sendMessage(numero, foto, { caption: legenda });
    } catch (e) {
      console.log('Não consegui mandar a foto das cores, verifica se o arquivo está na pasta', e.message);
    }
  }

  if (estado.etapa === 'aguardando_atendente') {
    console.log('--- AVISO PRA VOCE, LIEDSON ---');
    console.log(lia.mensagemParaAtendente(numero, estado.produto.nome, estado.cor, estado.fio, estado.parcelas, estado.totalCartao, estado.valorParcela));
  }

  await client.sendMessage(numero, resposta);
});

client.initialize();