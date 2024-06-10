const path = require("path");
const util = require("util");
const exec = util.promisify(require("node:child_process").exec);

const protocJsPlugin = path.resolve(__dirname, "..", "..", "bazel-bin", "generator", "protoc-gen-js");
const command = `protoc --plugin=protoc-gen-js=${protocJsPlugin} --js_out=import_style=commonjs_flat_strict,binary:.`;

describe("When import_style is 'commonjs_flat_strict'", () => {
  it("'proto' is exported directly without package nesting", async () => {
    await exec(command + " ./protos/proto.proto ./protos/proto2.proto", { cwd: __dirname });
    const r = require(path.resolve(__dirname, "./protos/proto_pb"));
    expect(r.CommandRequest).toBeDefined();
  });

  it("global 'proto' is not polluted", async () => {
    await exec(command + " ./protos/proto.proto ./protos/proto2.proto", { cwd: __dirname });
    const r = require(path.resolve(__dirname, "./protos/proto_pb"));
    expect(global.proto).toBe(undefined);
  });

  it("addCommands resolves correctly without an error", async () => {
    await exec(command + " ./protos/proto.proto ./protos/proto2.proto", { cwd: __dirname });
    const r = require(path.resolve(__dirname, "./protos/proto_pb"));
    const c = new r.CommandRequest();
    c.addCommands();
  });

  it("getCommandsList resolves correctly without an error", async () => {
    await exec(command + " ./protos/proto.proto ./protos/proto2.proto", { cwd: __dirname });
    const r = require(path.resolve(__dirname, "./protos/proto_pb"));
    const c = new r.CommandRequest();
    c.getCommandsList();
  });
});
