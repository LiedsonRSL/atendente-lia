// ==========================================
// INDEX.JS - LIA COMPLETA - 2 ATENDENTES + FOTO + RESUMO EM TODOS OS PAGAMENTOS
// ==========================================
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const path = require("path");
const fs = require("fs");
const express = require("express");
const { processarMensagem, mensagemParaAtendente, montarResumoPedido } = require("./lia.js");

// ===== SERVIDOR PRA MOSTRAR O QR NO RENDER =====
const app = express();
let ultimoQR = "";

app.get('/qr', (req, res) => {
  if (!ultimoQR) return res.send("Ainda não gerou QR, espera 1 min e atualiza a página");
  res.send(`<h2>Escaneia com o WhatsApp da loja</h2><img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ultimoQR)}">`);
});

app.get('/', (req, res) => res.send("Lia rodando! Vai em /qr pra ver o QR"));
app.listen(process.env.PORT || 10000, () => console.log("Atendente Lia rodando na porta 10000"));

// 2 NÚMEROS QUE VÃO RECEBER OS PEDIDOS
const NUMEROS_ATENDENTES = ["5532988165389@c.us", "5532988916697@c.us"];

async function enviarParaAtendentes(texto) {
  for (const numero of NUMEROS_ATENDENTES) {
    try {
      await client.sendMessage(numero, texto);
    } catch (e) {
      console.log("Erro ao enviar para atendente", numero, e);
    }
  }
}

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] }
});

const conversas = {};

function limparTimer(estado) {
  if (estado.timerAviso) clearTimeout(estado.timerAviso);
  if (estado.timerEncerra) clearTimeout(estado.timerEncerra);
  estado.timerAviso = null;
  estado.timerEncerra = null;
  estado.avisoEnviado = false;
}

function agendarTimeout(numeroCliente) {
  const estado = conversas[numeroCliente];
  if (!estado) return;
  limparTimer(estado);
  if (estado.emAtendimento) return;
  if (estado.etapa === "concluido" || estado.etapa === "inicio") return;

  estado.timerAviso = setTimeout(async () => {
    const est = conversas[numeroCliente];
    if (!est || est.emAtendimento || est.etapa === "concluido") return;
    est.avisoEnviado = true;
    try {
      await client.sendMessage(numeroCliente, `Oi ${est.nomeCliente || ""}! Você ainda está aí? 🥰\n\nVi que você não respondeu, vou encerrar nossa conversa em 5 minutinhos, tá?\n\nSe quiser continuar, é só responder aqui!`);
    } catch (e) { console.log("Erro ao mandar aviso 5 min", e); }
  }, 5 * 60 * 1000);

  estado.timerEncerra = setTimeout(async () => {
    const est = conversas[numeroCliente];
    if (!est || est.emAtendimento || est.etapa === "concluido") return;
    try {
      await client.sendMessage(numeroCliente, `Vou encerrar nossa conversa por aqui, tá? 🧶❤️\n\nQuando quiser voltar é só mandar um oi aqui que eu volto na hora!\n\nObrigada por falar com a Eliazar Artesanatos! 🥰`);
    } catch (e) { console.log("Erro ao encerrar 10 min", e); }
    limparTimer(est);
    delete conversas[numeroCliente];
  }, 10 * 60 * 1000);
}

client.on("qr", (qr) => {
  ultimoQR = qr;
  console.log("QR GERADO! Abre /qr pra ver");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Lia conectada! ✅ Pode mandar mensagem no WhatsApp!");
  ultimoQR = "";
});

// ===== CORRIGIDO: PROCURA CARTELA COM QUALQUER EXTENSÃO =====
function fotoDaCorda(corda) {
  let base = "";
  if (corda === "corda-lisa") base = "cores-lisa";
  if (corda === "corda-especial") base = "cores-especial";
  if (corda === "corda-nautica") base = "cores-nautica";
  if (!base) return "";
  const extensoes = [".jpeg", ".jpg", ".png", ".webp", ".JPEG", ".JPG", ".PNG"];
  for (const ext of extensoes) {
    const tentativa = path.join(__dirname, base + ext);
    if (fs.existsSync(tentativa)) return base + ext;
  }
  try {
    const arquivos = fs.readdirSync(__dirname);
    const achado = arquivos.find(a => a.toLowerCase().startsWith(base.toLowerCase()));
    if (achado) return achado;
  } catch(e) {}
  return base + ".jpeg";
}

async function mandarCartela(numeroCliente, corda, legenda) {
  const arquivoFoto = fotoDaCorda(corda);
  const caminhoFoto = path.join(__dirname, arquivoFoto);
  console.log("TENTANDO MANDAR CARTELA:", corda, "->", caminhoFoto, "existe?", fs.existsSync(caminhoFoto));
  if (fs.existsSync(caminhoFoto)) {
    const media = MessageMedia.fromFilePath(caminhoFoto);
    await client.sendMessage(numeroCliente, media, { caption: legenda });
  } else {
    console.log("NÃO ACHEI A CARTELA:", caminhoFoto);
    await client.sendMessage(numeroCliente, "Opa, não achei a foto da cartela aqui, mas me fala o nome da cor que você gostou que eu já anoto! 🥰");
  }
}

