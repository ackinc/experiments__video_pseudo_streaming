const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");

// const instream = fs.createReadStream(path.join(__dirname, "../static/a.txt"));
const instream = fs.createReadStream(
  path.join(__dirname, "../static/nonexistent.txt")
);

instream.on("open", () => {
  console.log("The stream opened");
});

instream.on("close", () => {
  console.log("The stream closed");
});

instream.on("ready", () => {
  console.log("The stream is ready");
});

instream.on("error", (e) => {
  console.log("The stream errored");
  console.error(e);
});

(async () => {
  console.log("starting");
  await pipeline(instream, fs.createWriteStream("/dev/null"));
  console.log("done");
})();

process.on("uncaughtException", (e) => {
  console.log("\n---");
  console.error(e);
  process.exit(1);
});

// Results
// 1. If file exists: starting -> opened -> ready -> closed -> done
// 2. If files doesn't exist: starting -> errored -> closed
