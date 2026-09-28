const $=s=>document.querySelector(s);
const menuBtn=$("#menuBtn"),mobileNav=$("#mobileNav");
menuBtn?.addEventListener("click",()=>{mobileNav.style.display=mobileNav.style.display==="block"?"none":"block"});
document.querySelectorAll(".mobile-nav a").forEach(a=>a.addEventListener("click",()=>mobileNav.style.display="none"));

const onlyDigits=v=>v.replace(/\D/g,"");

const formatCep=v=>{const d=onlyDigits(v).slice(0,8);return d.length>5?d.slice(0,5)+"-"+d.slice(5):d;};

const applyRecipientTDE=async cnpj=>{
  const checkbox=$("#tde"), status=$("#recipientTdeStatus");
  if(!checkbox) return;
  checkbox.checked=false;
  checkbox.disabled=true;
  if(status) status.innerHTML='<span class="status-loading">Verificando cadastro de TDE...</span>';
  try{
    const minimum=await window.findSchreiberTDE?.(cnpj);
    if(minimum!=null){
      checkbox.checked=true;
      checkbox.dataset.tdeMinimum=String(minimum);
      if(status) status.innerHTML='<span class="status-success">✓ TDE automático: destinatário cadastrado • mínimo '+money(minimum)+'</span>';
    }else{
      delete checkbox.dataset.tdeMinimum;
      if(status) status.innerHTML='<span class="status-muted">TDE não identificado para este destinatário.</span>';
    }
  }catch(error){
    delete checkbox.dataset.tdeMinimum;
    if(status) status.innerHTML='<span class="status-error">Não foi possível verificar a tabela TDE.</span>';
  }
};

const formatCnpj=v=>{
  const d=onlyDigits(v).slice(0,14);
  if(d.length<=2)return d;
  if(d.length<=5)return d.slice(0,2)+"."+d.slice(2);
  if(d.length<=8)return d.slice(0,2)+"."+d.slice(2,5)+"."+d.slice(5);
  if(d.length<=12)return d.slice(0,2)+"."+d.slice(2,5)+"."+d.slice(5,8)+"/"+d.slice(8);
  return d.slice(0,2)+"."+d.slice(2,5)+"."+d.slice(5,8)+"/"+d.slice(8,12)+"-"+d.slice(12,14);
};

const setupCnpjLookup=({inputId,buttonId,statusId,companyId,addressId,routeId,cepId,label})=>{
  const input=$(inputId),button=$(buttonId),status=$(statusId),company=$(companyId),address=$(addressId);
  input?.addEventListener("input",e=>{e.target.value=formatCnpj(e.target.value);});
  button?.addEventListener("click",async()=>{
    const cnpj=onlyDigits(input?.value||"");
    if(cnpj.length!==14){
      if(status) status.innerHTML='<span class="status-error">Digite os 14 dígitos do CNPJ.</span>';
      return;
    }
    button.disabled=true; button.textContent="Consultando...";
    if(status) status.innerHTML='<span class="status-loading">Buscando dados na BrasilAPI...</span>';
    try{
      const response=await fetch("/api/cnpj?cnpj="+encodeURIComponent(cnpj));
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error||"Não foi possível consultar este CNPJ agora.");
      const nome=data.razao_social||data.nome_fantasia||"";
      const endereco=[data.logradouro,data.numero,data.complemento,data.bairro].filter(Boolean).join(", ");
      const cidadeUf=[data.municipio,data.uf].filter(Boolean).join(" / ");
      if(company) company.value=nome;
      if(address) address.value=endereco;
      if(routeId && $(routeId) && cidadeUf) $(routeId).value=cidadeUf;
      if(cepId && $(cepId) && data.cep) $(cepId).value=formatCep(data.cep);
      if(status) status.innerHTML='<span class="status-success">✓ '+label+' encontrado(a): '+nome+'</span>';
      if(label==="Destinatário") await applyRecipientTDE(cnpj);
    }catch(error){
      if(status) status.innerHTML='<span class="status-error">'+(error.message||"Erro ao consultar CNPJ.")+'</span>';
      if(company) company.value="";
      if(address) address.value="";
    }finally{
      button.disabled=false; button.textContent="Buscar";
    }
  });
};

