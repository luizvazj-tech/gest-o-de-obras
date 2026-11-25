/* ===== núcleo: utilidades, armazenamento e cálculos (sem DOM) ===== */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{if(typeof v==='number')return isFinite(v)?v:0;let s=String(v??'').trim().replace(/[R$\s%]/g,'');if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');const n=parseFloat(s);return isFinite(n)?n:0};
const money=v=>v==null?'—':v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const moneyK=v=>v==null?'—':Math.abs(v)>=1e6?'R$ '+(v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:2})+' mi':Math.abs(v)>=1e3?'R$ '+(v/1e3).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mil':money(v);
const pct=(v,d=2)=>v==null?'—':v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})+'%';
const qt=v=>v==null?'—':v.toLocaleString('pt-BR',{maximumFractionDigits:2});
const iso=d=>{const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)};
const today=()=>iso(new Date());
const pd=s=>new Date(s+'T12:00:00');
const br=s=>!s?'—':/^\d{4}-\d{2}$/.test(s)?s.slice(5)+'/'+s.slice(0,4):s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);
const days=(a,b)=>Math.round((pd(b)-pd(a))/864e5);
const addDays=(s,n)=>{const d=pd(s);d.setDate(d.getDate()+n);return iso(d)};
const weekOf=s=>{const d=pd(s);const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const w=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-w);const y=t.getUTCFullYear();return y+'-S'+String(Math.ceil(((t-Date.UTC(y,0,1))/864e5+1)/7)).padStart(2,'0')};
const weekRange=w=>{const [y,n]=w.split('-S').map(Number);const j=new Date(y,0,4,12);const m=new Date(j);m.setDate(j.getDate()-((j.getDay()||7)-1)+(n-1)*7);const a=iso(m);return [a,addDays(a,6)]};
const monthEnd=m=>{const [y,n]=m.split('-').map(Number);return iso(new Date(y,n,0,12))};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);

/* armazenamento: banco do artefato; fora dele, navegador (ou memória) */
const Store={db:null,idb:null,mem:{},queue:Promise.resolve(),readonly:false,mode:'memória',
 async init(){try{if(window.claude&&claude.use){this.db=await claude.use('db')}}catch(e){this.db=null}
  if(this.db){this.mode='nuvem';try{const u=await claude.use('user');if(u&&(await u.can('data.write'))===false)this.readonly=true}catch(e){}}
  else{try{this.idb=await new Promise((ok,no)=>{const r=indexedDB.open('sistema-gestao-obras',1);r.onupgradeneeded=()=>r.result.createObjectStore('docs');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
    await new Promise((ok,no)=>{const c=this.idb.transaction('docs').objectStore('docs').openCursor();c.onsuccess=()=>{const x=c.result;if(!x)return ok();this.mem[x.key]=x.value;x.continue()};c.onerror=()=>no(c.error)});
    this.mode='navegador';try{navigator.storage?.persist?.()}catch(e){}}catch(e){this.idb=null;this.mode='memória'}}},
 async retry(fn){for(let t=0;;t++){try{return await fn()}catch(e){if(t>=4||!['resource_exhausted','unavailable'].includes(e&&e.code))throw e;await new Promise(r=>setTimeout(r,600*2**t+Math.random()*300))}}},
 persist(p){if(this.db||!this.idb)return;return new Promise((ok,no)=>{const t=this.idb.transaction('docs','readwrite'),s=t.objectStore('docs');p in this.mem?s.put(this.mem[p],p):s.delete(p);t.oncomplete=()=>ok();t.onabort=()=>no(new Error('o navegador não gravou os dados (espaço insuficiente ou bloqueio). Baixe um backup.'))})},
 async get(p){if(this.db){const s=await this.retry(()=>this.db.doc(p).get());return s.exists?JSON.parse(JSON.stringify(s.data())):null}return this.mem[p]?JSON.parse(JSON.stringify(this.mem[p])):null},
 async list(c){if(this.db){const out=[];const q=await this.retry(()=>this.db.collection(c).limit(1000).get());q.docs.forEach(d=>out.push({id:d.id,...JSON.parse(JSON.stringify(d.data()))}));return out}
  const n=c.split('/').length+1;return Object.keys(this.mem).filter(k=>k.startsWith(c+'/')&&k.split('/').length===n).sort().map(k=>({id:k.split('/').pop(),...JSON.parse(JSON.stringify(this.mem[k]))}))},
 write(fn){const r=this.queue.then(fn);this.queue=r.catch(()=>{});return r},
 set(p,d){const c=JSON.parse(JSON.stringify(d));delete c.id;return this.write(async()=>{if(this.db)await this.retry(()=>this.db.doc(p).set(c));else{this.mem[p]=c;await this.persist(p)}})},
 del(p){return this.write(async()=>{if(this.db)await this.db.doc(p).delete();else{delete this.mem[p];await this.persist(p)}})}
};

/* estado em memória */
const S={obras:[],ref:today(),sel:null};
const SUBS=['semanas','diario','medicoes','pedidos','cotacoes','lanc'];
const blank=()=>({nome:'',municipio:'',construtora:'',rt:'',produto:'Apoio à Produção',bdi:0,valorTotal:0,financiamento:0,retencao:5,inicio:'',fim:'',unidades:0,vendidas:0,concluida:false,habitese:false,tolAmarelo:0.95,tolVermelho:0.85,
 baseline:{},custoMensal:{},grupos:[],insumos:[],vencimentos:[],pendencias:[],tarifas:[],auditoria:[],
 contrat:{contratada:false,linhaBase:'',previsto:'',data:'',obs:''},pnvDefasagem:null,realizadoTexto:'',proximosTexto:'',cronoGrupos:{},reg:{},trimestrais:[]});
async function loadObra(id,meta){const o={...blank(),...meta,id};const it=await Store.get(`obras/${id}/dados/itens`);o.itens=it?it.itens:[];
 for(const c of SUBS)o[c]=await Store.list(`obras/${id}/${c}`);return o}
async function loadAll(){const metas=await Store.list('obras');const out=[];for(let i=0;i<metas.length;i+=4)out.push(...await Promise.all(metas.slice(i,i+4).map(m=>loadObra(m.id,m))));
 S.obras=out.sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));if(!S.obras.find(o=>o.id===S.sel))S.sel=S.obras[0]?.id||null}
