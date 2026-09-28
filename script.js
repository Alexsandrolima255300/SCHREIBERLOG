const $=s=>document.querySelector(s);
const menuBtn=$("#menuBtn"),mobileNav=$("#mobileNav");
menuBtn?.addEventListener("click",()=>{mobileNav.style.display=mobileNav.style.display==="block"?"none":"block"});
document.querySelectorAll(".mobile-nav a").forEach(a=>a.addEventListener("click",()=>mobileNav.style.display="none"));

const onlyDigits=v=>v.replace(/\D/g,"");

const formatCep=v=>{const d=onlyDigits(v).slice(0,8);return d.length>5?d.slice(0,5)+"-"+d.slice(5):d;};

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
  companyId:"#senderCompany",addressId:"#senderAddress",routeId:"#origin",cepId:null,label:"Remetente"
});
setupCnpjLookup({
  inputId:"#recipientCnpj",buttonId:"#lookupRecipientCnpj",statusId:"#recipientCnpjStatus",
  companyId:"#recipientCompany",addressId:"#recipientAddress",routeId:"#destination",cepId:"#cep",label:"Destinatário"
});

const money=v=>window.SchreiberCalculator?.formatBRL(v)||"R$ 0,00";
const parseBRL=v=>{
  if(typeof v==="number") return v;
  const raw=String(v||"").trim().replace(/R\$\s?/g,"").replace(/./g,"").replace(",",".");
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
  const origin=$("#origin").value.trim(), destination=$("#destination").value.trim();
  const weight=Number($("#weight").value||0), invoice=parseBRL($("#invoice").value), volumes=Number($("#volumes").value||0);
  const volumeM3=Number($("#volumeM3")?.value||0);
  if(!origin||!destination||weight<=0||invoice<0||volumes<1)return;

  const result=window.SchreiberCalculator.calculateSchreiberQuote({
    origin,destination,weight,invoice,volumes,volumeM3,
    trt:$("#trt")?.checked,tde:$("#tde")?.checked,tda:$("#tda")?.checked,tdc:$("#tdc")?.checked,
    reentrega:$("#reentrega")?.checked,devolucao:$("#devolucao")?.checked,tmr:$("#tmr")?.checked,
    pallets:Number($("#pallets")?.value||0),storageDays:Number($("#storageDays")?.value||0)
  });

  const box=$("#quoteResult");
  box.hidden=false;
  const rows=[
    ["Frete base",result.baseFreight],["Frete valor (0,4% NF)",result.freteValor],
    ["GRIS (0,1% NF)",result.gris],["Pedágio",result.pedagio],
    ["TRT",result.trt],["TDE",result.tde],["TDA",result.tda],["TDC",result.tdc],
    ["Descarga",result.descarga],["Armazenagem",result.storage],["Paletização",result.palletization],
    ["TMR",result.tmr],["Reentrega",result.reentrega],["Devolução",result.devolucao]
  ].filter(([,v])=>v>0).map(([label,v])=>'<div class="quote-row"><span>'+label+'</span><b>'+money(v)+'</b></div>').join("");

  const warningHtml=result.warnings.length
    ? '<div class="quote-warning"><b>Atenção:</b><ul>'+result.warnings.map(w=>'<li>'+w+'</li>').join("")+'</ul></div>'
    : "";

  box.innerHTML=
    '<div class="quote-summary"><div><small>PESO CONSIDERADO</small><b>'+result.billableWeight.toLocaleString("pt-BR",{maximumFractionDigits:3})+' kg</b></div><div><small>ROTA</small><b>'+origin+' → '+destination+'</b></div><div class="total"><small>FRETE ESTIMADO</small><b>'+money(result.total)+'</b></div></div>'+
    '<div class="quote-breakdown">'+rows+'</div>'+warningHtml+
    '<div class="quote-note">Cálculo baseado na tabela contratual fornecida para Brasil Engrenagens. ICMS não foi incluído, conforme regra da tabela. TDE/TDA/TDC só entram com valor cadastrado.</div>';
  box.scrollIntoView?.({behavior:"smooth",block:"nearest"});
});

$("#invoice")?.addEventListener("input",e=>{e.target.value=formatInputBRL(e.target.value);});

$("#cep")?.addEventListener("input",e=>{
  let v=e.target.value.replace(/\D/g,"").slice(0,8);
  if(v.length>5)v=v.slice(0,5)+"-"+v.slice(5);
  e.target.value=v;
});

$("#trackingForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  const code=$("#trackingCode").value.trim();
  const box=$("#trackingResult"); box.hidden=false;
  box.innerHTML="<b>Consulta preparada para o código "+code+".</b><br>Para exibir eventos reais, conectaremos este campo ao sistema de rastreamento/TMS da SchreiberLog.";
});
