export default function handler(req: any, res: any) {
  console.log("[PING] method:", req.method)
  console.log("[PING] url:", req.url)
  res.status(200).json({ ok: true, method: req.method })
}
