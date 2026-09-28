module.exports = async function handler(req, res) {
  const cnpj = String(req.query?.cnpj || "").replace(/\D/g, "");

  if (cnpj.length !== 14) {
    return res.status(400).json({ error: "Digite um CNPJ válido com 14 dígitos." });
  }

  const urls = [
    "https://brasilapi.com.br/cnpj/v1/" + cnpj,
    "https://publica.cnpj.ws/cnpj/" + cnpj
  ];

  let lastStatus = 502;

  for (const url of urls) {
    try {
      const response = await fetch(url);
      lastStatus = response.status;

      if (response.ok) {
        const raw = await response.json();
        const data = raw.estabelecimento ? {
          razao_social: raw.razao_social,
          nome_fantasia: raw.estabelecimento.nome_fantasia,
          logradouro: raw.estabelecimento.logradouro,
          numero: raw.estabelecimento.numero,
          complemento: raw.estabelecimento.complemento,
          bairro: raw.estabelecimento.bairro,
          cep: raw.estabelecimento.cep,
          municipio: raw.estabelecimento.cidade?.nome,
          uf: raw.estabelecimento.estado?.sigla,
          telefone: raw.estabelecimento.telefone1,
          email: raw.estabelecimento.email,
          situacao_cadastral: raw.estabelecimento.situacao_cadastral
        } : {
          razao_social: raw.razao_social,
          nome_fantasia: raw.nome_fantasia,
          logradouro: raw.logradouro,
          numero: raw.numero,
          complemento: raw.complemento,
          bairro: raw.bairro,
          cep: raw.cep,
          municipio: raw.municipio,
          uf: raw.uf,
          telefone: raw.ddd_telefone_1 || raw.telefone,
          email: raw.email,
          situacao_cadastral: raw.situacao_cadastral
        };

        return res.status(200).json(data);
      }
    } catch (error) {
      // Tenta a próxima fonte.
    }
  }

  if (lastStatus === 429) {
    return res.status(429).json({ error: "Limite de consultas da base pública atingido. Aguarde um minuto e tente novamente." });
  }

  if (lastStatus === 404) {
    return res.status(404).json({ error: "CNPJ não encontrado nas bases de consulta." });
  }

  return res.status(502).json({ error: "As bases de CNPJ estão temporariamente indisponíveis. Tente novamente em instantes." });
};
