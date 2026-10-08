# SCHREIBERLOG

Portal digital da SchreiberLog para cotação de frete, rastreamento e atendimento.

## Estrutura

- `index.html` — interface pública.
- `script.js` — comportamento da interface e montagem da cotação.
- `calculator.js` — motor atual de cálculo local, preservado como fallback.
- `city-data.js` — matriz compactada de cidades, CEPs e prazos.
- `tde-data.js` + `tde-*.txt` — consulta da tabela TDE.
- `api/cnpj.js` — consulta de CNPJ pelo backend.
- `api/quote.js` — gateway seguro para a futura API oficial da Schreiber.
- `api/health.js` — verificação simples do backend.
- `CIDADES E PRAZOS/` e planilhas — fontes de dados comerciais.

## Arquitetura da cotação

Enquanto a API oficial não estiver configurada, a cotação continua sendo calculada no navegador pelo motor existente.

Quando `SCHREIBER_API_URL` for configurada na Vercel, o endpoint `/api/quote` passa a funcionar como gateway:

**Navegador → /api/quote → API Schreiber**

Tokens e chaves ficam somente nas variáveis de ambiente da Vercel e nunca são enviados ao navegador.

## Variáveis de ambiente

Configure na Vercel:

- `SCHREIBER_API_URL`
- `SCHREIBER_API_TOKEN` (se a API usar Bearer)
- `SCHREIBER_API_KEY` (se a API usar X-API-Key)
- `SCHREIBER_API_TIMEOUT_MS`

A documentação da API oficial será necessária para adaptar o payload/resposta ao padrão exato da Schreiber. Não inventamos endpoints ou campos da transportadora.

## Importante

As regras comerciais atuais do `calculator.js` não foram removidas. A integração externa é uma camada separada para evitar quebrar a cotação atual antes de termos as credenciais e a documentação oficial.
