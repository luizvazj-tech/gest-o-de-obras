// Regressão do motor SERO contra os 7 exemplos reais embutidos em index.html.
// Uso: node tests/sero.test.js   (sem dependências)
const {E,tables,EXEMPLOS,SERIE}=require('./extract.js');
let fail=0,ok=0;
const eq=(nome,got,exp,tol=0.005)=>{const p=Math.abs(got-exp)<=tol;p?ok++:fail++;console.log((p?'  ok  ':' FALHA')+' '+nome+' = '+got+(p?'':' (esperado '+exp+')'));};
const R=EXEMPLOS.map(x=>E.calcular(x.sim,tables));
// Valores esperados: Memórias de Cálculo reais do Sero (Ex1-6) e Manual do Sero, p. 233 (Ex7)
eq('Ex1 RMT',R[0].rmtTotal,193719.58);eq('Ex1 crédito concreto',R[0].concreto.total,2636.74);eq('Ex1 RMT após crédito',R[0].rmtAposConc,191082.84);eq('Ex1 débito',R[0].deb.total,70318.50);
eq('Ex2 RMT',R[1].rmtTotal,561148.05);eq('Ex2 crédito concreto',R[1].concreto.total,12317.20);eq('Ex2 RMT final',R[1].rmtFinal,159375.91);eq('Ex2 DCTFWeb zerada',R[1].deb.zerada?1:0,1);
eq('Ex3 RMT',R[2].rmtTotal,99452.71);eq('Ex3 crédito concreto',R[2].concreto.total,1697.33);eq('Ex3 débito',R[2].deb.total,30304.17);
eq('Ex4 RMT',R[3].rmtTotal,246013.68);eq('Ex4 crédito concreto',R[3].concreto.total,7489.75);eq('Ex4 débito',R[3].deb.total,87776.81);
eq('Ex5 RMT',R[4].rmtTotal,8887.39);eq('Ex5 crédito concreto',R[4].concreto.total,556.57);eq('Ex5 crédito CI abate PAT',R[4].deb.credCR.PAT,1666.16);eq('Ex5 débito',R[4].deb.total,1399.57);eq('Ex5 fator de ajuste não aplicado',R[4].fa.aplicado?1:0,0);
eq('Ex6 RMT total',R[5].rmtTotal,100894.26);eq('Ex6 RMT decadente',R[5].rmtDec,15416.64);eq('Ex6 RMT não decadente',R[5].rmtNao,85477.62);eq('Ex6 débito',R[5].deb.total,31455.77);
eq('Ex7 RMT não predial (Manual, item 34.2)',R[6].rmtTotal,172365.72);
R.forEach((r,i)=>{eq('Ex'+(i+1)+' sem erros de validação',r.erros.length,0)});
// Integridade da série VAU: 27 UFs x 7 destinações em todas as competências
let bad=0;Object.keys(SERIE).forEach(m=>{const ufs=Object.keys(SERIE[m]);if(ufs.length!==27)bad++;ufs.forEach(u=>{if(SERIE[m][u].length!==7||SERIE[m][u].some(v=>!(v>0)))bad++;});});
eq('Série VAU íntegra (27 UFs x 7 destinações, valores > 0)',bad,0);
const ms=Object.keys(SERIE).sort();eq('Série VAU primeira competência 2021-06',ms[0]==='2021-06'?1:0,1);eq('Série VAU última competência 2026-11',ms[ms.length-1]==='2026-11'?1:0,1);
console.log('\n'+ok+' ok, '+fail+' falha(s)');process.exit(fail?1:0);
