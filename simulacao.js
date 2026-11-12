// Simulador da Lia - pra testar dentro do VS Code sem WhatsApp
const lia = require('./lia.js');
const readline = require('readline');

// Estado IGUAL ao do index.js - com corda, não fio, e com carrinho
let estado = {
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
  carrinho: [],
  produtoJaNoCarrinho: false,
  jaMandouResumoFinal: false
};

console.log('=== SIMULADOR DA LIA ===');
console.log('Você é a cliente. Digite "sair" pra terminar.');
console.log('---------------------------');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function nomeArquivoCartela(corda) {
  if (corda === "corda-lisa") return "cores-lisa.jpeg";
  if (corda === "corda-especial") return "cores-especial.jpeg";
  if (corda === "corda-nautica") return "cores-nautica.jpeg";
  return "";
}

function perguntar() {
  rl.question('\nVocê (cliente): ', (texto) => {
    if (texto.toLowerCase() === 'sair') {
      console.log('Teste terminado!');
      rl.close();
      return;
    }

    const etapaAntes = estado.etapa;

    // Chama a Lia igual o whatsapp.js chama
    const resposta = lia.processarMensagem(texto, estado);

    console.log('\n--- LIA RESPONDEU ---');
    console.log(resposta);

    // ===== FOTO 1ª CORDA - igual ao index.js =====
    if (etapaAntes === "escolher_corda" && estado.etapa === "perguntando_cor") {
      console.log(`\n[📸 AQUI O WHATSAPP MANDARIA A FOTO: ${nomeArquivoCartela(estado.corda)}]`);
    }

    // ===== FOTO 2ª CORDA - ESSE QUE FALTAVA =====
    if (etapaAntes === "perguntar_corda_segunda_cor" && estado.etapa === "perguntando_segunda_cor") {
      if (estado.corda2 !== estado.corda) {
        console.log(`\n[📸 AQUI O WHATSAPP MANDARIA A FOTO: ${nomeArquivoCartela(estado.corda2)}]`);
      } else {
        console.log(`\n[📸 NÃO MANDA FOTO DE NOVO - MESMA CORDA: ${estado.corda2}]`);
      }
    }

    // ===== FOTO TROCAR COR 1 =====
    if (etapaAntes === "trocar_corda_cor1" && estado.etapa === "trocar_cor1") {
      console.log(`\n[📸 AQUI O WHATSAPP MANDARIA A FOTO: ${nomeArquivoCartela(estado.corda)}]`);
    }

    // ===== FOTO TROCAR COR 2 =====
    if (etapaAntes === "trocar_corda_cor2" && estado.etapa === "trocar_cor2") {
      console.log(`\n[📸 AQUI O WHATSAPP MANDARIA A FOTO: ${nomeArquivoCartela(estado.corda2)}]`);
    }

    // ===== FOTO DO PRODUTO =====
    if ((etapaAntes === "escolhendo_produto" || etapaAntes === "escolher_entre_varios") && estado.etapa === "confirmar_produto" && estado.produto) {
      console.log(`\n[📸 AQUI O WHATSAPP MANDARIA A FOTO DO PRODUTO: ${estado.produto.nome}]`);
    }

    // ===== AVISO CARTÃO - CORRIGIDO: AGORA COM RESUMO + 6 ARGUMENTOS =====
    if (estado.etapa === 'aguardando_atendente' && etapaAntes === 'escolher_parcelas') {
      console.log('\n[🔔 AVISO PRA VOCÊ, LIEDSON:]');
      const resumo = lia.montarResumoPedido(estado);
      console.log(lia.mensagemParaAtendente(
        'cliente-teste',
        estado.nomeCliente,
        resumo,
        estado.parcelas,
        estado.totalCartao,
        estado.valorParcela
      ));
    }

    // ===== AVISO PEDIDO FINALIZADO =====
    if (estado.etapa === 'avaliacao' && etapaAntes === 'perguntar_finalizar') {
      console.log('\n[🔔 AVISO PEDIDO FINALIZADO PRA VOCÊ:]');
      console.log(`Cliente: ${estado.nomeCliente} | Forma: ${estado.formaPagamento}`);
      console.log(lia.montarResumoPedido(estado));
    }

    console.log(`\n[Etapa atual: ${estado.etapa} | Corda: ${estado.corda} | Cor: ${estado.cor} | Corda2: ${estado.corda2} | Cor2: ${estado.cor2}]`);

    perguntar();
  });
}

// Começa a conversa
console.log('\n--- LIA RESPONDEU ---');
console.log(lia.processarMensagem('oi', estado));
perguntar();