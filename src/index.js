const puppeteer = require('puppeteer');
const fs = require('fs');
const xlsx = require('xlsx');
const os = require('os');

const URL_DESAFIO = "https://www.rpachallenge.com";
const TOTAL_TENTATIVAS = 50;

// Função para obter a memória em uso em MB
function obterMemoriaEmUso() {
    const memoriaTotal = os.totalmem();
    const memoriaLivre = os.freemem();
    const memoriaEmUso = memoriaTotal - memoriaLivre;
    return Math.round(memoriaEmUso / (1024 * 1024)); // Converter para MB
}

const workbook = xlsx.readFile("challenge.xlsx");
const sheetName = workbook.SheetNames[0];
const dados = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

(async () => {
    async function obterElementoPorXPath(xpath, pagina) {
        const elemento = await pagina.waitForSelector("xpath/" + xpath, { timeout: 60000 });
        return elemento;
    }

    async function clicarBotao(xpath, pagina) {
        try {
            const botao = await obterElementoPorXPath(xpath, pagina);
            if (botao) await botao.click();
        } catch (error) {
            console.log("Erro ao clicar no botão:", error);
        }
    }

    async function preencherFormulario(pagina) {
        const campos = [];
        for (const linha of dados) {
            for (const chave in linha) {
                const xpath = `.//label[contains(text(), '${chave.trim()}')]/following-sibling::input`;
                const campo = await obterElementoPorXPath(xpath, pagina);
                if (campo) {
                    campos.push(campo);
                    await campo.type(linha[chave].toString().trim());
                }
            }
            await clicarBotao(".//input[@type='submit']", pagina);
        }
        return campos;
    }

    async function obterTempoExecucao() {
        const dadosTempos = [];

        for (let tentativa = 1; tentativa <= TOTAL_TENTATIVAS; tentativa++) {
            const inicio = Date.now();
            const tempoInicioNavegador = Date.now();

            const navegador = await puppeteer.launch({
                headless: false,
                args: ["--no-sandbox", "--disable-setuid-sandbox", "--start-maximized"]
            });
        
            const pagina = await navegador.newPage();
            await pagina.goto(URL_DESAFIO);
            
            const tempoFimNavegador = Date.now();
            const tempoAbrirNavegador = ((tempoFimNavegador - tempoInicioNavegador) / 1000).toFixed(2);
            
            const memoriaInicial = obterMemoriaEmUso();

            await clicarBotao(".//button[contains(text(), 'Start')]", pagina);

            await preencherFormulario(pagina);

            const fim = Date.now();
            const tempoSegundos = ((fim - inicio) / 1000).toFixed(2);
            
            const tempoInicioFechar = Date.now();
            await navegador.close();
            const tempoFimFechar = Date.now();
            const tempoFecharNavegador = ((tempoFimFechar - tempoInicioFechar) / 1000).toFixed(2);
            
            dadosTempos.push({ 
                "Tentativa": tentativa, 
                "Tempo (s)": parseFloat(tempoSegundos), 
                "Memoria Inicial (MB)": memoriaInicial,
                "Tempo Abrir Navegador (s)": parseFloat(tempoAbrirNavegador),
                "Tempo Fechar Navegador (s)": parseFloat(tempoFecharNavegador)
            });

            console.log(`Tentativa ${tentativa}: ${tempoSegundos}s, Memória: ${memoriaInicial}MB, Abrir: ${tempoAbrirNavegador}s, Fechar: ${tempoFecharNavegador}s`);
        }

        return dadosTempos;
    }

    const dadosTempos = await obterTempoExecucao();

    // Criar um novo livro Excel para os resultados
    const resultadoWorkbook = xlsx.utils.book_new();
    const resultadoWorksheet = xlsx.utils.json_to_sheet(dadosTempos);
    
    // Adicionar a planilha ao livro
    xlsx.utils.book_append_sheet(resultadoWorkbook, resultadoWorksheet, "Resultados");
    
    // Gravar o arquivo Excel
    xlsx.writeFile(resultadoWorkbook, "resultado.xlsx");
    console.log("Resultados salvos em resultado.xlsx");

    await navegador.close();
})();