function metaOf(o){const m={...o};delete m.id;delete m.itens;SUBS.forEach(c=>delete m[c]);return m}
const saveMeta=o=>Store.set(`obras/${o.id}`,metaOf(o));
const saveItens=o=>Store.set(`obras/${o.id}/dados/itens`,{itens:o.itens});
async function saveSub(o,c,id,d){await Store.set(`obras/${o.id}/${c}/${id}`,d);const i=o[c].findIndex(x=>x.id===id);const r={...d,id};i<0?o[c].push(r):o[c][i]=r;o[c].sort((a,b)=>a.id<b.id?-1:1)}
async function delSub(o,c,id){await Store.del(`obras/${o.id}/${c}/${id}`);o[c]=o[c].filter(x=>x.id!==id)}

/* item: {c:código,d:descrição,g:nº do grupo,v:custo direto,r:custo realizado importado,p:% físico inicial,dp:data do % inicial} */
const direto=o=>o.itens.reduce((s,i)=>s+i.v,0);
const total=o=>o.valorTotal>0?o.valorTotal:direto(o)*(1+(o.bdi||0)/100);
/* % físico por item até a data: última apuração semanal <= data */
function fisItens(o,ref){const m={};let any=false;o.itens.forEach(i=>{if(i.p!=null&&(!i.dp||i.dp<=ref)){m[i.c]=i.p;any=true}});
 o.semanas.filter(s=>s.fim<=ref||s.inicio<=ref).forEach(s=>{for(const[k,v]of Object.entries(s.fis||{})){m[k]=v;any=true}});return{m,any}}
function fisico(o,ref,g){const{m,any}=fisItens(o,ref);let a=0,b=0;o.itens.forEach(i=>{if(g!=null&&i.g!==g)return;b+=i.v;a+=i.v*(m[i.c]||0)/100});return any&&b?a/b*100:null}
/* previsto: interpolação linear entre marcos mensais (fim de mês) da linha de base */
function previsto(o,ref){const k=Object.keys(o.baseline||{}).sort();if(!k.length)return null;
 const pts=k.map(m=>[monthEnd(m),o.baseline[m]]);const first=addDays(k[0]+'-01',-1);pts.unshift([first,0]);
 if(ref<=pts[0][0])return 0;for(let i=1;i<pts.length;i++){if(ref<=pts[i][0]){const[a,x]=pts[i-1],[b,y]=pts[i];return x+(y-x)*days(a,ref)/Math.max(1,days(a,b))}}return pts.at(-1)[1]}