setupCnpjLookup({
  inputId:"#senderCnpj",buttonId:"#lookupSenderCnpj",statusId:"#senderCnpjStatus",
  companyId:"#senderCompany",addressId:"#senderAddress",routeId:"#origin",cepId:"#senderCep",label:"Remetente"
});
setupCnpjLookup({
  inputId:"#recipientCnpj",buttonId:"#lookupRecipientCnpj",statusId:"#recipientCnpjStatus",
  companyId:"#recipientCompany",addressId:"#recipientAddress",routeId:"#destination",cepId:"#cep",label:"Destinatário"
});

const money=v=>window.SchreiberCalculator?.formatBRL(v)||"R$ 0,00";
const normalizeCep=v=>String(v||"").replace(/\\D/g,"").slice(0,8);
const formatCepInput=v=>{const d=normalizeCep(v);return d.length>5?d.slice(0,5)+"-"+d.slice(5):d;};
const resolveCep=(cep,target)=>{
  const clean=normalizeCep(cep);
  if(clean.length!==8)return;
  fetch("https://viacep.com.br/ws/"+clean+"/json/")
    .then(r=>r.json())
    .then(data=>{
      if(data.erro)return;
      const cityUf=[data.localidade,data.uf].filter(Boolean).join(" / ");
      if(target && $(target)) $(target).value=cityUf;
    }).catch(()=>{});
};
["#senderCep","#cep"].forEach(sel=>$(sel)?.addEventListener("input",e=>{e.target.value=formatCepInput(e.target.value);}));
$("#senderCep")?.addEventListener("blur",e=>resolveCep(e.target.value,"#origin"));
$("#cep")?.addEventListener("blur",e=>resolveCep(e.target.value,"#destination"));

const parseBRL=v=>{
  if(typeof v==="number") return v;
  const raw=String(v||"").trim().replace(/R\$\s?/g,"").replace(/\./g,"").replace(",",".");
  const n=Number(raw);
  return Number.isFinite(n)?n:0;
};
const formatInputBRL=v=>{
  const digits=String(v||"").replace(/\D/g,"");
  if(!digits) return "";
  const cents=Number(digits)/100;
  return cents.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
};

