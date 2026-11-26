const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const pages=['/','/trabalhos','/casamentos','/sobre','/contato','/privacidade']; const bad=[];
 for (const m of [true,false]) { const ctx=await b.newContext({viewport:m?{width:390,height:844}:{width:1440,height:900},isMobile:m,hasTouch:m}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  for (const from of pages) { await p.goto('http://localhost:8766'+from); await p.waitForSelector('.cy-nav'); await p.waitForTimeout(300);
   const labels=await p.$$eval('.cy-nav a.cy-navp',as=>as.map(a=>a.textContent.trim()));
   for (const l of labels) { await p.goto('http://localhost:8766'+from); await p.waitForSelector('.cy-nav'); await p.waitForTimeout(300);
    await p.evaluate(()=>scrollTo(0,600)); await p.waitForTimeout(150);
    await p.$$eval('.cy-nav a.cy-navp',(as,l)=>as.find(a=>a.textContent.trim()===l).click(),l); await p.waitForTimeout(2200);
    const r=await p.evaluate(()=>{const on=document.querySelector('.cy-navp.on');const n=document.querySelector('.cy-nav');let vis=true;if(on&&n){const a=on.getBoundingClientRect(),c=n.getBoundingClientRect();vis=a.left>=c.left-2&&a.right<=c.right+2;}
      const s=document.getElementById('servicos');return {url:location.pathname+location.hash,y:Math.round(scrollY),on:on?on.textContent.trim():'-',vis,sTop:s?Math.round(s.getBoundingClientRect().top):null};});
    let ok=r.on===l && r.vis; if(l==='Serviços') ok=ok&&r.sTop!==null&&Math.abs(r.sTop)<120; else if(l!=='Início'||from!=='/') ok=ok&&(r.y<5 || (l==='Início'&&from==='/'));
    if(l==='Início'&&from==='/') ok=r.on==='Início';
    console.log((ok?'OK ':'XX ')+(m?'cel ':'pc  ')+from.padEnd(12)+'→ '+l.padEnd(11)+JSON.stringify(r)); if(!ok)bad.push(1); } }
  if(errs.length) console.log('ERROS JS:',errs); await ctx.close(); }
 console.log('falhas:',bad.length); await b.close(); })();