function pedidoValor(p){return (p.qtd||0)*(p.unit||0)}
function custoReal(o,ref){const imp=Object.entries(o.custoMensal||{}).filter(([m])=>m<=ref.slice(0,7)).reduce((s,[,v])=>s+v,0);
 return imp+o.pedidos.filter(p=>p.status==='Recebido'&&p.recebido&&p.recebido<=ref).reduce((s,p)=>s+pedidoValor(p),0)}
const comprometido=(o,ref)=>o.pedidos.filter(p=>['Pedido emitido'].includes(p.status)&&(!p.data||p.data<=ref)).reduce((s,p)=>s+pedidoValor(p),0);
function monthsDiff(a,b){return (pd(b)-pd(a))/864e5/30.4375}
function farolContrat(o,ref){const c=o.contrat||{};if(!c.linhaBase)return null;const alvo=c.contratada&&c.data?c.data:(c.previsto&&c.previsto>ref?c.previsto:ref);const m=monthsDiff(c.linhaBase,alvo);return{cor:m<=0?'v':m<=3?'a':'r',meses:m}}
function farolObra(o,ref){const f=fisico(o,ref),p=previsto(o,ref);if(f==null||p==null||p<=0)return null;const i=f/p;return{cor:i>=o.tolAmarelo?'v':i>=o.tolVermelho?'a':'r',idp:i}}
function farolPNV(o){const m=o.pnvDefasagem;if(m==null||m==='')return null;return{cor:m<=0?'v':m<4?'a':'r'}}
function farolGeral(o,ref){const f=o.contrat?.contratada?[farolObra(o,ref),farolPNV(o)]:[farolContrat(o,ref)];const c=f.filter(Boolean).map(x=>x.cor);return c.includes('r')?'r':c.includes('a')?'a':c.length?'v':null}
/* consumíveis */
function movInsumo(o,ins,a,b){let ent=0,sai=0;o.semanas.forEach(s=>{if(s.inicio>=a&&s.inicio<=b){const x=(s.consumo||{})[ins.id];if(x){ent+=x.ent||0;sai+=x.sai||0}}});
 o.pedidos.forEach(p=>{if(p.insumo===ins.id&&p.status==='Recebido'&&p.recebido>=a&&p.recebido<=b)ent+=p.qtd||0});return{ent,sai}}
function estoque(o,ins,ref){const t=movInsumo(o,ins,'0000-00-00',ref);const saldo=(ins.estIni||0)+t.ent-t.sai;
 const ult=o.semanas.filter(s=>s.inicio<=ref&&s.inicio>addDays(ref,-28));const media=ult.length?ult.reduce((x,s)=>x+((s.consumo||{})[ins.id]?.sai||0),0)/ult.length:0;
 const cobertura=media>0?saldo/media:null;const consPct=ins.prevTotal>0?t.sai/ins.prevTotal*100:null;
 const situ=saldo<0?'Saldo negativo':saldo<(ins.min||0)?'Abaixo do mínimo':cobertura!=null&&cobertura<2?'Cobertura < 2 semanas':'Regular';
 return{...t,saldo,media,cobertura,consPct,situ}}
/* medição */
function medicao(o,mes){const fim=monthEnd(mes),ant=addDays(mes+'-01',-1);const a=fisico(o,fim)??0,p=fisico(o,ant)??0,pv=previsto(o,fim);
 const teto=o.concluida&&o.habitese?100:100-(o.retencao||0);
 const base=Math.min(a,pv==null?a:pv,teto);const liberavel=(o.financiamento||0)*base/100;
 const lib=o.medicoes.filter(x=>x.id<mes).reduce((s,x)=>s+(x.liberado||0),0);
 return{mes,fim,acum:a,ant:p,delta:a-p,prev:pv,valorMes:total(o)*(a-p)/100,valorAcum:total(o)*a/100,base,teto,liberavel,jaLiberado:lib,aLiberar:Math.max(0,liberavel-lib)}}
