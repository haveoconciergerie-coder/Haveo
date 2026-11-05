const {chromium}=require('playwright');
(async()=>{const [src,out,scale]=process.argv.slice(2);const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:+scale||1});
await p.goto('file://'+src);await p.evaluate(()=>document.fonts.ready);
const names=['presentation','services','accueil','checklist','offre','vos-regles','demarrer','estimation'];
for(let i=1;i<=8;i++){await p.locator('#p'+i).screenshot({path:`${out}/haveo-0${i}-${names[i-1]}.png`});}
await b.close()})();
