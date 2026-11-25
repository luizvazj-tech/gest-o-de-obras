// Extrai o motor (SeroEngine) e os dados embutidos em index.html, sem alterar o arquivo.
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const engSrc=scripts.find(s=>s.includes('root.SeroEngine'));
const dataSrc=scripts.find(s=>s.includes('var DATA_SERIE'));
const vm=require('vm');
const ctx={window:undefined,module:undefined};ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(engSrc.replace(/\}\)\(typeof window[^\n]*$/m,'})(this);'),ctx);
vm.runInContext(dataSrc+';this.__d={DATA_VAU,DATA_CONC,DATA_ANOM,EXEMPLOS_SRC,DATA_SERIE};',ctx);
const d=ctx.__d;
module.exports={E:ctx.SeroEngine,tables:{vau:d.DATA_VAU,conc:d.DATA_CONC,custom:{},anom:d.DATA_ANOM},EXEMPLOS:d.EXEMPLOS_SRC,SERIE:d.DATA_SERIE};
