const fs = require('fs');
const os = require('os');
const path = require('path');
const AdmZip = require('adm-zip');

const pkg = require('./package.json');
const VERSION = pkg.version;
const BIN_DIR = path.join(__dirname, 'bin');

function getZipFilename(currentSystem) {
  return `protobuf-javascript-${VERSION}-${currentSystem}.zip`;
}

function getDownloadUrl(currentSystem) {
  return `https://github.com/protocolbuffers/protobuf-javascript/releases/download/v${VERSION}/${getZipFilename(currentSystem)}`;
}

function unzip(zipFile, destDir, binaryName) {
  return new Promise((resolve, reject) => {
    const zip = new AdmZip(zipFile);

    // Paths may be inconsistent between platforms. On MacOS and Windows,
    // the path seems to include the archive name while it doesn't on linux.
    // There's only one thing named protoc-gen-js(.exe), so just look for
    // that instead of trying to get the exact "entryName".
    const entries = zip.getEntries();
    let found = false;
    for (const entry of entries) {
      if (entry.name === binaryName) {
        zip.extractEntryTo(entry, destDir, false, true);
        found = true;
        break;
      }
    }

    if (found) {
      resolve();
    } else {
      reject(new Error(`Binary ${binaryName} not found in zip file ${zipFile}`));
    }
  });
}

function getCurrentSystem() {
  const platform = os.platform();
  const arch = os.arch();

  if (platform === 'darwin') {
    if (arch === 'x64') {
      return 'osx-x86_64';
    }
    if (arch === 'arm64') {
      return 'osx-aarch_64';
    }
  } else if (platform === 'win32' && arch === 'x64') {
    return 'win64';
  } else if (platform === 'linux') {
    if (arch === 'x64') {
      return 'linux-x86_64';
    }
    if (arch === 'arm64') {
      return 'linux-aarch_64';
    }
    if (arch === 's390x') {
      return 'linux-s390_64';
    }
  }

  console.error(`Unsupported platform: ${platform} ${arch}`);
  process.exit(1);
}

async function main() {
  try {
    await fs.promises.mkdir(BIN_DIR, { recursive: true });
    const currentSystem = getCurrentSystem();


    const downloadUrl = getDownloadUrl(currentSystem);
    const zipFile = path.join(__dirname, getZipFilename(currentSystem));
    const isWindows = os.platform() === 'win32';
    const binaryName = isWindows ? 'protoc-gen-js.exe' : 'protoc-gen-js';
    const binaryPath = path.join(BIN_DIR, binaryName);

    console.log(`Downloading ${downloadUrl}`);
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download: ${response.status} ${response.statusText}`
      );
    }
    const buffer = await response.arrayBuffer();
    await fs.promises.writeFile(zipFile, Buffer.from(buffer));

    console.log('Unzipping...');
    await unzip(zipFile, BIN_DIR, binaryName);

    await fs.promises.unlink(zipFile);

    console.log(`Making ${binaryPath} executable...`);
    if (!isWindows) {
      await fs.promises.chmod(binaryPath, 0o755);
    }

    console.log('Done!');
  } catch (err) {
    console.error(`Failed to install protoc-gen-js: ${err.message}`);
    process.exit(1);
  }
}

main();