function normalizarSimples(t) {
  return (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

// ===== CORRIGIDO: BUSCA EM TODOS OS PRODUTOS DA PASTA FOTOS =====
function acharFotoProduto(nomeProduto) {
  const pastaFotos = path.join(__dirname, "fotos");
  if (!fs.existsSync(pastaFotos)) {
    console.log("PASTA FOTOS NÃO EXISTE:", pastaFotos);
    return null;
  }
  const arquivos = fs.readdirSync(pastaFotos).filter(a => /\.(jpg|jpeg|png|webp)$/i.test(a));
  const nomeLimpo = normalizarSimples(nomeProduto);

  let achado = arquivos.find(a => normalizarSimples(a.replace(/\.(jpg|jpeg|png|webp)$/i, "")) === nomeLimpo);
  if (achado) return path.join(pastaFotos, achado);

  achado = arquivos.find(a => normalizarSimples(a.replace(/\.(jpg|jpeg|png|webp)$/i, "")).startsWith(nomeLimpo));
  if (achado) return path.join(pastaFotos, achado);

  const nomeOriginal = (nomeProduto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const palavras = nomeOriginal.split(" ").filter(w => w.length > 2);
  achado = arquivos.find(a => {
    const nomeArquivo = a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return palavras.every(p => nomeArquivo.includes(p));
  });
  if (achado) return path.join(pastaFotos, achado);

  console.log("NÃO ACHEI FOTO DO PRODUTO:", nomeProduto);
  return null;
}

async function mandarFotoProduto(numeroCliente, nomeProduto) {
  const caminho = acharFotoProduto(nomeProduto);
  if (!caminho) {
    console.log("NÃO ACHEI FOTO DO PRODUTO:", nomeProduto);
    return;
  }
  console.log("MANDANDO FOTO DO PRODUTO:", nomeProduto, "->", caminho);
  const media = MessageMedia.fromFilePath(caminho);
  await client.sendMessage(numeroCliente, media, { caption: `Olha ele aqui, que lindo! 😍\n🧶 ${nomeProduto}` });
}

client.on("message", async (msg) => {
  if (msg.from.includes("@g.us") || msg.from === "status@broadcast") return;
  const numeroCliente = msg.from;
  if (!conversas[numeroCliente]) {
    conversas[numeroCliente] = {
      etapa: "inicio",
      nomeCliente: null,
      produto: null,
      corda: null,
      cor: null,
      corda2: null,
      cor2: null,
      corPrincipal: null,
      cordaPrincipal: null,
      parcelas: null,
      listaTemp: [],
      jaMandouCores: false,
      quantidade: 1,
      querPano: false,
      formaPagamento: null,
      combinacaoDinheiro: null,
      emAtendimento: false,
      etapaAntesAtendente: null,
      totalCartao: null,
      valorParcela: null,
      avaliacao: null,
      melhoria: null,
      desistiu: null,
      timerAviso: null,
      timerEncerra: null,
      avisoEnviado: false,
      carrinho: [],
      produtoJaNoCarrinho: false,
      jaMandouResumoFinal: false
    };
  }
  const estado = conversas[numeroCliente];
  if (NUMEROS_ATENDENTES.includes(numeroCliente)) return;
  const textoCliente = msg.hasMedia ? "[comprovante]" : (msg.body || "");
  const etapaAntes = estado.etapa;
  const emAtendimentoAntes = estado.emAtendimento;

  limparTimer(estado);

  if (estado.emAtendimento) {
    const textoBaixo = (msg.body || "").toLowerCase();
    if (textoBaixo.includes("voltar") || textoBaixo.includes("continuar") || textoBaixo.includes("voltei")) {
    } else {
      await enviarParaAtendentes(`💬 CLIENTE COM ATENDENTE - ${estado.nomeCliente || ""} - ${numeroCliente}:\n\n${msg.body || "[mandou foto/áudio]"}\n\nPra devolver pra Lia, pede pra ela digitar: voltei`);
      return;
    }
  }

  const resposta = processarMensagem(textoCliente, estado);
  if (resposta === null || resposta === undefined) return;
  await client.sendMessage(numeroCliente, resposta);

  if ((etapaAntes === "escolhendo_produto" || etapaAntes === "escolher_entre_varios") && estado.etapa === "confirmar_produto" && estado.produto) {
    await mandarFotoProduto(numeroCliente, estado.produto.nome);
  }

  if (etapaAntes === "escolher_corda" && estado.etapa === "perguntando_cor") {
    await mandarCartela(numeroCliente, estado.corda, "Olha a cartela aqui! 😍 Qual cor você mais gostou?");
  }
  if (etapaAntes === "perguntar_corda_segunda_cor" && estado.etapa === "perguntando_segunda_cor") {
    if (estado.corda2 !== estado.corda) {
      await mandarCartela(numeroCliente, estado.corda2, "Olha a cartela da segunda cor aqui! 😍 Qual você gostou?");
    }
  }
  if (etapaAntes === "trocar_corda_cor1" && estado.etapa === "trocar_cor1") {
    await mandarCartela(numeroCliente, estado.corda, "Olha a cartela da nova cor 1 aqui! 😍 Qual você gostou?");
  }
  if (etapaAntes === "trocar_corda_cor2" && estado.etapa === "trocar_cor2") {
    await mandarCartela(numeroCliente, estado.corda2, "Olha a cartela da nova cor 2 aqui! 😍 Qual você gostou?");
  }

  if (estado.etapa === "avaliacao" && etapaAntes === "perguntar_finalizar" && !estado.jaMandouResumoFinal) {
    estado.jaMandouResumoFinal = true;
    let forma = estado.formaPagamento || "não informou";
    if (forma === "pix") forma = "PIX";
    if (forma === "dinheiro") forma = "DINHEIRO";
    if (forma === "cartao") forma = "CARTÃO";
    if (estado.parcelas) forma += ` - ${estado.parcelas}x`;
    if (estado.combinacaoDinheiro) forma += `\nCombinado no dinheiro: ${estado.combinacaoDinheiro}`;

    const avisoFinal = `🔔 PEDIDO FINALIZADO - ${estado.nomeCliente || "Cliente"}\n\n` +
      `👤 Cliente: ${estado.nomeCliente || "não informou"}\n` +
      `📱 Número: ${numeroCliente}\n` +
      `💳 Forma de pagamento: ${forma}\n` +
      `----------------------\n` +
      `${montarResumoPedido(estado)}\n` +
      `----------------------\n` +
      `A cliente finalizou o pedido! Entra pra confirmar com ela! 🥰`;

    await enviarParaAtendentes(avisoFinal);
  }

  if (estado.etapa === "aguardando_atendente" && etapaAntes === "escolher_parcelas") {
    const resumo = montarResumoPedido(estado);
    const aviso = mensagemParaAtendente(
      numeroCliente,
      estado.nomeCliente,
      resumo,
      estado.parcelas,
      estado.totalCartao,
      estado.valorParcela
    );
    await enviarParaAtendentes(aviso);
  }

  if (estado.etapa === "aguardando_atendente_mudanca" && !emAtendimentoAntes) {
    let resumo = `🔔 CLIENTE QUER FALAR COM ATENDENTE\n\n`;
    if (estado.nomeCliente) resumo += `Cliente: ${estado.nomeCliente} - ${numeroCliente}\n`;
    else resumo += `Cliente: ${numeroCliente}\n`;
    try { resumo += montarResumoPedido(estado) + `\n`; } catch(e) { resumo += `Produto: ${estado.produto ? estado.produto.nome : "ainda não escolheu"}\n`; }
    resumo += `\nA Lia está PAUSADA pra essa cliente. Pode falar com ela no seu WhatsApp pessoal.\nQuando terminar, pede pra ela voltar aqui e digitar: voltei`;
    await enviarParaAtendentes(resumo);
  }

  if (estado.etapa === "concluido" && estado.desistiu) {
    const avisoDesistiu = `🔔 CLIENTE DESISTIU DO PEDIDO - ${estado.nomeCliente || "Cliente"}\n\n👤 Cliente: ${estado.nomeCliente || "não informou"} - ${numeroCliente}\n${montarResumoPedido(estado)}\n\nA cliente desistiu no pagamento!`;
    await enviarParaAtendentes(avisoDesistiu);
    estado.desistiu = null;
  }

  if (estado.etapa === "concluido" && estado.avaliacao) {
    let avisoNota = `⭐ AVALIAÇÃO DA LIA - ${estado.nomeCliente || numeroCliente}\n\nCliente: ${estado.nomeCliente || ""} - ${numeroCliente}\n${montarResumoPedido(estado)}\nNota: ${estado.avaliacao} / 5 ${"⭐".repeat(estado.avaliacao)}`;
    if (estado.melhoria) {
      avisoNota += `\n\n⚠️ MOTIVO DA NOTA BAIXA / MELHORIA:\n${estado.melhoria}`;
    }
    avisoNota += `\n\nA cliente finalizou e avaliou a Lia!`;
    await enviarParaAtendentes(avisoNota);
    estado.avaliacao = null;
    estado.melhoria = null;
  }

  agendarTimeout(numeroCliente);

  if (estado.etapa === "concluido") {
    limparTimer(estado);
    setTimeout(() => {
      delete conversas[numeroCliente];
    }, 30 * 60 * 1000);
  }
});

client.initialize();