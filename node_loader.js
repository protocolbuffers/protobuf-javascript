// Protocol Buffers - Google's data interchange format
// Copyright 2008 Google Inc.  All rights reserved.
// https://protobuf.dev/
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//     * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

/**
 * @fileoverview Loader that handles goog.require() for Node.JS.
 */

const fs = require('fs');
const path = require('path');

// For goog.require()
const OLD_CLOSURE_IMPORT_SCRIPT = goog.global.CLOSURE_IMPORT_SCRIPT;

goog.global.CLOSURE_IMPORT_SCRIPT = function(src, opt_sourceText) {
  if (opt_sourceText === undefined) {
    try {
      // Load from the current directory.
      require("./" + src);
      return true;
    } catch (e) {
      // Fall back to the Closure loader.
    }
  }

  return OLD_CLOSURE_IMPORT_SCRIPT(src, opt_sourceText);
};

const OLD_CLOSURE_LOAD_FILE_SYNC = goog.global.CLOSURE_LOAD_FILE_SYNC;

goog.global.CLOSURE_LOAD_FILE_SYNC = function (src) {
  try {
    return fs.readFileSync(path.resolve('.', src), { encoding: 'utf-8' });
  } catch (e) {
    return OLD_CLOSURE_LOAD_FILE_SYNC(src);
  }
};
