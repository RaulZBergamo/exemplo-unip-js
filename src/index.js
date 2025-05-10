const puppeteer = require('puppeteer');
const fs = require('fs');
const xlsx = require('xlsx');

const URL_DESAFIO = "https://www.rpachallenge.com";
const TOTAL_TENTATIVAS = 25;

const workbook = xlsx.readFile("challenge.xlsx");
const sheetName = workbook.SheetNames[0];
const dados = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

(async () => {
    const navegador = await puppeteer.launch({
        headless: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--start-maximized"]
    });

    const pagina = await navegador.newPage();
    await pagina.goto(URL_DESAFIO);

    async function obterElementoPorXPath(xpath) {
        const elemento = await pagina.waitForSelector("xpath/" + xpath);
        return elemento;
    }

    async function clicarBotao(xpath) {
        try {
            const botao = await obterElementoPorXPath(xpath);
            if (botao) await botao.click();
        } catch (error) {
            console.log("Erro ao clicar no botao:", error);
        }
    }

    async function preencherFormulario() {
        const campos = [];
        for (const linha of dados) {
            for (const chave in linha) {
                const xpath = `.//label[contains(text(), '${chave.trim()}')]/following-sibling::input`;
                const campo = await obterElementoPorXPath(xpath);
                if (campo) {
                    campos.push(campo);
                    await campo.type(linha[chave].toString().trim());
                }
            }
            await clicarBotao(".//input[@type='submit']");
        }
        return campos;
    }

    async function obterTempoExecucao() {
        const dadosTempos = [];

        for (let tentativa = 1; tentativa <= TOTAL_TENTATIVAS; tentativa++) {
            const inicio = Date.now();

            await clicarBotao(".//button[contains(text(), 'Start')]");
            await preencherFormulario();
            const fim = Date.now();

            dadosTempos.push({ Tentativa: tentativa, "Tempo (ms)": fim - inicio });

            await clicarBotao(".//button[contains(text(), 'Reset')]");
        }

        return dadosTempos;
    }

    const dadosTempos = await obterTempoExecucao();
    fs.writeFileSync("resultado.json", JSON.stringify(dadosTempos, null, 2));
    await navegador.close();
})();
