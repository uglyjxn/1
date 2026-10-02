import fs from 'node:fs'; import vm from 'node:vm';
const ctx={window:{}}; vm.runInNewContext(fs.readFileSync('app/data/articles.js','utf8'),ctx);
const W=ctx.window.WIKI; const strip=x=>x.replace(/<[^>]+>/g,'');
let n=0; const cnt={};
for(const a of W.articles) for(const b of a.blocks){ cnt[b.t]=(cnt[b.t]||0)+1;
  if(b.t==='p'&&strip(b.html).length<25&&!b.formula){ if(n++<40) console.log('SHORT',a.id.slice(0,40),'|',strip(b.html)); }
  if(b.t==='strip'&&b.parts.some(p=>strip(p).length<4)) console.log('STRIP?',a.id,JSON.stringify(b.parts));
  if(b.t==='infobox'&&b.pairs.some(p=>!p[1])) console.log('INFOEMPTY',a.id,JSON.stringify(b.pairs).slice(0,200));
}
console.log(cnt);
