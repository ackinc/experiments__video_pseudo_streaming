const fs = require("fs");
const path = require("path");

const MAX_CHUNK_SIZE_BYTES = 3_000_000;

const fastify = require("fastify")({ logger: { level: "debug" } });

fastify.get("/", () => "OK");

fastify.get(
  "/static/:filename",
  {
    schema: {
      query: { download: { type: "boolean", default: false } },
      params: { filename: { type: "string" } },
    },
  },
  async (req, res) => {
    const { filename } = req.params;
    const { download } = req.query;
    const filepath = path.join(__dirname, "static", filename);

    try {
      const { size: filesize } = await fs.promises.stat(filepath);

      let start = 0;
      let end = Math.max(0, filesize - 1);
      if (req.headers.range) {
        [start, end] = req.headers.range
          .replace("bytes=", "")
          .split("-")
          .filter((n) => n)
          .map(Number);
        end ??= Math.max(0, filesize - 1);

        if (start < 0 || start >= filesize || end < start || end >= filesize) {
          return res.code(416).send();
        }
      }

      // we don't want to send too much at once
      end = Math.min(end, start + MAX_CHUNK_SIZE_BYTES - 1);

      const instream = fs.createReadStream(filepath, { start, end });

      // the Math.min call ensures we serve zero-byte files correctly
      const contentLength = Math.min(filesize, end - start + 1);

      res
        .code(contentLength < filesize ? 206 : 200)
        .header("Accept-Ranges", "bytes")
        .header("Content-Type", getMimetypeFromFilename(filename))
        .header("Content-Length", contentLength)
        .header("Content-Disposition", download ? "attachment" : "inline");

      if (contentLength < filesize)
        res.header("Content-Range", `bytes ${start}-${end}/${filesize}`);

      // since this request handler is an async fn, not returning res here
      //   results in a race condition that causes the stream to be closed
      //   prematurely, and a 0-length response to be sent to the client
      // see https://www.fastify.io/docs/latest/Reference/Routes/#async-await
      return res.send(instream);
    } catch (e) {
      if (e.code === "ENOENT") res.code(404).send(e);
      else throw e;
    }
  }
);

fastify.get("/page", (req, res) => {
  res.header("Content-Type", "text/html").send(`
    <html>
      <body>
        <video width=640 controls src="http://localhost:9008/static/weddingVideo_FullHD_80mins_faststart.mp4" />
      </body>
    </html>
  `);
});

(async () => {
  await fastify.listen({ port: 9008 });
})();

function getMimetypeFromFilename(filename) {
  const ext = path.extname(filename).slice(1);

  if (["mp4", "webm"].includes(ext)) return `video/${ext}`;
  if (["png", "jpg", "jpeg"].includes(ext)) return `image/${ext}`;
  if (["html"].includes(ext)) return `text/${ext}`;
  if (["txt"].includes(ext)) return `text/plain`;
  return "application/octet-stream";
}