function alertas(o,ref){const al=[];const add=(n,t)=>al.push({n,t,obra:o.nome,id:o.id});
 o.vencimentos.forEach(v=>{if(!v.vence)return;const d=days(ref,v.vence);if(d<0)add('r',`${v.tipo}: vencida em ${br(v.vence)}`);else if(d<=60)add('a',`${v.tipo}: vence em ${d} dias (${br(v.vence)})`)});
 o.pendencias.filter(p=>p.status!=='Concluída'&&p.prazo&&p.prazo<ref).forEach(p=>add('r',`Pendência atrasada: ${p.desc} (prazo ${br(p.prazo)})`));
 o.insumos.forEach(i=>{const e=estoque(o,i,ref);if(e.situ!=='Regular')add(e.situ==='Cobertura < 2 semanas'?'a':'r',`${i.nome}: ${e.situ.toLowerCase()} (saldo ${qt(e.saldo)} ${i.un})`)});
 const over=o.itens.filter(i=>(i.r||0)>i.v+0.01);if(over.length)add('r',`${over.length} serviço(s) com custo realizado acima do orçado (excesso ${money(over.reduce((s,i)=>s+i.r-i.v,0))})`);
 const f=farolObra(o,ref);if(f&&f.cor!=='v')add(f.cor,`Atraso físico: IDP ${f.idp.toFixed(2).replace('.',',')}`);
 const fc=!o.contrat.contratada&&farolContrat(o,ref);if(fc&&fc.cor!=='v')add(fc.cor,`Contratação atrasada ${fc.meses.toFixed(1).replace('.',',')} meses ante a linha de base`);
 if(o.contrat.contratada&&!o.concluida&&!o.semanas.some(s=>s.inicio>=addDays(ref,-13)&&s.inicio<=ref))add('a','Sem apontamento semanal nos últimos 14 dias');
 if(!Object.keys(o.baseline).length)add('a','Sem cronograma de linha de base: previsto e IDP não calculados');
 alertasExtra(o,ref,add);return al}

