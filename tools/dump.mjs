import fs from 'node:fs'; import vm from 'node:vm';
const ctx={window:{}}; vm.runInNewContext(fs.readFileSync('app/data/articles.js','utf8'),ctx);
const W=ctx.window.WIKI; const q=process.argv[2]; const max=+process.argv[3]||40;
for(const a of W.articles.filter(a=>a.id===q||a.id.startsWith(q))){
 console.log('=== ',a.id,'|',a.title,'|',a.kind,'| children',a.children.length);
 let n=0; for(const b of a.blocks){ if(n++>max)break;
  const s=x=>x.replace(/<[^>]+>/g,'').slice(0,160);
  if(b.t==='p')console.log('P:',s(b.html)); else if(b.t==='h')console.log('H'+b.level+':',b.text,b.tag?'['+b.tag+']':'');
  else if(b.t==='ul')console.log('UL:',b.items.length,s(b.items[0]),'|',s(b.items[b.items.length-1]));
  else if(b.t==='table'){console.log('TABLE',b.head.map(s).join(' | '));for(const r of b.rows.slice(0,4))console.log('   ',r.map(s).join(' | ').slice(0,200));console.log('   rows',b.rows.length);}
  else if(b.t==='infobox')console.log('INFO:',b.pairs.map(p=>p[0]+'='+s(p[1])).join('; '));
  else if(b.t==='figure')console.log('FIG:',b.img,s(b.caption));
  else if(b.t==='callout')console.log('CALLOUT',b.kind,s(b.html));
  else console.log(b.t.toUpperCase()+':',JSON.stringify(b).slice(0,200));
 }}
