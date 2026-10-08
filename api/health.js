module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    ok: true,
    service: "schreiberlog",
    quoteApi: {
      configured: Boolean(process.env.SCHREIBER_API_URL),
      mode: process.env.SCHREIBER_API_URL ? "external" : "local-fallback"
    },
    timestamp: new Date().toISOString()
  });
};
