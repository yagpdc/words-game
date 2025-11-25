export default async function handler(req: any, res: any) {
  const BACKEND_URL = "http://froggo.us-east-2.elasticbeanstalk.com"

  const url =
    BACKEND_URL + (req.url?.replace("/api/words-backend", "") ?? "")

  try {
    const backendRes = await fetch(url, {
      method: req.method,
      headers: {
        ...req.headers,
        host: undefined,
        origin: undefined,
        referer: undefined,
        Authorization: "Basic YWRtaW46YWRtaW44Mzg0",
      },
      body:
        req.method !== "GET" && req.method !== "HEAD"
          ? req.body
          : undefined,
    })

    const text = await backendRes.text()
    res.status(backendRes.status).send(text)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "Proxy error" })
  }
}
