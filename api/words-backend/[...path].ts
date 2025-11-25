// api/words-backend/[...path].ts  (na RAIZ do projeto, não dentro de src)

const BACKEND_URL = "http://froggo.us-east-2.elasticbeanstalk.com"

export default async function handler(req: any, res: any) {
  // tudo que vem depois de /api/words-backend/ vira esse array
  const pathSegments: string[] = (req.query?.path ?? []) as string[]
  const subPath = pathSegments.length ? `/${pathSegments.join("/")}` : ""

  const url = `${BACKEND_URL}${subPath}`

  try {
    const backendRes = await fetch(url, {
      method: req.method,
      headers: {
        ...req.headers,
        host: undefined,
        origin: undefined,
        referer: undefined,
        // auth fixo aqui, só no servidor
        Authorization: "Basic YWRtaW46YWRtaW44Mzg0",
      },
      body:
        req.method !== "GET" && req.method !== "HEAD"
          ? (req as any).body
          : undefined,
    })

    const text = await backendRes.text()
    res.status(backendRes.status).send(text)
  } catch (error) {
    console.error("Proxy error:", error)
    res.status(500).json({ error: "Proxy error" })
  }
}
