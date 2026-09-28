const $=s=>document.querySelector(s);
const menuBtn=$("#menuBtn"),mobileNav=$("#mobileNav");
menuBtn?.addEventListener("click",()=>{mobileNav.style.display=mobileNav.style.display==="block"?"none":"block"});
document.querySelectorAll(".mobile-nav a").forEach(a=>a.addEventListener("click",()=>mobileNav.style.display="none"));

$("#quoteForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  const origin=$("#origin").value.trim(), destination=$("#destination").value.trim();
  const weight=Number($("#weight").value||0), invoice=Number($("#invoice").value||0), volumes=Number($("#volumes").value||0);
  if(!origin||!destination||weight<=0||invoice<0||volumes<1)return;
  const result=$("#quoteResult");
  result.hidden=false;
  result.innerHTML="<b>Dados recebidos.</b><br>"+origin+" → "+destination+" • "+weight.toLocaleString("pt-BR")+" kg • "+volumes+" volume(s).<br><br><span>O cálculo do valor do frete deve ser ligado à tabela comercial oficial da SchreiberLog. Nenhuma tarifa foi inventada nesta versão.</span>";
  result.scrollIntoView({behavior:"smooth",block:"nearest"});
});

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
