export default async function handler(req, res) {
  return res.status(200).json({
    method: req.method,
    url: req.url,
    query: req.query,
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });
}
