# Gera o módulo SERO a partir do simulador original, sem alterar motor nem dados.
import re
def gerar(src):
    s=open(src,encoding='utf-8').read()
    css=re.search(r'<style>(.*?)</style>',s,re.S).group(1)
    engine,data,ui=re.findall(r'<script>(.*?)</script>',s,re.S)
    body=re.sub(r'<script>.*?</script>','',s[s.index('<body>')+6:s.rindex('</body>')],flags=re.S)
    def sub(t,old,new,n=1):
        c=t.count(old)
        assert (c==n if n else c>0),(old,c)
        return t.replace(old,new)
    scss=sub(css,':root{',':host{display:block;color-scheme:light;')
    scss=sub(scss,'\nbody{','\n.sbody{')
    ui=sub(ui,'document.getElementById(','D.getElementById(',0)
    ui=sub(ui,'document.querySelectorAll(','D.querySelectorAll(',0)
    ui=sub(ui,'document.addEventListener(','D.addEventListener(',3)
    ui=sub(ui,'document.title=','HOST.titulo=')
    ui,n=re.subn(r"function lsGet\(k\)\{[^\n]*\nfunction lsSet\(k,v\)\{[^\n]*\n","function lsGet(k){ storeOK=HOST.ok(); return HOST.get(k); }\nfunction lsSet(k,v){ HOST.set(k,v); }\n",ui); assert n==1
    ui,n=re.subn(r"function download\(name,txt,type\)\{[^\n]*\n","function download(name,txt,type){ HOST.baixar(name,txt); }\n",ui); assert n==1
    ui,n=re.subn(r"function printPane\(id\)\{[^\n]*\n","function printPane(id){ HOST.imprimir(id,D.getElementById(id)); }\n",ui); assert n==1
    api=("HOST.api={nova:function(pre){ S=newSim('predial'); S.obraId=pre.obraId; S.nome=pre.nome; S.cno=pre.cno||''; Object.assign(S.resp,pre.resp||{}); Object.assign(S.end,pre.end||{}); Object.assign(S.datas,pre.datas||{}); if(pre.principal) Object.assign(S.principais[0],pre.principal); goTab('sim'); },"
         "abrir:function(id){ openSim(id); }, recarrega:function(){ try{ tables.custom=JSON.parse(lsGet(VAUC_KEY)||'{}')||{}; }catch(e){ tables.custom={}; } applyBrand(); goTab(curTab); }, calcular:function(s){ return E.calcular(s,tables); }};\n")
    ui=ui.replace('#0b3d91','#181818')
    ui,n=re.subn(r"(BR_DEF\s*=\s*\{[^}]*?\bnome\s*:\s*)(''|\"\")",r"\1'Mallora'",ui); assert n==1,'marca SERO'
    i=ui.rindex('})();'); ui=ui[:i]+api+ui[i:]
    ui=sub(ui,'Fica gravado neste navegador.','',0) if 'Fica gravado neste navegador.' in ui else ui
    body=sub(body,'Fica gravado neste navegador. Para distribuir o arquivo já personalizado, abra, personalize e salve a página (Ctrl+S) ou me peça a versão final.','Fica gravado nos dados deste sistema de gestão.')
    body=sub(body,'Simulações salvas neste navegador','Simulações salvas no sistema')
    body,n=re.subn(r'As simulações ficam gravadas no armazenamento local deste navegador/computador\.[^<]*','As simulações ficam gravadas nos dados do sistema de gestão. Use “Exportar” para cópia de segurança e “Importar JSON” para trazer simulações do simulador avulso.',body); assert n==1
    body=body.replace('Imprimir / PDF','Baixar para PDF').replace('Imprimir / Salvar como PDF','Baixar para imprimir / PDF').replace('Use “Salvar como PDF” na janela de impressão. Layout A4 retrato.','Abra o arquivo baixado, imprima e escolha “Salvar como PDF”. Layout A4 retrato.')
    cores={'#0b3d91':'#181818','#1d5fbf':'#84602f','#174f9f':'#6b4d25','#e8f0fc':'#f7efe1','#9cc0f5':'#e5c38c','#eef1f5':'#f6f4f0','#f1f3f6':'#f4f1ea','#cfd6e0':'#e0d9cc','#1b2430':'#181818','#5b6778':'#625d54','#e1e6ee':'#ece6da','#c9d0d8':'#d8d0c2'}
    def pinta(t):
        for a,b in cores.items():t=t.replace(a,b)
        return t
    css,scss,body=pinta(css),pinta(scss),pinta(body)
    marca='header.top{border-bottom:3px solid #c89752}header.top h1{color:#edbd7b}.card>h2{border-left:4px solid #c89752}'
    css+=marca;scss+=marca
    tpl='<template id="seroTpl"><style>'+scss+'</style><div class="sbody">'+body+'</div></template>'
    js=('<script>'+engine+'</script>\n<script>'+data+'</script>\n<script>\nconst SERO_CSS='+repr_js(css)+';\nfunction mountSero(D,HOST){\n'+ui+'\n}\n</script>')
    return tpl,js
def repr_js(t):
    import json
    return json.dumps(t,ensure_ascii=False).replace('</','<\\/')
