const $=s=>document.querySelector(s);
const menuBtn=$("#menuBtn"),mobileNav=$("#mobileNav");
menuBtn?.addEventListener("click",()=>{mobileNav.style.display=mobileNav.style.display==="block"?"none":"block"});
document.querySelectorAll(".mobile-nav a").forEach(a=>a.addEventListener("click",()=>mobileNav.style.display="none"));
const onlyDigits=v=>String(v||"").replace(/\D/g,"");
const formatCep=v=>{const d=onlyDigits(v).slice(0,8);return d.length>5?d.slice(0,5)+"-"+d.slice(5):d;};
const applyRecipientTDE=async cnpj=>{
 const checkbox=$("#tde"),status=$("#recipientTdeStatus"); if(!checkbox)return;
 checkbox.checked=false;checkbox.disabled=true;if(status)status.innerHTML='<span class="status-loading">Verificando cadastro de TDE...</span>';
 try{const minimum=await window.findSchreiberTDE?.(cnpj);
  if(minimum!=null){checkbox.checked=true;checkbox.dataset.tdeMinimum=String(minimum);if(status)status.innerHTML='<span class="status-success">✓ TDE automático: destinatário cadastrado • mínimo '+money(minimum)+'</span>'}
  else{delete checkbox.dataset.tdeMinimum;if(status)status.innerHTML='<span class="status-muted">TDE não identificado para este destinatário.</span>'}
 }catch(e){delete checkbox.dataset.tdeMinimum;if(status)status.innerHTML='<span class="status-error">Não foi possível verificar a tabela TDE.</span>'}
};
const formatCnpj=v=>{const d=onlyDigits(v).slice(0,14);if(d.length<=2)return d;if(d.length<=5)return d.slice(0,2)+"."+d.slice(2);if(d.length<=8)return d.slice(0,2)+"."+d.slice(2,5)+"."+d.slice(5);if(d.length<=12)return d.slice(0,2)+"."+d.slice(2,5)+"."+d.slice(5,8)+"/"+d.slice(8);return d.slice(0,2)+"."+d.slice(2,5)+"."+d.slice(5,8)+"/"+d.slice(8,12)+"-"+d.slice(12,14);};
const setupCnpjLookup=({inputId,buttonId,statusId,companyId,addressId,routeId,cepId,label})=>{
 const input=$(inputId),button=$(buttonId),status=$(statusId),company=$(companyId),address=$(addressId);
 if(!input||!button){
  console.error("Campo/botão de CNPJ não encontrado:",inputId,buttonId);
  return;
 }
 input.addEventListener("input",e=>e.target.value=formatCnpj(e.target.value));
 const consultarCnpj=async()=>{
  const cnpj=onlyDigits(input.value);
  if(cnpj.length!==14){
   if(status)status.innerHTML='<span class="status-error">Digite os 14 dígitos do CNPJ.</span>';
   input.focus();
   return;
  }
  button.disabled=true;
  button.textContent="Consultando...";
  if(status)status.innerHTML='<span class="status-loading">Buscando dados do CNPJ...</span>';
  try{
   const response=await fetch("/api/cnpj?cnpj="+encodeURIComponent(cnpj),{
    method:"GET",
    headers:{Accept:"application/json"},
    cache:"no-store"
   });
   const text=await response.text();
   let data={};
   try{data=text?JSON.parse(text):{};}catch(_){throw new Error("A consulta retornou uma resposta inválida.");}
   if(!response.ok)throw new Error(data.error||"Não foi possível consultar este CNPJ agora.");
   const nome=data.razao_social||data.nome_fantasia||"";
   if(!nome)throw new Error("CNPJ consultado, mas nenhum nome de empresa foi retornado.");
   const endereco=[data.logradouro,data.numero,data.complemento,data.bairro].filter(Boolean).join(", ");
   const cidadeUf=[data.municipio,data.uf].filter(Boolean).join(" / ");
   if(company)company.value=nome;
   if(address)address.value=endereco;
   if(routeId&&$(routeId)&&cidadeUf)$(routeId).value=cidadeUf;
   if(cepId&&$(cepId)&&data.cep)$(cepId).value=formatCep(data.cep);
   if(status)status.innerHTML='<span class="status-success">✓ '+label+' encontrado(a): '+nome+'</span>';
   if(label==="Destinatário")await applyRecipientTDE(cnpj);
  }catch(error){
   console.error("Erro na consulta de CNPJ:",error);
   if(status)status.innerHTML='<span class="status-error">'+(error.message||"Erro ao consultar CNPJ.")+'</span>';
  }finally{
   button.disabled=false;
   button.textContent="Buscar";
  }
 };
 button.addEventListener("click",consultarCnpj);
 input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();consultarCnpj();}});
};
setupCnpjLookup({inputId:"#senderCnpj",buttonId:"#lookupSenderCnpj",statusId:"#senderCnpjStatus",companyId:"#senderCompany",addressId:"#senderAddress",routeId:"#origin",cepId:"#senderCep",label:"Remetente"});
setupCnpjLookup({inputId:"#recipientCnpj",buttonId:"#lookupRecipientCnpj",statusId:"#recipientCnpjStatus",companyId:"#recipientCompany",addressId:"#recipientAddress",routeId:"#destination",cepId:"#cep",label:"Destinatário"});
const money=v=>window.SchreiberCalculator?.formatBRL(v)||"R$ 0,00";
const normalizeCep=v=>onlyDigits(v).slice(0,8);
const formatCepInput=v=>{const d=normalizeCep(v);return d.length>5?d.slice(0,5)+"-"+d.slice(5):d;};
const resolveCep=(cep,target)=>{const clean=normalizeCep(cep);if(clean.length!==8)return;fetch("https://viacep.com.br/ws/"+clean+"/json/").then(r=>r.json()).then(data=>{if(data.erro)return;const cityUf=[data.localidade,data.uf].filter(Boolean).join(" / ");if(target&&$(target))$(target).value=cityUf}).catch(()=>{})};
["#senderCep","#cep"].forEach(sel=>$(sel)?.addEventListener("input",e=>e.target.value=formatCepInput(e.target.value)));
$("#senderCep")?.addEventListener("blur",e=>resolveCep(e.target.value,"#origin"));
$("#cep")?.addEventListener("blur",e=>resolveCep(e.target.value,"#destination"));
const parseBRL=v=>{if(typeof v==="number")return v;const raw=String(v||"").trim().replace(/R\$\s?/g,"").replace(/\./g,"").replace(",",".");const n=Number(raw);return Number.isFinite(n)?n:0};
const formatInputBRL=v=>{const digits=String(v||"").replace(/\D/g,"");if(!digits)return "";return (Number(digits)/100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})};
$("#quoteForm")?.addEventListener("submit",async e=>{
 e.preventDefault();
 const origin=$("#origin").value.trim(),destination=$("#destination").value.trim(),originCep=normalizeCep($("#senderCep")?.value),destinationCep=normalizeCep($("#cep")?.value);
 const weight=Number($("#weight").value||0),invoice=parseBRL($("#invoice").value),volumes=Number($("#volumes").value||0),heightCm=Number($("#heightCm")?.value||0),widthCm=Number($("#widthCm")?.value||0),lengthCm=Number($("#lengthCm")?.value||0);
 const volumesForCubage=Math.max(1,volumes),volumeM3=(heightCm*widthCm*lengthCm/1000000)*volumesForCubage;
 $("#volumeM3").value=volumeM3.toFixed(6);
 if(!origin||!destination||originCep.length!==8||destinationCep.length!==8||weight<=0||invoice<0||volumes<1)return;
 let service=null;try{service=await window.findSchreiberCep?.("SP3",destinationCep)}catch(_){service=null}
 const result=window.SchreiberCalculator.calculateSchreiberQuote({
  origin:"SP3",destination,originCep,destinationCep,weight,invoice,volumes,volumeM3,lengthCm,
  trt:$("#trt")?.checked,tde:$("#tde")?.checked,tdeValue:Number($("#tde")?.dataset.tdeMinimum||0),tda:$("#tda")?.checked,tdc:$("#tdc")?.checked,
  reentrega:$("#reentrega")?.checked,devolucao:$("#devolucao")?.checked,tmr:$("#tmr")?.checked||lengthCm>300,pallets:Number($("#pallets")?.value||0),storageDays:Number($("#storageDays")?.value||0)
 });
 const box=$("#quoteResult");box.hidden=false;
 const rows=[
  ["Frete base",result.baseFreight],["Frete valor (0,5% NF)",result.freteValor],["GRIS (0,2% NF)",result.gris],["Pedágio",result.pedagio],
  ["ICMS ("+((result.icmsRate||0)*100).toLocaleString("pt-BR",{maximumFractionDigits:2})+"% sobre o frete)",result.icms],
  ["TRT",result.trt],["TDE",result.tde],["TDA",result.tda],["TDC",result.tdc],["Descarga",result.descarga],["Armazenagem",result.storage],["Paletização",result.palletization],["TMR",result.tmr],["Reentrega",result.reentrega],["Devolução",result.devolucao]
 ].filter(([,v])=>v>0).map(([label,v])=>'<div class="quote-row"><span>'+label+'</span><b>'+money(v)+'</b></div>').join("");
 if(!service)result.warnings.push("CEP de destino não encontrado na matriz de Cidades e Prazos.");
 const warningHtml=result.warnings.length?'<div class="quote-warning"><b>Atenção:</b><ul>'+result.warnings.map(w=>"<li>"+w+"</li>").join("")+"</ul></div>":"";
 window.__schreiberLastQuote={generatedAt:new Date().toLocaleString("pt-BR"),origin,destination,originCep,destinationCep,originRegion:"SP3",service,weight,invoice,volumes,heightCm,widthCm,lengthCm,result};
 box.innerHTML='<div class="quote-summary"><div><small>ORIGEM OPERACIONAL</small><b>SP3</b></div><div><small>ATENDIMENTO</small><b>'+(service?service.branch+" • "+service.prazo+" dia(s)":"CEP não localizado")+'</b></div><div><small>PESO CONSIDERADO</small><b>'+result.billableWeight.toLocaleString("pt-BR",{maximumFractionDigits:3})+" kg</b></div><div><small>ROTA</small><b>SP3 → "+destination+"</b></div><div class="total"><small>FRETE ESTIMADO</small><b>'+money(result.total)+'</b></div></div><div class="quote-breakdown">'+rows+'</div>'+warningHtml+'<div class="quote-note">Tabela SP3 atualizada: Frete Valor 0,5% sobre NF; GRIS 0,2% sobre NF; pedágio R$ 6,00 por fração de 100 kg para SP e R$ 4,50 para SC; ICMS 18% para SP e 12% para SC, calculado sobre o frete.</div><div class="quote-actions"><button class="btn btn-primary" type="button" id="downloadQuoteBtn">Baixar cotação em PDF</button><button class="btn btn-ghost" type="button" id="printQuoteBtn">Imprimir</button></div>';
 box.querySelector("#downloadQuoteBtn")?.addEventListener("click",()=>window.print());
 box.querySelector("#printQuoteBtn")?.addEventListener("click",()=>window.print());
 box.scrollIntoView?.({behavior:"smooth",block:"nearest"});
});
const updateCubage=()=>{const h=Number($("#heightCm")?.value||0),w=Number($("#widthCm")?.value||0),l=Number($("#lengthCm")?.value||0),qty=Math.max(1,Number($("#volumes")?.value||1)),m3=(h*w*l/1000000)*qty,cubed=m3*300;if($("#volumeM3"))$("#volumeM3").value=m3.toFixed(6);if($("#cubagemInfo"))$("#cubagemInfo").textContent=m3>0?"Cubagem: "+m3.toLocaleString("pt-BR",{minimumFractionDigits:3,maximumFractionDigits:3})+" m³ • Peso cubado: "+cubed.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+" kg • 300 kg/m³":"Cubagem calculada automaticamente a 300 kg/m³ conforme a tabela."};
["#heightCm","#widthCm","#lengthCm","#volumes"].forEach(sel=>$(sel)?.addEventListener("input",updateCubage));updateCubage();
$("#invoice")?.addEventListener("input",e=>e.target.value=formatInputBRL(e.target.value));
$("#trackingForm")?.addEventListener("submit",e=>{e.preventDefault();window.location.href="https://sbr.log.br/rastreamento.php"});
