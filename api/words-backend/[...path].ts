const BACKEND_URL = "http://froggo.us-east-2.elasticbeanstalk.com"

export default async function handler(req: any, res: any) {
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
    console.error(error)
    res.status(500).json({ error: "Proxy error" })
  }
}
