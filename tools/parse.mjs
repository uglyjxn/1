// pdftohtml -xml -> structured page items
import { execFileSync } from 'node:child_process';
const dec = s => s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
export function parsePdf(file){
  const xml = execFileSync('pdftohtml',['-xml','-i','-stdout','-nodrm',file],{maxBuffer:1<<29}).toString('utf8');
  const pages=[]; let cur=null; const fonts={};
  for(const raw of xml.split('\n')){
    let m;
    if((m=raw.match(/<page number="(\d+)" .*height="(\d+)" width="(\d+)"/))){cur={n:+m[1],h:+m[2],w:+m[3],items:[]};pages.push(cur);continue;}
    if((m=raw.match(/<fontspec id="(\d+)" size="(\d+)" family="([^"]*)" color="([^"]*)"/))){fonts[m[1]]={size:+m[2],family:m[3],color:m[4]};continue;}
    if((m=raw.match(/<text top="(-?\d+)" left="(-?\d+)" width="(\d+)" height="(\d+)" font="(\d+)">(.*)<\/text>/))){
      const f=fonts[m[5]]; let html=m[6];
            const text=dec(html.replace(/<\/?[a-z][^>]*>/g,''));
      if(!text.trim()) continue;
      cur.items.push({top:+m[1],left:+m[2],width:+m[3],height:+m[4],size:f.size,color:f.color,family:f.family,bold:/^<b>(?:(?!<\/b>).)*<\/b>$/.test(html),italic:/<i>/.test(html),html,text});
    }
  }
  return pages;
}
if(import.meta.url===`file://${process.argv[1]}`&&process.argv[2]){
  const pages=parsePdf(process.argv[2]);
  const from=+process.argv[3]||1,to=+process.argv[4]||from;
  for(const p of pages.filter(p=>p.n>=from&&p.n<=to)){
    console.log('--- page',p.n,p.w,p.h);
    for(const i of p.items) console.log(`${i.top}\t${i.left}\t${i.width}\ts${i.size}${i.bold?'B':''}${i.italic?'I':''}\t${i.color}\t${i.text}`);
  }
}
