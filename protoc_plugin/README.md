This package is an official distribution of protoc-gen-js plugin generating
javascript protobuf messages with protoc.

Aside from this package, you will need:

1. [protoc](https://github.com/protocolbuffers/protobuf/releases), the protobuf compiler.
2. The protobuf-javascript runtime, obtainable from [npm as google-protobuf](https://www.npmjs.com/package/google-protobuf).

Usage:

```js
// Assuming you installed this package as: npm install --save-dev @protocolbuffers/protoc-gen-js

protoc --plugin=./node_modules/.bin/protoc-gen-js --js_out=import_style=commonjs,binary:. messages.proto <additional .proto files>
```

`protoc` will search PATH for `protoc-gen-js` if `--plugin` is omitted.

This command will generate javascript protobuf files (with a `_pb.js` suffix for
commonjs imports) alongside their respective schema files
(e.g. `messages_pb.js`).

Please see our
[full documentation](https://github.com/protocolbuffers/protobuf-javascript/blob/main/docs/index.md)
for more detailed usage instructions along with the generated code API.
