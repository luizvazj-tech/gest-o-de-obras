# Monta index.html a partir de src/. Motor SERO e tabelas VAU: src/sero.html.
# Uso: python3 src/build.py
import os
from gen_sero import gerar
d=os.path.dirname(os.path.abspath(__file__))
js=''.join(open(os.path.join(d,f),encoding='utf-8').read() for f in ('core.js','ui.js','bdi.js','v2.js','ex.js','rel.js'))
tpl,sj=gerar(os.path.join(d,'sero.html'))
html=open(os.path.join(d,'shell.html'),encoding='utf-8').read().replace('<!--SERO_TPL-->',tpl).replace('<!--SERO_JS-->',sj).replace('/*JS*/',js)
open(os.path.join(d,'..','index.html'),'w',encoding='utf-8').write(html);print(len(html))