/* ===== importação da PLS ===== */
function parsePLS(wb,X){let best=null;
 for(const name of wb.SheetNames){const ws=wb.Sheets[name];if(!ws['!ref'])continue;const rg=X.utils.decode_range(ws['!ref']);
  const cell=(r,c)=>ws[X.utils.encode_cell({r,c})],val=(r,c)=>cell(r,c)?.v;
  let head=-1;for(let r=0;r<Math.min(60,rg.e.r);r++){if(/n[ºo°]\s*do item/i.test(String(val(r,1)??''))){head=r;break}}if(head<0)continue;
  let mrow=-1,months=[];for(let r=head;r<head+6;r++){const m=[];for(let c=6;c<=rg.e.c;c++){const v=val(r,c);let d=null;if(v instanceof Date)d=v;else if(typeof v==='number'&&v>36000&&v<60000)d=new Date(Math.round((v-25569)*864e5));if(d)m.push([c,new Date(d.getTime()+432e5).toISOString().slice(0,7)])}if(m.length>=3){mrow=r;months=m;break}}
  const itens=[],grupos=[],custo={},audit=[];let g=0,end=rg.e.r,totalBDI=0;
  for(let r=head+1;r<=rg.e.r;r++){const b=val(r,1),c=val(r,2),d=val(r,3),e=val(r,4);
   if(typeof b==='string'&&/valor total de constru/i.test(b)){totalBDI=num(e);continue}
   if(typeof b==='string'&&/custo direto de constru/i.test(b)){end=r;continue}
   if(r>=end)continue;
   if(b!=null&&/^\d{1,2}$/.test(String(b).trim())&&d){g=+b;grupos.push({n:g,nome:String(d).trim()});continue}
   if(c!=null&&String(c).trim()&&typeof e==='number'){let r_=0;for(const[col,m]of months){const v=val(r,col);if(typeof v==='number'&&v){r_+=v;custo[m]=(custo[m]||0)+v}}
    let code=String(c).trim(),k=2;const base=code;while(itens.some(i=>i.c===code))code=base+'#'+(k++);
    if(code!==base)audit.push(`Linha ${r+1}: código ${base} repetido.`);
    itens.push({c:code,d:String(d??'').trim(),g,v:Math.round(e*100)/100,r:Math.round(r_*100)/100});
    const fx=cell(r,5)?.f;if(fx){const mm=fx.match(/-\s*([A-Z]+)\d+/);if(mm){const col=X.utils.decode_col(mm[1]);const tf=cell(r,col)?.f;if(!tf)audit.push(`Linha ${r+1} (${code}): coluna de acumulado sem fórmula; valores mensais deste serviço não seriam totalizados na planilha.`);
       else{const rm=tf.match(/:([A-Z]+)\d+/);if(rm){const lim=X.utils.decode_col(rm[1]);const fora=months.filter(([mc])=>mc>lim&&mc!==col).length;if(fora&&!audit.some(a=>a.startsWith('A fórmula de acumulado')))audit.push(`A fórmula de acumulado soma somente até a coluna ${rm[1]}; ${fora} coluna(s) mensal(is) posterior(es) ficam fora do total.`)}}}}}
  }
  if(!best||itens.length>best.itens.length){
   const label=re=>{for(let r=0;r<head;r++)for(let c=0;c<12;c++){const v=val(r,c);if(typeof v==='string'&&re.test(v))return String(val(r+1,c)??'').trim()}return''};
   let errs=[];for(const k in ws){if(k[0]!=='!'&&ws[k].t==='e')errs.push(k)}
   if(errs.length)audit.push(`${errs.length} célula(s) com erro na aba "${name}": ${errs.slice(0,8).join(', ')}.`);
   const outras=wb.SheetNames.filter(n=>n!==name&&Object.values(wb.Sheets[n]).some(x=>x&&x.t==='e'));if(outras.length)audit.push(`Abas com células em erro (#REF!): ${outras.join(', ')}.`);
   const dir=itens.reduce((s,i)=>s+i.v,0),real=itens.reduce((s,i)=>s+i.r,0);
   itens.filter(i=>i.r>i.v+0.01).forEach(i=>audit.push(`Serviço ${i.c} (${i.d}): realizado ${money(i.r)} supera o orçado ${money(i.v)} em ${money(i.r-i.v)}.`));
   if(totalBDI&&dir&&totalBDI>dir*1.001&&real){for(let r=end;r<=Math.min(rg.e.r,end+6);r++){const f=cell(r,6)?.f;if(f&&/\/\$?F\$?\d+/.test(f)){audit.push(`A linha de percentual mensal divide custo sem BDI pelo valor total com BDI: ${pct(real/totalBDI*100)} em vez de ${pct(real/dir*100)} sobre o custo direto.`);break}}}
   if(/realizado/i.test(String(val(head,5)??''))&&Object.keys(ws).some(k=>/^F\d+$/.test(k)&&/^E\d+-[A-Z]+\d+$/.test(ws[k].f||'')))audit.push('A coluna F está intitulada "Custo Total Realizado", mas a fórmula calcula o saldo a realizar (orçado menos acumulado).');
   const ult=Object.keys(custo).sort().at(-1);if(ult){const vazios=months.filter(([,m])=>m>ult).map(x=>x[1]);if(vazios.length)audit.push(`Não há custo lançado de ${br(vazios[0])} a ${br(vazios.at(-1))}, embora as colunas existam. Confirmar se a planilha está atualizada.`)}
   const f2=itens.filter(i=>/^funda.*estaqueamento/i.test(i.d));if(f2.length>1)audit.push(`Descrição repetida "${f2[0].d}" nos itens ${f2.map(i=>i.c).join(' e ')}; conferir se um deles corresponde a blocos e baldrames.`);
   for(const gg of grupos)if(!itens.some(i=>i.g===gg.n))audit.push(`Grupo ${gg.n} sem serviços orçados.`);
   best={nome:label(/^\s*empreendimento/i),municipio:label(/^\s*munic/i),construtora:label(/^\s*construtora/i),rt:label(/^\s*respons/i),itens,grupos,custoMensal:custo,valorTotal:Math.round(totalBDI*100)/100,bdi:totalBDI&&dir?Math.round((totalBDI/dir-1)*1e4)/100:0,auditoria:audit,aba:name,direto:dir,realizado:real}}
 }
 if(!best||!best.itens.length)throw new Error('Não localizei a estrutura da PLS (coluna "Nº do Item", código na coluna C e custo na coluna E).');return best}
