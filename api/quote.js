const ALLOWED_METHODS = ["POST"];

function clean(value) {
  return String(value ?? "").trim();
}

function digits(value) {
  return clean(value).replace(/\D/g, "");
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function validate(input) {
  const errors = [];
  if (digits(input.originCep).length !== 8) errors.push("originCep deve conter 8 dígitos.");
  if (digits(input.destinationCep).length !== 8) errors.push("destinationCep deve conter 8 dígitos.");
  if (number(input.weight) <= 0) errors.push("weight deve ser maior que zero.");
  if (number(input.invoice) < 0) errors.push("invoice não pode ser negativo.");
  if (number(input.volumes) < 1) errors.push("volumes deve ser maior ou igual a 1.");
  return errors;
}

function buildPayload(input) {
  return {
    origin: clean(input.origin),
    destination: clean(input.destination),
    originCep: digits(input.originCep),
    destinationCep: digits(input.destinationCep),
    weight: number(input.weight),
    invoice: number(input.invoice),
    volumes: Math.max(1, Math.floor(number(input.volumes))),
    dimensions: {
      heightCm: number(input.heightCm),
      widthCm: number(input.widthCm),
      lengthCm: number(input.lengthCm)
    },
    optionalFees: {
      trt: Boolean(input.trt),
      tde: Boolean(input.tde),
      tda: Boolean(input.tda),
      tdc: Boolean(input.tdc),
      reentrega: Boolean(input.reentrega),
      devolucao: Boolean(input.devolucao),
      tmr: Boolean(input.tmr),
      pallets: Math.max(0, Math.floor(number(input.pallets))),
      storageDays: Math.max(0, Math.floor(number(input.storageDays)))
    }
  };
}

async function callExternalApi(payload) {
  const url = process.env.SCHREIBER_API_URL;
  if (!url) return null;

  const controller = new AbortController();
  const timeoutMs = Math.min(Math.max(number(process.env.SCHREIBER_API_TIMEOUT_MS) || 10000, 1000), 30000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    "Accept": "application/json",
    "Content-Type": "application/json"
  };

  if (process.env.SCHREIBER_API_TOKEN) {
    headers.Authorization = "Bearer " + process.env.SCHREIBER_API_TOKEN;
  }
  if (process.env.SCHREIBER_API_KEY) {
    headers["X-API-Key"] = process.env.SCHREIBER_API_KEY;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (_) {
      data = { raw: text };
    }

    if (!response.ok) {
      const error = new Error("A API externa recusou a cotação.");
      error.status = response.status;
      error.details = data;
      throw error;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!ALLOWED_METHODS.includes(req.method)) {
    res.setHeader("Allow", ALLOWED_METHODS.join(", "));
    return res.status(405).json({ error: "Método não permitido." });
  }

  let input = req.body || {};
  if (typeof input === "string") {
    try { input = JSON.parse(input); }
    catch (_) { return res.status(400).json({ error: "JSON inválido." }); }
  }

  const errors = validate(input);
  if (errors.length) return res.status(400).json({ error: "Dados inválidos.", details: errors });

  const payload = buildPayload(input);

  try {
    const external = await callExternalApi(payload);

    if (external) {
      return res.status(200).json({
        ok: true,
        source: "schreiber-api",
        data: external
      });
    }

    return res.status(503).json({
      ok: false,
      source: "local",
      code: "SCHREIBER_API_NOT_CONFIGURED",
      error: "A API oficial da Schreiber ainda não está configurada neste ambiente.",
      payload
    });
  } catch (error) {
    console.error("SCHREIBER_QUOTE_API_ERROR", error);
    return res.status(error.status && error.status >= 400 ? 502 : 504).json({
      ok: false,
      source: "schreiber-api",
      error: error.name === "AbortError" ? "Tempo limite excedido ao consultar a API da Schreiber." : "Não foi possível consultar a API da Schreiber.",
      details: process.env.NODE_ENV === "development" ? error.details || error.message : undefined
    });
  }
};
