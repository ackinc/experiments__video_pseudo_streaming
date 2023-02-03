const fs = require("fs");
const path = require("path");

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

    // TODO: support range requests

    try {
      const { size: filesize } = await fs.promises.stat(filepath);
      const instream = fs.createReadStream(filepath);

      // since this request handler is an async fn, not returning res here
      //   results in a race condition that causes the stream to be closed
      //   prematurely, and a 0-length response to be sent to the client
      // see https://www.fastify.io/docs/latest/Reference/Routes/#async-await
      return res
        .header("Content-Type", getMimetypeFromFilename(filename))
        .header("Content-Length", filesize)
        .header("Content-Disposition", download ? "attachment" : "inline")
        .send(instream);
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

// TODO: add a route allowing user to upload files (want to simulate ENOSPC)

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
