// Protocol Buffers - Google's data interchange format
// Copyright 2016 Google Inc.  All rights reserved.
// https://developers.google.com/protocol-buffers/
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

// Test suite is written using Jasmine -- see http://jasmine.github.io/



const googleProtobuf = require('google-protobuf');
const global = Function('return this')();

const test9_pb = require('./protos/test9_pb');
const test10_pb = require('./protos/test10_pb');

describe('Strict test suite', function() {
  it('testImportedMessage', function() {
    const simple1 = new test9_pb.jspb.exttest.strict.nine.Simple9()
    const simple2 = new test9_pb.jspb.exttest.strict.nine.Simple9()
    expect(simple1.toObject()).toEqual(simple2.toObject());
  });

  it('testGlobalScopePollution', function() {
    expect(global.jspb.exttest).toBeUndefined();
  });

  describe('with imports', function() {
    it('testImportedMessage', function() {
      const simple1 = new test10_pb.jspb.exttest.strict.ten.Simple10()
      const simple2 = new test10_pb.jspb.exttest.strict.ten.Simple10()
      expect(simple1.toObject()).toEqual(simple2.toObject());
    });

    it('testGlobalScopePollution', function() {
      expect(global.jspb.exttest).toBeUndefined();
    });
  });
});
