// ==========================================
// LIA - ELIAZAR ARTESANATOS - COMPLETO FINAL
// Nome + 2 cores + principal + pano + dinheiro + atendente + voltei + finalizar + nota + CARRINHO + Painel Boho Chic + cores reais + 2ª cor mesma corda não manda foto de novo
// ==========================================

const fs = require("fs");
const path = require("path");

const LINK_CATALOGO = "https://drive.google.com/file/d/1hx_gK524_RE6H2_y6sIu5EJzZrdzVKtK/view?usp=sharing";
const PIX_CHAVE = "artesanatoseliazar@gmail.com";
const PIX_NOME = "Eliazar Rosa Rocha";

const MODELOS_COM_PANO = [
  "Jogo Americano Aurora 2",
  "Jogo Americano Harmonia",
  "Jogo Americano Onda 1"
];
const PRECO_PANO_POR_UNIDADE = 15.00;

function normalizar(texto) {
  return (texto || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatarPreco(valor) {
  return "R$ " + Number(valor).toFixed(2).replace(".", ",");
}

function nomeBonitoCorda(corda) {
  if (corda === "corda-lisa") return "Corda Lisa 6mm";
  if (corda === "corda-especial") return "Corda Especial 6mm";
  if (corda === "corda-nautica") return "Corda Náutica 6mm";
  return corda || "";
}

function ehJogoAmericano(produto) {
  if (!produto) return false;
  const nome = normalizar(produto.nome);
  const cat = normalizar(produto.categoria || "");
  // Cesta nunca é Jogo Americano, mesmo se for Duna
  if (nome.includes("cesta")) return false;
  return nome.includes("jogo americano") || cat.includes("jogos americanos");
}

function ehSemCor(produto) {
  if (!produto) return false;
  if (produto.sem_cor === true) return true;
  return normalizar(produto.nome).includes("painel boho chic");
}

function temOpcaoPano(produto) {
  if (!produto) return false;
  return MODELOS_COM_PANO.some(m => normalizar(m) === normalizar(produto.nome));
}

function precoDeItem(item) {
  if (!item || !item.produto) return 0;
  const qtd = item.quantidade || 1;
  let total = Number(item.produto.preco) * qtd;
  if (item.querPano && temOpcaoPano(item.produto)) {
    total += PRECO_PANO_POR_UNIDADE * qtd;
  }
  return total;
}

function precoBaseTotal(estado) {
  let total = 0;
  if (estado.carrinho) {
    for (let it of estado.carrinho) total += precoDeItem(it);
  }
  if (estado.produto && !estado.produtoJaNoCarrinho) {
    total += precoDeItem(estado);
  }
  return total;
}

function textoDeItem(item, indice) {
  let r = `${indice} - 🧶 ${item.produto.nome}\n`;
  if (ehJogoAmericano(item.produto)) {
    r += `   Quantidade: ${item.quantidade || 1} lugares\n`;
    if (temOpcaoPano(item.produto)) {
      r += `   Pano: ${item.querPano ? "Sim (+ " + formatarPreco(PRECO_PANO_POR_UNIDADE * (item.quantidade || 1)) + ")" : "Não, como está na foto (só anel)"}\n`;
    }
  }
  if (ehSemCor(item.produto)) {
    r += `   Sem opção de cor / Sem opção de corda\n`;
  }
  if (item.corda) r += `   Corda 1: ${nomeBonitoCorda(item.corda)} - Cor: ${item.cor}\n`;
  if (item.cor2 && item.corda2) {
    r += `   Corda 2: ${nomeBonitoCorda(item.corda2)} - Cor: ${item.cor2}\n`;
    if (item.corPrincipal) r += `   ⭐ Principal: ${nomeBonitoCorda(item.cordaPrincipal)} - Cor: ${item.corPrincipal}\n`;
  }
  r += `   Valor: ${formatarPreco(precoDeItem(item))}\n`;
  return r;
}

function montarResumoPedido(estado) {
  let r = ``;
  if (estado.nomeCliente) r += `Cliente: ${estado.nomeCliente}\n`;
  let todos = [];
  if (estado.carrinho) todos = [...estado.carrinho];
  if (estado.produto && !estado.produtoJaNoCarrinho) {
    todos.push(estado);
  }
  if (todos.length === 0 && estado.produto) todos.push(estado);
  todos.forEach((it, i) => {
    r += textoDeItem(it, i + 1);
  });
  r += `\nValor total do pedido: ${formatarPreco(precoBaseTotal(estado))}`;
  return r;
}

function salvarItemNoCarrinho(estado) {
  if (!estado.produto) return;
  if (!estado.carrinho) estado.carrinho = [];
  estado.carrinho.push({
    produto: estado.produto,
    quantidade: estado.quantidade || 1,
    querPano: estado.querPano || false,
    corda: estado.corda,
    cor: estado.cor,
    corda2: estado.corda2,
    cor2: estado.cor2,
    corPrincipal: estado.corPrincipal,
    cordaPrincipal: estado.cordaPrincipal
  });
  estado.produtoJaNoCarrinho = true;
}

function limparItemAtual(estado) {
  estado.produto = null;
  estado.quantidade = 1;
  estado.querPano = false;
  estado.corda = null; estado.cor = null; estado.corda2 = null; estado.cor2 = null; estado.corPrincipal = null; estado.cordaPrincipal = null;
  estado.produtoJaNoCarrinho = false;
}

let PRODUTOS = [];
try {
  const caminho = path.join(__dirname, "products.json");
  const dados = fs.readFileSync(caminho, "utf8");
  PRODUTOS = JSON.parse(dados);
} catch (e) {
  console.log("Não achei o products.json, Lia vai usar lista vazia");
}

function acharCor(textoCliente, lista) {
  let msgCor = normalizar(textoCliente)
    .replace(/\b(gostei|quero|gostaria|ficar|vou|prefiro|me da|me dá|da|do|de|a|o|cor)\b/g, " ")
    .replace(/\s+/g, " ").trim();
  msgCor = msgCor.replace(/\s*\+\s*/g, " + ");
  if (!msgCor) msgCor = normalizar(textoCliente);
  const num = parseInt(msgCor.match(/\d+/)?.[0] || "0");
  if (num >= 1 && num <= lista.length) return lista[num - 1];
  let achada = lista.find(c => normalizar(c).replace(/\s*\+\s*/g, " + ") === msgCor);
  if (achada) return achada;
  return lista.find(c => {
    const nc = normalizar(c).replace(/\s*\+\s*/g, " + ");
    return nc.includes(msgCor) || msgCor.includes(nc);
  });
}

function mensagemApresentacao() {
  return `Oi! Tudo bem? 🥰\n\n` +
  `Eu sou a Lia, assistente virtual do Eliazar Artesanatos! 🧶❤️\n\n` +
  `Como posso te chamar? Qual o seu nome?`;
}

function mensagemDepoisDoNome(nome) {
  return `Que prazer te conhecer, ${nome}! 🥰❤️\n\n` +
  `Aqui a gente faz tudo à mão com muito carinho, só pra você. Cada peça é feita por encomenda, na cor que você escolher.\n\n` +
  `Quer ver nosso catálogo?\n` +
  `👇\n` +
  `Aqui está: ${LINK_CATALOGO}\n\n` +
  `Qual item você gostou? Ou quer alguma informação sobre algum item?\n` +
  `Digite apenas o nome, como está no catálogo.`;
}

function acharProduto(mensagemDaCliente) {
  const msgNormalizada = normalizar(mensagemDaCliente);
  const palavrasIgnorar = ["quanto", "qual", "valor", "preco", "custa", "quero", "gostaria", "tem", "o", "a", "de", "do", "da", "e", "um", "uma", "me", "mostra", "ver"];
  const palavrasMsg = msgNormalizada
    .replace(/[?!.]/g, " ")
    .split(" ")
    .map(p => p.trim())
    .filter(p => p.length > 0 && !palavrasIgnorar.includes(p));
  if (palavrasMsg.length === 0) return { tipo: "nenhum" };
  const candidatos = PRODUTOS.map(p => {
    const palavrasProduto = normalizar(p.nome).split(" ").filter(w => w.length > 0);
    const palavrasQueBateram = palavrasMsg.filter(w => palavrasProduto.includes(w));
    return { produto: p, palavrasProduto, palavrasQueBateram };
  });
  let exatos = candidatos.filter(c =>
    c.palavrasProduto.length === palavrasMsg.length &&
    c.palavrasProduto.every(w => palavrasMsg.includes(w))
  );
  if (exatos.length === 1) return { tipo: "unico", produto: exatos[0].produto };
  if (exatos.length > 1) return { tipo: "varios", lista: exatos.map(c => c.produto) };
  let contidos = candidatos.filter(c =>
    c.palavrasQueBateram.length === palavrasMsg.length &&
    palavrasMsg.length >= 2
  );
  if (contidos.length === 1) return { tipo: "unico", produto: contidos[0].produto };
  if (contidos.length > 1) return { tipo: "varios", lista: contidos.map(c => c.produto) };
  if (palavrasMsg.length === 1) {
    let umSo = candidatos.filter(c => c.palavrasProduto.includes(palavrasMsg[0]));
    if (umSo.length === 1) return { tipo: "unico", produto: umSo[0].produto };
    if (umSo.length > 1) return { tipo: "varios", lista: umSo.map(c => c.produto) };
  }
  return { tipo: "nenhum" };
}

function mensagemProdutoEncontrado(produto) {
  return `Perfeito! Achei aqui, ó:\n\n` +
  `🧶 ${produto.nome}\n` +
  `💰 ${formatarPreco(produto.preco)} por unidade\n\n` +
  `É esse mesmo?`;
}

function mensagemVariosProdutos(lista) {
  let texto = `Achei esses aqui, qual você quer?\n\n`;
  lista.forEach((p, i) => {
    texto += `${i + 1} - ${p.nome} - ${formatarPreco(p.preco)}\n`;
  });
  texto += `\nDigite só o número, tá?`;
  return texto;
}

function mensagemValorProduto(produto) {
  return `O ${produto.nome} é ${formatarPreco(produto.preco)} por unidade\n\n` +
  `Quer que eu já garanta a sua encomenda? É feita só pra você, na cor que você escolher! 🧶❤️`;
}

const CORES = {
  "corda-lisa": ["Azul Bebê", "Areia", "Petróleo", "Fucsia", "Rosa Bebê", "Amarelo", "Mostarda", "Pistache", "Lavanda", "Preto", "Vermelho Vivo", "Bordô", "Verde Limão Neon", "Branco", "Caramelo", "Cru", "Marrom Escuro", "Atacama", "Terracota", "Marinho", "Bege", "Verde Musgo"],
  "corda-especial": [
    "Cru com Ouro",
    "Verde Musgo com Ouro",
    "Vermelho com Ouro",
    "Cru Pontilhado Terracota",
    "Cru Pontilhado Caramelo",
    "Cru Pontilhado Musgo",
    "Verde Musgo + Cru",
    "Terracota + Cru",
    "Mostarda + Cru",
    "Marinho + Cru",
    "Vermelho + Branco",
    "Preto + Cru"
  ],
  "corda-nautica": ["Preto", "Areia", "Rami", "Caramelo"]
};

function mensagemPerguntaCorda() {
  return `Perfeito! Agora vamos escolher a corda? 🧶\n\n` +
  `Qual corda você prefere?\n\n` +
  `Digite só o número:\n` +
  `1 - Corda Lisa 6mm - 22 cores\n` +
  `2 - Corda Especial 6mm - 12 cores com Ouro, Pontilhadas e Mescladas\n` +
  `3 - Corda Náutica 6mm - 4 cores super resistentes`;
}

function entenderPagamento(mensagemDaCliente) {
  const msg = normalizar(mensagemDaCliente);
  if (msg === "1" || msg.includes("pix")) return "pix";
  if (msg === "2" || msg.includes("dinheiro")) return "dinheiro";
  if (msg === "3" || msg.includes("cartao") || msg.includes("credito") || msg.includes("parcelar") || msg.includes("parcelado")) return "cartao";
  return null;
}

function entenderParcelas(mensagemDaCliente) {
  const msg = normalizar(mensagemDaCliente);
  const numero = msg.match(/\d+/);
  if (numero) {
    const parcelas = parseInt(numero[0]);
    if (parcelas >= 1 && parcelas <= 12) return parcelas;
  }
  const porExtenso = { "uma": 1, "um": 1, "duas": 2, "dois": 2, "tres": 3, "quatro": 4, "cinco": 5, "seis": 6, "sete": 7, "oito": 8, "nove": 9, "dez": 10, "onze": 11, "doze": 12 };
  for (let palavra in porExtenso) {
    if (msg.includes(palavra)) return porExtenso[palavra];
  }
  return null;
}

function mensagemFormasPagamento() {
  return `Como sua peça é feita por encomenda, só pra você, o pagamento é feito antes, tá? Garantindo assim a sua encomenda! 🧶❤️\n\n` +
  `Como você prefere pagar?\n\n` +
  `Digite só o número, tá?\n\n` +
  `1️⃣ - Pix - com 5% de desconto\n` +
  `2️⃣ - Dinheiro - com 5% de desconto\n` +
  `3️⃣ - Cartão de Crédito - de 1x até 12x\n` +
  `4️⃣ - Desistir / Cancelar pedido`;
}

function mensagemPix(precoOriginal) {
  const valorFinal = precoOriginal * 0.95;
  return `Perfeito! No Pix você tem 5% de desconto! 🥰\n\n` +
  `Assim eu já garanto a sua encomenda e já começo a fazer a sua peça na hora! 🧶❤️\n\n` +
  `Pode fazer o Pix aqui, ó:\n` +
  `Chave Pix (e-mail): ${PIX_CHAVE}\n` +
  `Nome que vai aparecer: ${PIX_NOME}\n` +
  `Valor: ${formatarPreco(valorFinal)}\n\n` +
  `Depois que fizer, me manda o comprovante aqui que eu já garanto a sua encomenda!\n\n` +
  `Caso queira mudar a forma de pagamento, digite: mudar a forma de pagamento`;
}

function mensagemDinheiro(precoOriginal) {
  const valorFinal = precoOriginal * 0.95;
  return `Perfeito! No Dinheiro você também tem 5% de desconto! 🥰\n\n` +
  `Valor: ${formatarPreco(valorFinal)}\n\n` +
  `Como você quer combinar o pagamento em dinheiro? Me fala aqui, por exemplo:\n` +
  `Na entrega do produto\n\n` +
  `É só escrever do seu jeito que eu já anoto aqui e garanto a sua encomenda!\n\n` +
  `Caso queira mudar a forma de pagamento, digite: mudar a forma de pagamento`;
}

function mensagemCartao(precoOriginal, parcelas) {
  const taxas = { 1: 0.0385, 2: 0.0655, 3: 0.0758, 4: 0.0861, 5: 0.0964, 6: 0.1067, 7: 0.117, 8: 0.1273, 9: 0.1376, 10: 0.1479, 11: 0.1582, 12: 0.1685 };
  const taxa = taxas[parcelas] || 0.0385;
  const total = precoOriginal / (1 - taxa);
  const porParcela = total / parcelas;
  return `Perfeito! Ficou assim, ó:\n\n` +
  `🧶 Valor total: ${formatarPreco(total)}\n` +
  `💳 ${parcelas}x de ${formatarPreco(porParcela)} no cartão\n\n` +
  `Assim eu já garanto a sua encomenda! 🧶❤️\n\n` +
  `Vou te passar agora pra nossa atendente, que ela já te manda o link de pagamento, tá? Só um minutinho!\n\n` +
  `Depois que pagar no link, é só escrever aqui: confirmei o pagamento\n\n` +
  `Caso queira mudar a forma de pagamento, digite: mudar a forma de pagamento`;
}

function mensagemParaAtendente(cliente, nomeCliente, resumoCompleto, parcelas, total, porParcela) {
  let texto = `🔔 NOVA VENDA NO CARTÃO - PRECISA DO LINK\n\n` +
  `Cliente: ${nomeCliente ? nomeCliente + " - " : ""}${cliente}\n`;
  if (resumoCompleto) {
    texto += `${resumoCompleto}\n\n`;
  }
  texto += `Parcelas: ${parcelas}x de ${formatarPreco(porParcela)}\n` +
  `Total: ${formatarPreco(total)}\n\n` +
  `Faz o link na InfinitePay e manda pra cliente, tá?`;
  return texto;
}

function entenderTrocaPagamento(mensagemDaCliente) {
  const msg = normalizar(mensagemDaCliente);
  if (msg === "mudar") return "mostrar_opcoes";
  if (msg.includes("mudar") && msg.includes("pagamento")) return "mostrar_opcoes";
  if (msg.includes("trocar") && msg.includes("pagamento")) return "mostrar_opcoes";
  if (msg.includes("mudar") && msg.includes("forma")) return "mostrar_opcoes";
  if (msg.includes("quero no pix") || msg.includes("vou no pix") || msg.includes("prefiro pix") || msg.includes("fazer no pix")) return "pix";
  if (msg.includes("quero no dinheiro") || msg.includes("vou no dinheiro") || msg.includes("prefiro dinheiro") || msg.includes("pagar em dinheiro")) return "dinheiro";
  if (msg.includes("quero no cartao") || msg.includes("vou no cartao") || msg.includes("prefiro cartao") || msg.includes("quero no credito")) return "cartao";
  return null;
}

function mensagemAgradecimento(estado) {
  return `Recebido! 😍✨\n\nMuito obrigada pela sua compra, viu? Você fez uma ótima escolha!\n\nSeu pedido já vai entrar na fila de produção da Eliazar! 🧶💖\n\nAssim que ele estiver pronto a gente te avisa aqui mesmo!\n\nObrigada por comprar da Eliazar Rocha! ❤️`;
}

function mensagemConfirmarCores(estado) {
  return `Perfeito! Suas duas cores ficaram assim: 😍\n\n` +
  `1ª cor: ${nomeBonitoCorda(estado.corda)} - ${estado.cor}\n` +
  `2ª cor: ${nomeBonitoCorda(estado.corda2)} - ${estado.cor2}\n\n` +
  `Tá certinho?\n\n` +
  `Digita 1 pra SIM, tá certinho, pode confirmar\n` +
  `Digita 2 pra NÃO, quero trocar a cor 1\n` +
  `Digita 3 pra NÃO, quero trocar a cor 2`;
}

function mensagemPerguntaParcelas() {
  return `Perfeito! No cartão você pode parcelar de 1x até 12x.\n\n` +
  `Digite só o número de parcelas, por exemplo: 3`;
}

function mensagemPerguntaFinalizar(estado) {
  return `Seu pedido já está garantido, ${estado.nomeCliente || ""}! 🥰\n\n` +
  `Deseja finalizar a conversa?\n\n` +
  `Digita SIM pra finalizar\n` +
  `Digita NÃO se ainda quiser falar mais alguma coisa`;
}

function mensagemPerguntaAvaliacao(estado) {
  return mensagemAgradecimento(estado) + `\n\n` +
  `Antes de ir, me conta, o que você achou do meu atendimento? 🥰\n\n` +
  `Dá uma nota de 1 a 5, tá?\n\n` +
  `1 - Ruim\n` +
  `2 - Mais ou menos\n` +
  `3 - Bom\n` +
  `4 - Muito bom\n` +
  `5 - Perfeito, amei! ❤️`;
}

function mensagemPerguntarMaisProduto(estado) {
  return `Adicionei ${estado.produto ? estado.produto.nome : "esse item"} no seu pedido! 😍\n\n🧶 Seu pedido até agora:\n${montarResumoPedido(estado)}\n\nQuer adicionar mais algum produto nesse MESMO pedido?\n\nDigita 1 pra SIM, quero adicionar mais um\nDigita 2 pra NÃO, pode fechar o pedido e ir pro pagamento`;
}

function processarMensagem(mensagemDaCliente, estado) {
  const msg = normalizar(mensagemDaCliente);
  if (!estado.carrinho) estado.carrinho = [];
  if (estado.produtoJaNoCarrinho === undefined) estado.produtoJaNoCarrinho = false;

  if (
    msg.includes("atendente") ||
    msg.includes("falar com eliazar") ||
    msg.includes("tem alguem") ||
    msg.includes("quero falar com") ||
    msg.includes("posso falar com") ||
    msg.includes("chama a eliazar") ||
    msg.includes("cade a eliazar")
  ) {
    if (!estado.emAtendimento) {
      estado.emAtendimento = true;
      estado.etapaAntesAtendente = estado.etapa;
      estado.etapa = "aguardando_atendente_mudanca";
      return `Sem problema! Vou te passar para nossa atendente, tá? Só um minutinho... 🥰\n\nA partir de agora é só você e ela, eu vou ficar quietinha aqui!\n\n⚠️ IMPORTANTE, ANOTA AÍ:\nQuando você terminar de falar com a nossa atendente, volta aqui nessa conversa e manda:\n\n👉 voltei\n\nAí eu volto na hora pra continuar com você, tá? Não precisa mandar oi de novo, é só mandar: voltei`;
    }
    return null;
  }

  if (estado.emAtendimento) {
    if (msg.includes("voltar") || msg.includes("continuar") || msg.includes("voltar pra lia") || msg.includes("pode voltar") || msg.includes("voltei")) {
      estado.emAtendimento = false;
      estado.etapa = estado.etapaAntesAtendente || "confirmar_antes_pagamento";
      let resumo = "";
      if (estado.produto || (estado.carrinho && estado.carrinho.length)) resumo = `\n\n🧶 Resumo até agora:\n${montarResumoPedido(estado)}\n`;
      return `Oi! Voltei! 🥰\n\nJá conversou com a atendente? Vamos continuar de onde paramos?${resumo}\nMe fala, onde a gente parou?`;
    }
    return null;
  }

  if (estado.etapa === "inicio") {
    estado.etapa = "perguntando_nome";
    return mensagemApresentacao();
  }

  if (estado.etapa === "perguntando_nome") {
    let nome = mensagemDaCliente.trim();
    nome = nome.replace(/^(meu nome e|me chamo|sou a|sou o|meu nome|eu sou)\s+/i, "").trim();
    nome = nome.split(" ")[0];
    nome = nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
    estado.nomeCliente = nome;
    estado.etapa = "escolhendo_produto";
    return mensagemDepoisDoNome(nome);
  }

  if (estado.etapa === "escolhendo_produto") {
    const resultado = acharProduto(mensagemDaCliente);
    if (resultado.tipo === "unico") {
      estado.produto = resultado.produto;
      estado.quantidade = 1;
      estado.querPano = false;
      estado.corda = null; estado.cor = null; estado.corda2 = null; estado.cor2 = null; estado.corPrincipal = null; estado.cordaPrincipal = null;
      estado.produtoJaNoCarrinho = false;
      estado.etapa = "confirmar_produto";
      return mensagemProdutoEncontrado(resultado.produto);
    }
    if (resultado.tipo === "varios") {
      estado.listaTemp = resultado.lista;
      estado.etapa = "escolher_entre_varios";
      return mensagemVariosProdutos(resultado.lista);
    }
    return `Não achei esse nome aqui, tá? 🥺\nDá uma olhadinha no catálogo de novo: ${LINK_CATALOGO}\n\nDigite apenas o nome, como está no catálogo.`;
  }

  if (estado.etapa === "escolher_entre_varios") {
    const num = parseInt(msg.match(/\d+/)?.[0] || "0");
    if (num >= 1 && num <= estado.listaTemp.length) {
      estado.produto = estado.listaTemp[num - 1];
      estado.quantidade = 1;
      estado.querPano = false;
      estado.corda = null; estado.cor = null; estado.corda2 = null; estado.cor2 = null; estado.corPrincipal = null; estado.cordaPrincipal = null;
      estado.produtoJaNoCarrinho = false;
      estado.etapa = "confirmar_produto";
      return mensagemProdutoEncontrado(estado.produto);
    }
    return `Digite só o número do item que você quer, tá?`;
  }

  if (estado.etapa === "confirmar_produto") {
    if (msg.includes("sim") || msg.includes("esse") || msg.includes("isso") || msg === "s") {
      if (ehSemCor(estado.produto)) {
        estado.etapa = "perguntar_mais_produto";
        return `Perfeito! É o ${estado.produto.nome} mesmo, né? 😍\n\nEle é só desse jeitinho aqui mesmo, sem opção de cor e sem opção de corda.\n\n` + mensagemPerguntarMaisProduto(estado);
      }
      if (ehJogoAmericano(estado.produto)) {
        estado.etapa = "perguntar_lugares";
        return `Perfeito! Você escolheu ${estado.produto.nome} 😍\n\nQuantos lugares vai ser o seu jogo?\nDigita a quantidade! Ex: 2, 4, 6, 8...`;
      }
      estado.etapa = "escolher_corda";
      return mensagemPerguntaCorda();
    }
    if (msg.includes("valor") || msg.includes("preco") || msg.includes("quanto")) {
      return mensagemValorProduto(estado.produto);
    }
    estado.etapa = "escolhendo_produto";
    return `Sem problema! Qual outro item você quer? Digite o nome como está no catálogo.`;
  }

  if (estado.etapa === "perguntar_mais_produto") {
    if (msg === "1" || msg.includes("sim") || msg.includes("quero mais") || msg.includes("adicionar") || msg.includes("mais um")) {
      salvarItemNoCarrinho(estado);
      limparItemAtual(estado);
      estado.etapa = "escolhendo_produto";
      return `Perfeito! Vamos adicionar mais um então! 😍\n\nQual outro item você quer nesse mesmo pedido? Digita o nome como está no catálogo!`;
    }
    if (msg === "2" || msg.includes("nao") || msg.includes("não") || msg.includes("fechar") || msg.includes("pode fechar") || msg.includes("só isso") || msg.includes("so isso")) {
      estado.etapa = "confirmar_antes_pagamento";
      return `Perfeito! Vamos fechar então! 😍\n\n🧶 Resumo do seu pedido:\n${montarResumoPedido(estado)}\n\nVocê quer mudar alguma coisa do pedido?\n\nDigita 1 pra NÃO, tá tudo certo, pode seguir pro pagamento\nDigita 2 pra SIM, quero mudar`;
    }
    return `Digita 1 pra adicionar mais um produto ou 2 pra fechar o pedido e ir pro pagamento, tá?`;
  }

  if (estado.etapa === "perguntar_lugares") {
    const qtd = parseInt(msg.match(/\d+/)?.[0] || "0");
    if (!qtd || qtd <= 0) return `Digita só o número de lugares, tá? Ex: 4`;
    estado.quantidade = qtd;
    if (temOpcaoPano(estado.produto)) {
      estado.etapa = "perguntar_pano";
      const valorPano = formatarPreco(qtd * PRECO_PANO_POR_UNIDADE);
      return `Só lembrando, viu? O produto é igualzinho está no catálogo, não vem nada a mais e nem a menos! 😍\nEsse modelo vem só com o anel de guardanapo, não vem com o guardanapo de pano.\n\nSe você quiser o pano também, é R$ 15,00 por cada unidade. No seu caso, ${qtd} lugares = ${valorPano} a mais.\n\nDigita 1 pra deixar como está na foto\nDigita 2 pra adicionar o pano`;
    }
    estado.etapa = "escolher_corda";
    return `Perfeito! ${qtd} lugares de ${estado.produto.nome}. 😍\n\n` + mensagemPerguntaCorda();
  }

  if (estado.etapa === "perguntar_pano") {
    if (msg === "1" || msg.includes("como esta") || msg.includes("sem pano") || msg.includes("deixar")) estado.querPano = false;
    else if (msg === "2" || msg.includes("com pano") || msg.includes("adicionar") || msg.includes("quero pano")) estado.querPano = true;
    else return `Digita 1 pra deixar como está na foto ou 2 pra adicionar o pano, tá?`;
    estado.etapa = "escolher_corda";
    return `Perfeito! ${estado.querPano ? "Com pano! 😍" : "Sem pano, como está na foto! 😍"}\n\n` + mensagemPerguntaCorda();
  }

  if (estado.etapa === "escolher_corda") {
    if (msg === "1" || msg.includes("lisa")) estado.corda = "corda-lisa";
    else if (msg === "2" || msg.includes("especial")) estado.corda = "corda-especial";
    else if (msg === "3" || msg.includes("nautica")) estado.corda = "corda-nautica";
    else return `Digite 1, 2 ou 3, tá?`;
    estado.etapa = "perguntando_cor";
    estado.jaMandouCores = false;
    return `Perfeito! Vou te mandar a foto da cartela de cores dessa corda, tá? ❤️\n\nOlha aí em cima que já chegou! Me fala o nome da cor que você mais gostou!`;
  }

  if (estado.etapa === "perguntando_cor") {
    const lista = CORES[estado.corda] || [];
    const corEscolhida = acharCor(mensagemDaCliente, lista);
    if (!corEscolhida) return `Não achei essa cor, tá? Olha de novo na foto que eu mandei e me fala o nome da cor, como está na foto.`;
    estado.cor = corEscolhida;
    estado.etapa = "perguntar_uma_ou_duas_cores";
    return `Linda escolha! 😍 ${corEscolhida} vai ficar perfeito!\n\nAgora me fala, seu pedido vai ser:\n\nDigita 1 pra UMA COR SÓ - só ${corEscolhida}\nDigita 2 pra DUAS CORES - ${corEscolhida} + mais uma cor`;
  }

  if (estado.etapa === "perguntar_uma_ou_duas_cores") {
    if (msg === "1" || msg.includes("uma cor") || msg.includes("uma so") || msg.includes("só uma") || msg.includes("so uma")) {
      estado.corda2 = null; estado.cor2 = null; estado.corPrincipal = estado.cor; estado.cordaPrincipal = estado.corda;
      estado.etapa = "perguntar_mais_produto";
      return `Perfeito! Vai ser só ${estado.cor} mesmo! 😍\n\n` + mensagemPerguntarMaisProduto(estado);
    }
    if (msg === "2" || msg.includes("duas") || msg.includes("2 cores") || msg.includes("dois")) {
      estado.etapa = "perguntar_corda_segunda_cor";
      return `Perfeito! Vai ser DUAS cores! 😍\nA primeira já é ${estado.cor} na ${nomeBonitoCorda(estado.corda)}.\n\nAgora a segunda cor, vai ser de qual corda?\n\nDigita 1 pra Corda Lisa 6mm\nDigita 2 pra Corda Especial 6mm`;
    }
    return `Digita 1 pra uma cor só ou 2 pra duas cores, tá?`;
  }

  if (estado.etapa === "perguntar_corda_segunda_cor") {
    if (msg === "1" || msg.includes("lisa")) estado.corda2 = "corda-lisa";
    else if (msg === "2" || msg.includes("especial")) estado.corda2 = "corda-especial";
    else return `Digita 1 pra Corda Lisa ou 2 pra Corda Especial, tá?`;
    estado.etapa = "perguntando_segunda_cor";
    if (estado.corda2 === estado.corda) {
      return `Perfeito! Como a segunda cor também vai ser ${nomeBonitoCorda(estado.corda2)}, é a mesma cartela que eu já te mandei lá em cima! 😍\n\nOlha de novo naquela foto e me fala o nome da segunda cor que você gostou!`;
    }
    return `Perfeito! Vou te mandar a foto da cartela da segunda cor, tá? ❤️\n\nOlha aí em cima que já chegou! Me fala o nome da segunda cor que você gostou!`;
  }

  if (estado.etapa === "perguntando_segunda_cor") {
    const lista2 = CORES[estado.corda2] || [];
    const cor2 = acharCor(mensagemDaCliente, lista2);
    if (!cor2) return `Não achei essa cor, tá? Olha de novo na foto da segunda cartela e me fala o nome da cor, como está na foto.`;
    estado.cor2 = cor2;
    estado.etapa = "confirmar_cores";
    return mensagemConfirmarCores(estado);
  }

  if (estado.etapa === "confirmar_cores") {
    if (msg === "1" || msg.includes("tudo certo") || msg.includes("certinho") || msg.includes("confirmar") || msg.includes("pode seguir") || msg === "sim") {
      estado.etapa = "perguntar_cor_principal";
      return `Perfeito! Cores confirmadas! 😍\n\nAgora me fala, qual vai ser a cor principal? Qual vai ser a corda principal, que vai aparecer mais na peça?\n\nDigita 1 pra ${nomeBonitoCorda(estado.corda)} - ${estado.cor} ser a principal\nDigita 2 pra ${nomeBonitoCorda(estado.corda2)} - ${estado.cor2} ser a principal`;
    }
    if (msg === "2" || msg.includes("primeira") || msg.includes("cor 1")) {
      estado.etapa = "trocar_corda_cor1";
      return `Sem problema! Vamos trocar a cor 1! 🥰\nA cor 1 hoje é ${estado.cor} na ${nomeBonitoCorda(estado.corda)}.\n\nA nova cor 1 vai ser de qual corda?\n\nDigita 1 pra Corda Lisa 6mm\nDigita 2 pra Corda Especial 6mm\nDigita 3 pra Corda Náutica 6mm`;
    }
    if (msg === "3" || msg.includes("segunda")) {
      estado.etapa = "trocar_corda_cor2";
      return `Sem problema! Vamos trocar a cor 2! 🥰\nA cor 2 hoje é ${estado.cor2} na ${nomeBonitoCorda(estado.corda2)}.\n\nA nova cor 2 vai ser de qual corda?\n\nDigita 1 pra Corda Lisa 6mm\nDigita 2 pra Corda Especial 6mm`;
    }
    return `Digita 1 pra confirmar, 2 pra trocar a cor 1 ou 3 pra trocar a cor 2, tá?`;
  }

  if (estado.etapa === "trocar_corda_cor1") {
    if (msg === "1" || msg.includes("lisa")) estado.corda = "corda-lisa";
    else if (msg === "2" || msg.includes("especial")) estado.corda = "corda-especial";
    else if (msg === "3" || msg.includes("nautica")) estado.corda = "corda-nautica";
    else return `Digita 1 pra Lisa, 2 pra Especial ou 3 pra Náutica, tá?`;
    estado.etapa = "trocar_cor1";
    return `Vou te mandar a cartela de novo, tá? ❤️\n\nOlha aí em cima que já chegou! Me fala o nome da nova cor 1!`;
  }

  if (estado.etapa === "trocar_cor1") {
    const lista = CORES[estado.corda] || [];
    const nova = acharCor(mensagemDaCliente, lista);
    if (!nova) return `Não achei essa cor, tá? Olha de novo na foto e me fala o nome, como está na foto.`;
    estado.cor = nova;
    estado.etapa = "confirmar_cores";
    return mensagemConfirmarCores(estado);
  }

  if (estado.etapa === "trocar_corda_cor2") {
    if (msg === "1" || msg.includes("lisa")) estado.corda2 = "corda-lisa";
    else if (msg === "2" || msg.includes("especial")) estado.corda2 = "corda-especial";
    else return `Digita 1 pra Corda Lisa ou 2 pra Corda Especial, tá?`;
    estado.etapa = "trocar_cor2";
    return `Vou te mandar a cartela de novo, tá? ❤️\n\nOlha aí em cima que já chegou! Me fala o nome da nova cor 2!`;
  }

  if (estado.etapa === "trocar_cor2") {
    const lista2 = CORES[estado.corda2] || [];
    const nova2 = acharCor(mensagemDaCliente, lista2);
    if (!nova2) return `Não achei essa cor, tá? Olha de novo na foto e me fala o nome, como está na foto.`;
    estado.cor2 = nova2;
    estado.etapa = "confirmar_cores";
    return mensagemConfirmarCores(estado);
  }

  if (estado.etapa === "perguntar_cor_principal") {
    if (msg === "1" || normalizar(mensagemDaCliente) === normalizar(estado.cor) || normalizar(mensagemDaCliente).includes(normalizar(estado.cor))) {
      estado.corPrincipal = estado.cor;
      estado.cordaPrincipal = estado.corda;
    } else if (msg === "2" || normalizar(mensagemDaCliente) === normalizar(estado.cor2) || normalizar(mensagemDaCliente).includes(normalizar(estado.cor2))) {
      estado.corPrincipal = estado.cor2;
      estado.cordaPrincipal = estado.corda2;
    } else {
      return `Digita 1 pra ${estado.cor} ou 2 pra ${estado.cor2} ser a principal, tá?`;
    }
    estado.etapa = "perguntar_mais_produto";
    return `Perfeito! Então a corda principal vai ser ${nomeBonitoCorda(estado.cordaPrincipal)} - ${estado.corPrincipal}! ⭐\n\n` + mensagemPerguntarMaisProduto(estado);
  }

  if (estado.etapa === "confirmar_antes_pagamento") {
    if (msg === "1" || msg.includes("tudo certo") || msg.includes("pode seguir") || msg.includes("nao") || msg.includes("não") || msg.includes("seguir")) {
      if (estado.produto && !estado.produtoJaNoCarrinho) {
        salvarItemNoCarrinho(estado);
      }
      estado.etapa = "escolher_pagamento";
      return mensagemFormasPagamento();
    }
    if (msg === "2" || msg.includes("mudar") || msg.includes("trocar") || msg.includes("alterar") || msg === "sim") {
      estado.emAtendimento = true;
      estado.etapaAntesAtendente = "confirmar_antes_pagamento";
      estado.etapa = "aguardando_atendente_mudanca";
      return `Sem problema! Vou te passar para um atendente pra te ajudar a mudar seu pedido, tá? Só um minutinho... 🥰\n\nA partir de agora é só você e ela, eu vou ficar quietinha!\n\n⚠️ QUANDO TERMINAR, VOLTA AQUI E MANDA:\n👉 voltei\n\nAí eu volto na hora pra continuar com você!`;
    }
    return `Digita 1 pra seguir pro pagamento ou 2 pra mudar, tá?`;
  }

  if (estado.etapa === "aguardando_atendente_mudanca") {
    return `Já chamei nossa atendente, tá? Ela já já te ajuda! 🧶❤️\nQuando terminar, digita: voltei`;
  }

  if (estado.etapa === "escolher_pagamento") {
    // OPÇÃO 4 - DESISTIR
    if (msg === "4" || msg.includes("desistir") || msg.includes("cancelar") || msg.includes("nao quero mais") || msg.includes("nao vou querer")) {
      estado.etapa = "confirmar_desistencia";
      return `Sem problema nenhum, tá? 🥰\n\nVocê quer mesmo cancelar esse pedido?\n\nDigita 1 pra SIM, pode cancelar\nDigita 2 pra NÃO, quero continuar`;
    }
    const forma = entenderPagamento(mensagemDaCliente);
    if (forma === "pix") {
      estado.etapa = "fim";
      estado.formaPagamento = "pix";
      return mensagemPix(precoBaseTotal(estado));
    }
    if (forma === "dinheiro") {
      estado.etapa = "fim";
      estado.formaPagamento = "dinheiro";
      return mensagemDinheiro(precoBaseTotal(estado));
    }
    if (forma === "cartao") {
      estado.etapa = "escolher_parcelas";
      return mensagemPerguntaParcelas();
    }
    return `Digite 1 para Pix, 2 para Dinheiro, 3 para Cartão ou 4 para Desistir, tá?`;
  }

  // NOVA ETAPA - CONFIRMAR DESISTÊNCIA
  if (estado.etapa === "confirmar_desistencia") {
    if (msg === "1" || msg.includes("pode cancelar") || msg.includes("cancelar") || msg === "sim" || msg.includes("sim, cancela")) {
      estado.etapa = "concluido";
      estado.desistiu = true;
      return `Entendido! Cancelei seu pedido aqui, tá? ❤️\n\nSem problema nenhum, quando quiser voltar é só mandar um oi aqui que eu te atendo com todo carinho! 🧶✨\n\nObrigada por falar com a Eliazar Artesanatos! 🥰`;
    }
    if (msg === "2" || msg.includes("quero continuar") || msg.includes("continuar") || msg === "nao" || msg.includes("nao, quero continuar")) {
      estado.etapa = "escolher_pagamento";
      return `Ufa, que bom que vai continuar! 😍\n\n` + mensagemFormasPagamento();
    }
    return `Digita 1 pra SIM, pode cancelar ou 2 pra NÃO, quero continuar, tá?`;
  }
  
  if (estado.etapa === "escolher_parcelas") {
    const troca = entenderTrocaPagamento(mensagemDaCliente);
    if (troca === "mostrar_opcoes") {
      estado.etapa = "escolher_pagamento";
      return `Claro! Vamos trocar, sem problema! 🥰\n\n` + mensagemFormasPagamento();
    }
    if (troca === "pix") {
      estado.etapa = "fim";
      estado.formaPagamento = "pix";
      return `Sem problema! Vamos no Pix então, que você ainda ganha 5% de desconto! 🥰\n\n` + mensagemPix(precoBaseTotal(estado));
    }
    if (troca === "dinheiro") {
      estado.etapa = "fim";
      estado.formaPagamento = "dinheiro";
      return `Sem problema! Vamos no Dinheiro então! 🥰\n\n` + mensagemDinheiro(precoBaseTotal(estado));
    }
    const parcelas = entenderParcelas(mensagemDaCliente);
    if (!parcelas) return `Digite só o número de parcelas, por exemplo: 3`;
    estado.parcelas = parcelas;
    estado.etapa = "aguardando_atendente";
    const taxas = { 1: 0.0385, 2: 0.0655, 3: 0.0758, 4: 0.0861, 5: 0.0964, 6: 0.1067, 7: 0.117, 8: 0.1273, 9: 0.1376, 10: 0.1479, 11: 0.1582, 12: 0.1685 };
    const taxa = taxas[parcelas] || 0.0385;
    const total = precoBaseTotal(estado) / (1 - taxa);
    const porParcela = total / parcelas;
    estado.totalCartao = total;
    estado.valorParcela = porParcela;
    return mensagemCartao(precoBaseTotal(estado), parcelas);
  }

  if (estado.etapa === "aguardando_atendente") {
    if (msg.includes("confirmei") || msg.includes("paguei") || msg.includes("pago") || msg === "[comprovante]") {
      estado.etapa = "perguntar_finalizar";
      return mensagemPerguntaFinalizar(estado);
    }
    const troca = entenderTrocaPagamento(mensagemDaCliente);
    if (troca === "mostrar_opcoes") {
      estado.etapa = "escolher_pagamento";
      return `Claro! Vamos trocar, sem problema! 🥰\n\n` + mensagemFormasPagamento();
    }
    if (troca === "pix") {
      estado.etapa = "fim";
      return `Sem problema nenhum! Vamos no Pix então, que você ainda ganha 5% de desconto! 🥰\n\n` + mensagemPix(precoBaseTotal(estado));
    }
    if (troca === "dinheiro") {
      estado.etapa = "fim";
      return `Sem problema! Vamos no Dinheiro então! 🥰\n\n` + mensagemDinheiro(precoBaseTotal(estado));
    }
    if (troca === "cartao") {
      estado.etapa = "escolher_parcelas";
      return mensagemPerguntaParcelas();
    }
    return `Já chamei nossa atendente, tá? Ela já já te manda o link de pagamento aqui mesmo! 🧶❤️\n\nDepois que pagar, é só escrever: confirmei o pagamento\n\nSe quiser mudar, digite: mudar a forma de pagamento`;
  }

  if (estado.etapa === "fim") {
    const troca = entenderTrocaPagamento(mensagemDaCliente);
    if (troca === "mostrar_opcoes") {
      estado.etapa = "escolher_pagamento";
      return `Claro! Vamos trocar, sem problema! 🥰\n\n` + mensagemFormasPagamento();
    }
    if (troca === "pix") {
      estado.formaPagamento = "pix";
      return `Sem problema! Vamos no Pix então! 🥰\n\n` + mensagemPix(precoBaseTotal(estado));
    }
    if (troca === "dinheiro") {
      estado.formaPagamento = "dinheiro";
      return `Sem problema! Vamos no Dinheiro então! 🥰\n\n` + mensagemDinheiro(precoBaseTotal(estado));
    }
    if (troca === "cartao") {
      estado.etapa = "escolher_parcelas";
      return mensagemPerguntaParcelas();
    }
    if (estado.formaPagamento === "dinheiro") {
      if (msg.includes("paguei") || msg.includes("comprovante") || msg.includes("mandei") || msg === "[comprovante]" || msg.includes("confirmei") || msg.includes("pago")) {
        estado.etapa = "perguntar_finalizar";
        return mensagemPerguntaFinalizar(estado);
      }
      estado.combinacaoDinheiro = mensagemDaCliente;
      estado.etapa = "perguntar_finalizar";
      return `Combinado, ${estado.nomeCliente || ""}! 🥰\n\n` +
      `Anotado aqui: pagamento em dinheiro - ${mensagemDaCliente}\n\n` +
      `Sua encomenda já está garantida! 🧶❤️\n\n` +
      mensagemPerguntaFinalizar(estado);
    }
    if (msg.includes("paguei") || msg.includes("comprovante") || msg.includes("mandei") || msg === "[comprovante]" || msg.includes("confirmei")) {
      estado.etapa = "perguntar_finalizar";
      return mensagemPerguntaFinalizar(estado);
    }
    return `Se quiser mudar a forma de pagamento, digite: mudar a forma de pagamento\n\nSe já fez o pagamento, me manda o comprovante aqui! 🧶❤️`;
  }

  if (estado.etapa === "perguntar_finalizar") {
    if (msg === "sim" || msg.includes("sim") || msg.includes("pode finalizar") || msg.includes("finalizar") || msg === "s") {
      estado.etapa = "avaliacao";
      return mensagemPerguntaAvaliacao(estado);
    }
    if (msg === "nao" || msg.includes("nao") || msg.includes("não") || msg.includes("ainda nao")) {
      estado.etapa = "depois_do_nao_finalizar";
      return `Sem problema! 🥰\n\nO que você quer fazer agora?\n\nDigita 1 pra fazer outro pedido\nDigita 2 pra falar com atendente\nDigita 3 pra encerrar por agora, volto depois`;
    }
    return `Digita SIM pra finalizar ou NÃO se ainda quiser falar mais alguma coisa, tá?`;
  }

  if (estado.etapa === "depois_do_nao_finalizar") {
    if (msg === "1" || msg.includes("outro pedido") || msg.includes("outro")) {
      estado.carrinho = [];
      estado.produtoJaNoCarrinho = false;
      estado.etapa = "escolhendo_produto";
      return `Perfeito! Vamos fazer outro pedido então! 😍\n\nQual item você quer agora? Digita o nome como está no catálogo!`;
    }
    if (msg === "2" || msg.includes("atendente")) {
      estado.emAtendimento = true;
      estado.etapaAntesAtendente = "depois_do_nao_finalizar";
      estado.etapa = "aguardando_atendente_mudanca";
      return `Sem problema! Vou te passar para nossa atendente, tá? Só um minutinho... 🥰\n\nA partir de agora é só você e ela, eu vou ficar quietinha aqui!\n\n⚠️ QUANDO TERMINAR, VOLTA AQUI E MANDA:\n👉 voltei`;
    }
    if (msg === "3" || msg.includes("encerrar") || msg.includes("volto depois") || msg.includes("depois")) {
      estado.etapa = "avaliacao";
      return `Sem problema! Volta quando quiser, tá? 🥰❤️\n\nAntes de ir, me conta rapidinho, o que você achou do meu atendimento?\n\nDá uma nota de 1 a 5, tá?\n\n1 - Ruim\n2 - Mais ou menos\n3 - Bom\n4 - Muito bom\n5 - Perfeito, amei!`;
    }
    return `Digita 1 pra outro pedido, 2 pra falar com atendente ou 3 pra encerrar por agora, tá?`;
  }

  if (estado.etapa === "avaliacao") {
    const nota = parseInt(msg.match(/\d+/)?.[0] || "0");
    if (nota >= 1 && nota <= 5) {
      estado.avaliacao = nota;

      // NOTA BAIXA - PEDE O MOTIVO E A MELHORIA
      if (nota < 3) {
        estado.etapa = "aguardando_melhoria";
        return `Poxa, sinto muito mesmo que sua experiência não tenha sido boa... 🥺💔\n\nVocê é muito importante pra gente e eu quero muito melhorar!\n\nPode me contar o que você não gostou do atendimento e o que eu posso melhorar?\n\nPode escrever do seu jeito, prometo que vou anotar tudo aqui! 🧶`;
      }

      // NOTA BOA - AGRADECE NORMAL
      estado.etapa = "concluido";
      let textoEstrelas = "⭐".repeat(nota);
      return `Muito obrigada pela sua nota ${nota}! ${textoEstrelas}\n\n` +
      `Você é muito importante pra gente! 🥰❤️\n\n` +
      `Obrigada por comprar da Eliazar Artesanatos! Volte sempre! 🧶✨\n\n` +
      `Quando quiser fazer outro pedido, é só mandar um oi aqui!`;
    }
    return `Digita só um número de 1 a 5, tá? 🥰\n\n1 - Ruim\n2 - Mais ou menos\n3 - Bom\n4 - Muito bom\n5 - Perfeito, amei!`;
  }

  // NOVA ETAPA - CLIENTE DEIXA O MOTIVO / MELHORIA
  if (estado.etapa === "aguardando_melhoria") {
    estado.melhoria = mensagemDaCliente;
    estado.etapa = "concluido";
    return `Muito obrigada por me contar, de verdade! ❤️\n\nJá anotei tudo aqui e vou passar pra minha equipe melhorar!\n\nObrigada por comprar da Eliazar Artesanatos e por me ajudar a melhorar! 🧶✨\n\nQuando quiser fazer outro pedido, é só mandar um oi aqui!`;
  }

  if (estado.etapa === "concluido") {
    if (msg.includes("oi") || msg.includes("ola") || msg.includes("olá") || msg.includes("bom dia") || msg.includes("boa tarde") || msg.includes("boa noite") || msg.includes("começar") || msg.includes("comecar") || msg === "sim") {
      estado.carrinho = [];
      estado.produtoJaNoCarrinho = false;
      estado.produto = null;
      estado.quantidade = 1;
      estado.querPano = false;
      estado.corda = null; estado.cor = null; estado.corda2 = null; estado.cor2 = null; estado.corPrincipal = null; estado.cordaPrincipal = null;
      estado.etapa = "escolhendo_produto";
      return `Oi de novo, ${estado.nomeCliente || ""}! 🥰\n\nQue bom que voltou! Vamos fazer outro pedido?\n\nQual item você quer agora? Digita o nome como está no catálogo!`;
    }
    const resultadoNovo = acharProduto(mensagemDaCliente);
    if (resultadoNovo.tipo === "unico") {
      estado.carrinho = [];
      estado.produtoJaNoCarrinho = false;
      estado.produto = resultadoNovo.produto;
      estado.quantidade = 1;
      estado.querPano = false;
      estado.corda = null; estado.cor = null; estado.corda2 = null; estado.cor2 = null; estado.corPrincipal = null; estado.cordaPrincipal = null;
      estado.etapa = "confirmar_produto";
      return mensagemProdutoEncontrado(resultadoNovo.produto);
    }
    if (resultadoNovo.tipo === "varios") {
      estado.listaTemp = resultadoNovo.lista;
      estado.etapa = "escolher_entre_varios";
      return mensagemVariosProdutos(resultadoNovo.lista);
    }
    return `Sua encomenda já está garantida! 🧶❤️\nSe quiser fazer outro pedido, é só mandar um oi aqui ou digitar o nome do item do catálogo!`;
  }

  return mensagemApresentacao();
}

module.exports = { processarMensagem, mensagemApresentacao, mensagemParaAtendente, montarResumoPedido, precoBaseTotal, PRODUTOS };