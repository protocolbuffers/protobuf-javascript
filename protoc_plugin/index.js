const path = require("path");
const BIN_DIR = path.resolve(__dirname, "bin");
const EXT = process.platform === "win32" ? ".exe" : "";

module.exports = path.resolve(BIN_DIR, "protoc-gen-js" + EXT);
