const tc = require('@actions/tool-cache');
const core = require('@actions/core');
const os = require('os');
const path = require('path');

const versions = tc.findAllVersions('protoc');
if (versions.length === 0)
    throw new Error('Unable to find protoc tool version');

const version = versions[0];
const toolPath = tc.find('protoc', version).replaceAll(path.win32.sep, path.posix.sep);
const protocExec = os.platform() === 'win32' ? 'protoc.exe' : 'protoc';

// need to use posix paths
const protocPath = path.posix.join(toolPath, 'bin', protocExec);
const protocIncPath = path.posix.join(toolPath, 'include');

console.log("protoc path:", protocPath);
console.log("protoc include path:", protocIncPath);

core.exportVariable('PROTOC', protocPath);
core.exportVariable('PROTOC_INC', protocIncPath);
