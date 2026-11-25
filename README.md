# Gestão de Obras (padrão Caixa) com simulador SERO

Página única, publicada como site estático (comando de build: `echo ok`; diretório de publicação: `./`).

- Montagem: `python3 src/build.py`
- Teste do motor SERO: `node tests/sero.test.js`
- Atualização do VAU ou do motor: substituir `src/sero.html` e montar novamente.
- Os dados ficam somente no navegador de quem usa (IndexedDB). Fazer backup em "Importar e backup".
- Não incluir neste repositório planilhas, backups ou dados de clientes.
