/* SCHREIBERLOG — Motor de cotação SP3 conforme tabela comercial atualizada. */
const SCHREIBER_RULES = Object.freeze({
  densityKgM3: 300,
  freteValorRate: 0.005,
  grisRate: 0.002,
  icmsRates: { SP: 0.18, SC: 0.12 },
  pedágioPer100Kg: { SP: 6, SC: 4.5 },
  trtRate: 0.05,
  trtMinimum: 5,
  tmrPerCte: 300,
  palletizationPerPallet: 100,
  storageRatePerDay: 0.05,
  storageMinimumPerDay: 25,
  reentregaRate: 0.50,
  devolucaoRate: 1,
  routes: {
    "SP3|SP": { bands: [61.74,66.15,73.86,82.68,98.12,115.76], excess: 0.70 },
    "SP3|SC": { bands: [74.97,78.27,84.89,102.53,120.17,148.83], excess: 0.90 }
  }
});

function normalizeRoute(value){
  return String(value||"").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}
function getRouteKey(origin,destination){
  const o=normalizeRoute(origin), d=normalizeRoute(destination);
  const m=d.match(/(?:^|[\s/,-])(SP|SC)$/);
  return o+"|"+(m?.[1]||d);
}
function getUfFromCep(cep){
  const d=String(cep||"").replace(/\D/g,""), p=Number(d.slice(0,2));
  if(p>=1&&p<=19)return "SP";
  if(p>=88&&p<=89)return "SC";
  return "";
}
function getDestinationUf(destination,cep){
  const d=normalizeRoute(destination);
  return getUfFromCep(cep)||(d.match(/(?:^|[\s/,-])(SP|SC)$/)||[])[1]||(d==="SP"||d==="SC"?d:"");
}
function getBandIndex(weight){
  if(weight<=5)return 0;if(weight<=10)return 1;if(weight<=25)return 2;
  if(weight<=50)return 3;if(weight<=75)return 4;return 5;
}
function round2(n){return Math.round((Number(n)+Number.EPSILON)*100)/100;}

function calculateSchreiberQuote(input={}){
  const actualWeight=Math.max(0,Number(input.weight)||0);
  const invoice=Math.max(0,Number(input.invoice)||0);
  const volumes=Math.max(1,Math.floor(Number(input.volumes)||1));
  const totalM3=Math.max(0,Number(input.volumeM3)||0);
  const lengthCm=Math.max(0,Number(input.lengthCm)||0);
  const volumetricWeight=totalM3*SCHREIBER_RULES.densityKgM3;
  const billableWeight=Math.max(actualWeight,volumetricWeight);
  const key=getRouteKey("SP3",input.destination);
  const route=SCHREIBER_RULES.routes[key];
  const warnings=[];
  if(!route)warnings.push("Destino sem tarifa cadastrada nesta tabela SP3.");
  if(totalM3>0)warnings.push("Peso cubado aplicado a 300 kg/m³ conforme tabela.");
  if(actualWeight<=0)warnings.push("Informe o peso da carga.");

  let baseFreight=0;
  if(route&&billableWeight>0){
    baseFreight=billableWeight<=100
      ? route.bands[getBandIndex(billableWeight)]
      : route.bands[5]+((billableWeight-100)*route.excess);
  }

  const freteValor=invoice*SCHREIBER_RULES.freteValorRate;
  const gris=invoice*SCHREIBER_RULES.grisRate;
  const destinationUf=getDestinationUf(input.destination,input.destinationCep);
  const pedagio=billableWeight>0
    ? Math.ceil(billableWeight/100)*(SCHREIBER_RULES.pedágioPer100Kg[destinationUf]||0)
    : 0;

  const originalComposition=baseFreight+freteValor+gris+pedagio;
  const icmsRate=SCHREIBER_RULES.icmsRates[destinationUf]||0;
  const icms=originalComposition*icmsRate;
  const trt=input.trt?Math.max(originalComposition*SCHREIBER_RULES.trtRate,SCHREIBER_RULES.trtMinimum):0;
  const tde=Number(input.tdeValue)||0, tda=Number(input.tdaValue)||0, tdc=Number(input.tdcValue)||0, descarga=Number(input.descargaValue)||0;
  const storageDays=Math.max(0,Math.floor(Number(input.storageDays)||0));
  const storage=storageDays>0?Math.max(originalComposition*SCHREIBER_RULES.storageRatePerDay,SCHREIBER_RULES.storageMinimumPerDay)*storageDays:0;
  const palletization=Math.max(0,Math.floor(Number(input.pallets)||0))*SCHREIBER_RULES.palletizationPerPallet;
  const tmr=(input.tmr||lengthCm>300)?SCHREIBER_RULES.tmrPerCte:0;
  const reentrega=input.reentrega?originalComposition*(input.tde?1:SCHREIBER_RULES.reentregaRate):0;
  const devolucao=input.devolucao?originalComposition*SCHREIBER_RULES.devolucaoRate:0;
  const total=originalComposition+icms+trt+tde+tda+tdc+descarga+storage+palletization+tmr+reentrega+devolucao;

  if(input.tde&&!tde)warnings.push("TDE marcado, mas nenhum valor de TDE foi informado/configurado.");
  if(lengthCm>300)warnings.push("TMR automático: material com comprimento superior a 3 metros.");
  if(input.tda&&!tda)warnings.push("TDA marcado, mas nenhum valor de TDA foi informado/configurado.");
  if(input.tdc&&!tdc)warnings.push("TDC marcado, mas nenhum valor de TDC foi informado/configurado.");

  return {
    route:key,originCep:String(input.originCep||"").replace(/\D/g,""),destinationCep:String(input.destinationCep||"").replace(/\D/g,""),
    destinationUf,actualWeight,volumetricWeight,billableWeight,invoice,volumes,lengthCm,
    baseFreight:round2(baseFreight),freteValor:round2(freteValor),gris:round2(gris),pedagio:round2(pedagio),
    icmsRate,icms:round2(icms),trt:round2(trt),tde:round2(tde),tda:round2(tda),tdc:round2(tdc),descarga:round2(descarga),
    storage:round2(storage),palletization:round2(palletization),tmr:round2(tmr),reentrega:round2(reentrega),
    devolucao:round2(devolucao),total:round2(total),warnings
  };
}
function formatBRL(value){return Number(value||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
window.SchreiberCalculator={calculateSchreiberQuote,formatBRL,SCHREIBER_RULES};
