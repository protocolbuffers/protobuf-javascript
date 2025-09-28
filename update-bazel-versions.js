const fs = require('fs');
const path = require('path');

const version = require('./package.json').version;

// Update MODULE.bazel
const moduleBazelPath = path.join(__dirname, 'MODULE.bazel');
let moduleBazelContent = fs.readFileSync(moduleBazelPath, 'utf8');
moduleBazelContent = moduleBazelContent.replace(/version = ".*"/, `version = "${version}"`);
fs.writeFileSync(moduleBazelPath, moduleBazelContent);

// Update protobuf_javascript_release.bzl
const releaseBzlPath = path.join(__dirname, 'protobuf_javascript_release.bzl');
let releaseBzlContent = fs.readFileSync(releaseBzlPath, 'utf8');
releaseBzlContent = releaseBzlContent.replace(/_PROTOBUF_JAVASCRIPT_VERSION = ".*"/, `_PROTOBUF_JAVASCRIPT_VERSION = "${version}"`);
fs.writeFileSync(releaseBzlPath, releaseBzlContent);

// Update conformance/package.json
const conformancePackageJsonPath =
    path.join(__dirname, 'conformance', 'package.json');
let conformancePackageJsonContent =
    fs.readFileSync(conformancePackageJsonPath, 'utf8');
const conformancePackageJson = JSON.parse(conformancePackageJsonContent);
conformancePackageJson.dependencies['google-protobuf'] =
    `file:../google-protobuf-${version}.tgz`;
fs.writeFileSync(
    conformancePackageJsonPath,
    JSON.stringify(conformancePackageJson, null, 2) + '\n');
