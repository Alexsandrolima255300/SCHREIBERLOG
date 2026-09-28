module.exports = async function handler(req, res) {
  const cnpj = String(req.query?.cnpj || "").replace(/\D/g, "");

  if (cnpj.length !== 14) {
    return res.status(400).json({ error: "Digite um CNPJ válido com 14 dígitos." });
  }

  const urls = [
    "https://brasilapi.com.br/cnpj/v1/" + cnpj,
    "https://publica.cnpj.ws/cnpj/" + cnpj,
    "https://www.receitaws.com.br/v1/cnpj/" + cnpj
  ];

  let lastStatus = 502;

  for (const url of urls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        headers: { "Accept": "application/json" },
        signal: controller.signal
      });
      lastStatus = response.status;

      if (!response.ok) continue;

      const raw = await response.json();

      const estabelecimento = raw.estabelecimento;
      const data = estabelecimento ? {
        razao_social: raw.razao_social,
        nome_fantasia: estabelecimento.nome_fantasia,
        logradouro: estabelecimento.logradouro,
        numero: estabelecimento.numero,
        complemento: estabelecimento.complemento,
        bairro: estabelecimento.bairro,
        cep: estabelecimento.cep,
        municipio: estabelecimento.cidade?.nome,
        uf: estabelecimento.estado?.sigla,
        telefone: estabelecimento.telefone1,
        email: estabelecimento.email,
        situacao_cadastral: estabelecimento.situacao_cadastral
      } : {
        razao_social: raw.razao_social || raw.nome || "",
        nome_fantasia: raw.nome_fantasia || raw.fantasia || "",
        logradouro: raw.logradouro || "",
        numero: raw.numero || "",
        complemento: raw.complemento || "",
        bairro: raw.bairro || "",
        cep: raw.cep || "",
        municipio: raw.municipio || "",
        uf: raw.uf || "",
        telefone: raw.ddd_telefone_1 || raw.telefone || "",
        email: raw.email || "",
        situacao_cadastral: raw.situacao_cadastral || raw.situacao || ""
      };

      if (data.razao_social || data.nome_fantasia) {
        return res.status(200).json(data);
      }
    } catch (error) {
      // Tenta a próxima fonte.
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastStatus === 429) {
    return res.status(429).json({ error: "Limite de consultas da base pública atingido. Tente novamente em instantes." });
  }

  if (lastStatus === 404) {
    return res.status(404).json({ error: "CNPJ não encontrado nas bases de consulta." });
  }

  return res.status(502).json({
    error: "Não foi possível consultar o CNPJ agora. As bases públicas podem estar temporariamente indisponíveis."
  });
};