const BACKEND_URL = "http://froggo.us-east-2.elasticbeanstalk.com"

async function readBody(req: any) {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  const buf = Buffer.concat(chunks)
  return buf.length ? buf : undefined
}

export default async function handler(req: any, res: any) {
  const pathSegments: string[] = (req.query?.path ?? []) as string[]
  const subPath = pathSegments.length ? `/${pathSegments.join("/")}` : ""
  const url = `${BACKEND_URL}${subPath}`

  const {
    host,
    origin,
    referer,
    connection,
    "content-length": contentLength,
    "accept-encoding": acceptEncoding,
    ...rest
  } = req.headers || {}

  try {
    const body = req.method !== "GET" && req.method !== "HEAD" ? await readBody(req) : undefined

    const backendRes = await fetch(url, {
      method: req.method,
      headers: {
        ...rest,
        authorization: "Basic YWRtaW46YWRtaW44Mzg0",
      },
      body,
      redirect: "manual",
    })

    backendRes.headers.forEach((value, key) => {
      if (key.toLowerCase() === "transfer-encoding") return
      res.setHeader(key, value)
    })

    res.status(backendRes.status)
    const arrayBuffer = await backendRes.arrayBuffer()
    res.send(Buffer.from(arrayBuffer))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "Proxy error" })
  }
}
