import { randomUUID } from "crypto"

const BACKEND_URL = "http://froggo.us-east-2.elasticbeanstalk.com"

async function readBody(req: any) {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  const buf = Buffer.concat(chunks)
  return buf.length ? buf : undefined
}

export default async function handler(req: any, res: any) {
  const rid = randomUUID()
  const startedAt = Date.now()

  const pathSegments: string[] = (req.query?.path ?? []) as string[]
  const subPath = pathSegments.length ? `/${pathSegments.join("/")}` : ""
  const url = `${BACKEND_URL}${subPath}`

  console.log(`[${rid}] IN`, req.method, req.url, "->", url)

  const {
    host,
    origin,
    referer,
    connection,
    "content-length": contentLength,
    "accept-encoding": acceptEncoding,
    ...rest
  } = req.headers || {}

  console.log(`[${rid}] headers keys:`, Object.keys(rest || {}).slice(0, 25))

  try {
    const body = req.method !== "GET" && req.method !== "HEAD" ? await readBody(req) : undefined
    console.log(`[${rid}] body bytes:`, body ? body.length : 0)

    const backendRes = await fetch(url, {
      method: req.method,
      headers: {
        ...rest,
        authorization: "Basic YWRtaW46YWRtaW44Mzg0",
      },
      body,
      redirect: "manual",
    })

    console.log(
      `[${rid}] OUT status:`,
      backendRes.status,
      backendRes.statusText,
      "ms:",
      Date.now() - startedAt
    )

    backendRes.headers.forEach((value, key) => {
      if (key.toLowerCase() === "transfer-encoding") return
      res.setHeader(key, value)
    })

    res.setHeader("x-proxy-rid", rid)

    const arrayBuffer = await backendRes.arrayBuffer()
    res.status(backendRes.status).send(Buffer.from(arrayBuffer))
  } catch (e: any) {
    console.log(`[${rid}] ERROR:`, e?.message || e)
    res.status(500).json({ error: "Proxy error", rid })
  }
}