$("#quoteForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  const origin=$("#origin").value.trim(), destination=$("#destination").value.trim(), originCep=normalizeCep($("#senderCep")?.value), destinationCep=normalizeCep($("#cep")?.value);
  const weight=Number($("#weight").value||0), invoice=parseBRL($("#invoice").value), volumes=Number($("#volumes").value||0);
  const heightCm=Number($("#heightCm")?.value||0);
  const widthCm=Number($("#widthCm")?.value||0);
  const lengthCm=Number($("#lengthCm")?.value||0);
  const volumesForCubage=Math.max(1,volumes);
  const volumePerUnitM3=(heightCm*widthCm*lengthCm)/1000000;
  const volumeM3=volumePerUnitM3*volumesForCubage;
  $("#volumeM3").value=volumeM3.toFixed(6);
  if(!origin||!destination||originCep.length!==8||destinationCep.length!==8||weight<=0||invoice<0||volumes<1)return;

  const result=window.SchreiberCalculator.calculateSchreiberQuote({
    origin,destination,originCep,destinationCep,weight,invoice,volumes,volumeM3,lengthCm,
    trt:$("#trt")?.checked,tde:$("#tde")?.checked,tdeValue:Number($("#tde")?.dataset.tdeMinimum||0),tda:$("#tda")?.checked,tdc:$("#tdc")?.checked,
    reentrega:$("#reentrega")?.checked,devolucao:$("#devolucao")?.checked,tmr:$("#tmr")?.checked || lengthCm>300,
    pallets:Number($("#pallets")?.value||0),storageDays:Number($("#storageDays")?.value||0)
  });

  const box=$("#quoteResult");
  box.hidden=false;
  const rows=[
    ["Frete base",result.baseFreight],["Frete valor (0,4% NF)",result.freteValor],
    ["GRIS (0,1% NF)",result.gris],["Pedágio",result.pedagio],
    ["ICMS ("+((result.icmsRate||0)*100).toLocaleString("pt-BR",{maximumFractionDigits:2})+"% sobre o frete)",result.icms],
    ["TRT",result.trt],["TDE",result.tde],["TDA",result.tda],["TDC",result.tdc],
    ["Descarga",result.descarga],["Armazenagem",result.storage],["Paletização",result.palletization],
    ["TMR",result.tmr],["Reentrega",result.reentrega],["Devolução",result.devolucao]
  ].filter(([,v])=>v>0).map(([label,v])=>'<div class="quote-row"><span>'+label+'</span><b>'+money(v)+'</b></div>').join("");

  const warningHtml=result.warnings.length
    ? '<div class="quote-warning"><b>Atenção:</b><ul>'+result.warnings.map(w=>'<li>'+w+'</li>').join("")+'</ul></div>'
    : "";

  const printableQuote={
    generatedAt:new Date().toLocaleString("pt-BR"),
    origin,destination,originCep,destinationCep,weight,invoice,volumes,heightCm,widthCm,lengthCm,result
  };
  window.__schreiberLastQuote=printableQuote;

  box.innerHTML=
    '<div class="quote-summary"><div><small>PESO CONSIDERADO</small><b>'+result.billableWeight.toLocaleString("pt-BR",{maximumFractionDigits:3})+' kg</b></div><div><small>ROTA</small><b>'+origin+' → '+destination+'</b></div><div class="total"><small>FRETE ESTIMADO</small><b>'+money(result.total)+'</b></div></div>'+
    '<div class="quote-breakdown">'+rows+'</div>'+warningHtml+
    '<div class="quote-note">Cálculo baseado na tabela contratual fornecida para Brasil Engrenagens. ICMS: 18% para SP e 12% para SC, calculado sobre o valor do frete. GRIS: 0,1% sobre o valor da NF. TDE é identificado automaticamente pelo CNPJ do destinatário conforme a tabela de agosto/2026.</div>'+
    '<div class="quote-actions"><button class="btn btn-primary" type="button" id="downloadQuoteBtn">Baixar cotação em PDF</button><button class="btn btn-ghost" type="button" id="printQuoteBtn">Imprimir</button></div>';
  box.querySelector("#downloadQuoteBtn")?.addEventListener("click",()=>window.print());
  box.querySelector("#printQuoteBtn")?.addEventListener("click",()=>window.print());
  box.scrollIntoView?.({behavior:"smooth",block:"nearest"});
});

const updateCubage=()=>{
  const h=Number($("#heightCm")?.value||0),w=Number($("#widthCm")?.value||0),l=Number($("#lengthCm")?.value||0);
  const qty=Math.max(1,Number($("#volumes")?.value||1));
  const m3=(h*w*l/1000000)*qty;
  const cubed=m3*300;
  if($("#volumeM3")) $("#volumeM3").value=m3.toFixed(6);
  if($("#cubagemInfo")) $("#cubagemInfo").textContent=m3>0
    ? "Cubagem: "+m3.toLocaleString("pt-BR",{minimumFractionDigits:3,maximumFractionDigits:3})+" m³ • Peso cubado: "+cubed.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+" kg • 300 kg/m³"
    : "Cubagem calculada automaticamente a 300 kg/m³ conforme a tabela.";
};
["#heightCm","#widthCm","#lengthCm","#volumes"].forEach(sel=>$(sel)?.addEventListener("input",updateCubage));
updateCubage();

$("#invoice")?.addEventListener("input",e=>{e.target.value=formatInputBRL(e.target.value);});

$("#cep")?.addEventListener("input",e=>{
  let v=e.target.value.replace(/\D/g,"").slice(0,8);
  if(v.length>5)v=v.slice(0,5)+"-"+v.slice(5);
  e.target.value=v;
});

$("#trackingForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  window.location.href="https://sbr.log.br/rastreamento.php";
});
