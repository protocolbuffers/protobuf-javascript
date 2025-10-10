#!/usr/bin/env node

const child_process = require("child_process");
const PLUGIN = require("./");

child_process
  .spawn(PLUGIN, process.argv.slice(2), { stdio: "inherit" })
  .on("exit", (code) => process.exit(code));
