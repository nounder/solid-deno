// Deno HTTP Proxy Server
// Run with: deno run --allow-net proxy_server.ts
import { Buffer } from "node:buffer"
import { IncomingMessage, ServerResponse } from "node:http"
import { Socket } from "node:net"
import * as vite from "vite"

async function createViteDevHandler(config: vite.InlineConfig = {
  server: {
    middlewareMode: true,
  },
}) {
  const viteDevServer = await vite.createServer(config)

  async function handler(req: Request): Promise<Response> {
    try {
      // Extract path and query from the original request
      const url = new URL(req.url)

      const socket = new Socket()
      const viteReq = new IncomingMessage(socket)

      viteReq.url = `${url.pathname}${url.search}`
      viteReq.method = req.method
      // @ts-ignore it works
      viteReq.headers = { ...req.headers }

      const viteRes = new ServerResponse(viteReq)
      const viteResFuture = Promise.withResolvers<void>()

      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()

      viteRes.write = function (chunk: any) {
        writer.write(Buffer.from(chunk))

        return true
      }

      viteRes.end = function (chunk?: any) {
        if (chunk) {
          writer.write(Buffer.from(chunk))
        }

        writer.close()
        viteResFuture.resolve()

        return this
      }

      viteDevServer.middlewares.handle(viteReq, viteRes, (err) => {
        // todo: this is probably not necessary.
        // I think this is next() handler rather than error callback.
        if (err) {
          console.error("Vite middleware error:", err)
          writer.abort(err)
          viteResFuture.reject(err)
        }
      })

      await viteResFuture.promise

      return new Response(readable, {
        status: viteRes.statusCode,
        // @ts-ignore it works
        headers: new Headers(viteRes.getHeaders()),
      })
    } catch (error) {
      console.error(error)

      return new Response(`Unexpected proxy server error`, { status: 500 })
    }
  }

  return handler
}

const handler = await createViteDevHandler()

// Start the Deno HTTP server
Deno.serve({
  port: 8000,
}, handler)
