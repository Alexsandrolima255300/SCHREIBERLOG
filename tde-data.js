/* TDE SchreiberLog — tabela agosto/2026. 3.807 destinatários. */
const SCHREIBER_TDE_MINS=[14.78,24.64,30.8,38.5,44.35,49.28,52.8,55,61.6,67.76,70.84,73.92,77,81.31,86.24,88,98.56,100,110,110.88,118.27,123.2,132,133.05,134.4,145.2,147.84,150,165,177.4,184.4,184.8,192.19,198,198.79,200,215.6,216.83,220,221.76,242,246.4,250,258.72,264,269.6,270,275,283.36,295.24,295.54,295.68,297.44,300,302.5,308,325.27,330,336,338.8,340.03,344.96,350,357.28,369.6,380,384.92,385,400,406.56,417.44,425.04,431.2,432.3,440,443.52,450,464.64,468.16,470.4,487,487.87,492,492.8,495,495.88,500,517,517.44,528,532.22,550,554.4,566.72,569.18,581.73,591.18,591.36,600,605,609.84,614.27,614.72,616,650,650.49,660,665.28,667.6,672,677.6,700,704,715,739,739.2,770,800,800.8,808.44,813.12,862.4,878.16,880,924,985.6,1034.88,1232,1478.4];
const SCHREIBER_TDE_CHUNK_COUNT=9;
function b64ToBytes(b64){const bin=atob(b64);const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;}
async function loadSchreiberTDE(){
 const parts=await Promise.all(Array.from({length:SCHREIBER_TDE_CHUNK_COUNT},(_,i)=>fetch('./tde-'+String(i+1).padStart(2,'0')+'.txt').then(r=>{if(!r.ok)throw new Error('Falha ao carregar base TDE');return r.text();})));
 const compressed=b64ToBytes(parts.join(''));
 const bytes=new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
 const dv=new DataView(bytes.buffer); const map=new Map();
 for(let o=0;o<bytes.length;o+=5){const root=dv.getUint32(o,false).toString().padStart(8,'0');const idx=bytes[o+4];if(idx)map.set(root,SCHREIBER_TDE_MINS[idx-1]);}
 window.SCHREIBER_TDE=map;
 return map;
}
window.SchreiberTDEReady=loadSchreiberTDE().catch(e=>{console.error(e);return new Map();});
window.findSchreiberTDE=async function(cnpj){const map=await window.SchreiberTDEReady;const d=String(cnpj||'').replace(/\D/g,'');if(!d)return null;const exact=map.get(d.slice(0,8));return exact??null;};
