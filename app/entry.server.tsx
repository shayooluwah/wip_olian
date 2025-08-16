import { PassThrough } from "node:stream";
import type { EntryContext } from "@remix-run/node";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { renderToPipeableStream } from "react-dom/server";

// Timeout for streaming (used with v3_singleFetch)
export const streamTimeout = 5000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const didError = false;
    const body = new PassThrough();
    const stream = createReadableStreamFromReadable(body);

    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        strategy: "native",
        onShellReady() {
          const contentType = "text/html; charset=utf-8";
          responseHeaders.set("Content-Type", contentType);
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode,
            })
          );
          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          didError;
          console.error("SSR Error:", error);
        },
      }
    );

    // Abort render if it takes longer than streamTimeout + 1s
    setTimeout(abort, streamTimeout + 1000);
  });
}