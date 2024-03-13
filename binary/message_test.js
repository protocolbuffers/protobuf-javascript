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

// Test suite is written using Jasmine -- see http://jasmine.github.io/

goog.setTestOnly();

// CommonJS-LoadFromFile: ../protos/test_pb proto.jspb.test
goog.require('proto.jspb.test.Deeply.Nested.Message');

// CommonJS-LoadFromFile: ../protos/test2_pb proto.jspb.test
goog.require('proto.jspb.test.ForeignNestedFieldMessage');

describe('Message test suite', () => {
  // Verify that we can successfully use a field referring to a nested message
  // from a different .proto file.
  it('testForeignNestedMessage', () => {
    const msg = new proto.jspb.test.ForeignNestedFieldMessage();
    const nested = new proto.jspb.test.Deeply.Nested.Message();
    nested.setCount(5);
    msg.setDeeplyNestedMessage(nested);
    expect(msg.getDeeplyNestedMessage().getCount()).toEqual(5);

    // After a serialization-deserialization round trip we should get back the
    // same data we started with.
    const serialized = msg.serializeBinary();
    const deserialized =
        proto.jspb.test.ForeignNestedFieldMessage.deserializeBinary(serialized);
    expect(deserialized.getDeeplyNestedMessage().getCount()).toEqual(5);
  });
});
