// Protocol Buffers - Google's data interchange format
// Copyright 2008 Google Inc.  All rights reserved.
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

goog.require('goog.crypt.base64');
// CommonJS-LoadFromFile: protos/testbinary_pb proto.jspb.test
goog.require('proto.jspb.test.ForeignMessage');
// CommonJS-LoadFromFile: protos/proto3_test_pb proto.jspb.test
goog.require('proto.jspb.test.Proto3Enum');
goog.require('proto.jspb.test.TestProto3');
// CommonJS-LoadFromFile: google/protobuf/any_pb proto.google.protobuf
goog.require('proto.google.protobuf.Any');
// CommonJS-LoadFromFile: google/protobuf/timestamp_pb proto.google.protobuf
goog.require('proto.google.protobuf.Timestamp');
// CommonJS-LoadFromFile: google/protobuf/struct_pb proto.google.protobuf
goog.require('proto.google.protobuf.Struct');
goog.require('jspb.Message');


const BYTES = new Uint8Array([1, 2, 8, 9]);
const BYTES_B64 = goog.crypt.base64.encodeByteArray(BYTES);

/**
 * Helper: compare a bytes field to an expected value
 * @param {Uint8Array|string} arr
 * @param {Uint8Array} expected
 * @return {boolean}
 */
function bytesCompare(arr, expected) {
  if (typeof arr === 'string') {
    arr = goog.crypt.base64.decodeStringToUint8Array(arr);
  }
  if (arr.length != expected.length) {
    return false;
  }
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] != expected[i]) {
      return false;
    }
  }
  return true;
}


describe('proto3Test', () => {
  /**
   * Test default values don't affect equality test.
   */
  it('testEqualsProto3', () => {
    const msg1 = new proto.jspb.test.TestProto3();
    const msg2 = new proto.jspb.test.TestProto3();
    msg2.setSingularString('');

    expect(jspb.Message.equals(msg1, msg2)).toBeTrue();
  });


  /**
   * Test setting when a field has default semantics.
   */
  it('testSetProto3ToValueAndBackToDefault', () => {
    const msg = new proto.jspb.test.TestProto3();

    // Setting should work normally.
    msg.setSingularString('optionalString');
    expect(msg.getSingularString()).toEqual('optionalString');

    // Clearing should work too ...
    msg.setSingularString('');
    expect(msg.getSingularString()).toEqual('');

    // ... and shouldn't affect the equality with a brand new message.
    expect(jspb.Message.equals(msg, new proto.jspb.test.TestProto3()))
        .toBeTrue();
  });

  /**
   * Test defaults for proto3 message fields.
   */
  it('testProto3FieldDefaults', () => {
    const msg = new proto.jspb.test.TestProto3();

    expect(msg.getSingularInt32()).toEqual(0);
    expect(msg.getSingularInt64()).toEqual(0);
    expect(msg.getSingularUint32()).toEqual(0);
    expect(msg.getSingularUint64()).toEqual(0);
    expect(msg.getSingularSint32()).toEqual(0);
    expect(msg.getSingularSint64()).toEqual(0);
    expect(msg.getSingularFixed32()).toEqual(0);
    expect(msg.getSingularFixed64()).toEqual(0);
    expect(msg.getSingularSfixed32()).toEqual(0);
    expect(msg.getSingularSfixed64()).toEqual(0);
    expect(msg.getSingularFloat()).toEqual(0);
    expect(msg.getSingularDouble()).toEqual(0);
    expect(msg.getSingularString()).toEqual('');

    // TODO(b/26173701): when we change bytes fields default getter to return
    expect(typeof msg.getSingularBytes()).toEqual('string');
    expect(msg.getSingularBytes_asU8() instanceof Uint8Array).toBeTrue();
    expect(typeof msg.getSingularBytes_asB64()).toEqual('string');
    expect(msg.getSingularBytes().length).toEqual(0);
    expect(msg.getSingularBytes_asU8().length).toEqual(0);
    expect(msg.getSingularBytes_asB64()).toEqual('');

    expect(msg.getSingularForeignEnum())
        .toEqual(proto.jspb.test.Proto3Enum.PROTO3_FOO);
    expect(msg.getSingularForeignMessage()).toBeUndefined();
    expect(msg.getSingularForeignMessage()).toBeUndefined();

    expect(msg.getRepeatedInt32List().length).toEqual(0);
    expect(msg.getRepeatedInt64List().length).toEqual(0);
    expect(msg.getRepeatedUint32List().length).toEqual(0);
    expect(msg.getRepeatedUint64List().length).toEqual(0);
    expect(msg.getRepeatedSint32List().length).toEqual(0);
    expect(msg.getRepeatedSint64List().length).toEqual(0);
    expect(msg.getRepeatedFixed32List().length).toEqual(0);
    expect(msg.getRepeatedFixed64List().length).toEqual(0);
    expect(msg.getRepeatedSfixed32List().length).toEqual(0);
    expect(msg.getRepeatedSfixed64List().length).toEqual(0);
    expect(msg.getRepeatedFloatList().length).toEqual(0);
    expect(msg.getRepeatedDoubleList().length).toEqual(0);
    expect(msg.getRepeatedStringList().length).toEqual(0);
    expect(msg.getRepeatedBytesList().length).toEqual(0);
    expect(msg.getRepeatedForeignEnumList().length).toEqual(0);
    expect(msg.getRepeatedForeignMessageList().length).toEqual(0);
  });

  /**
   * Test presence for proto3 optional fields.
   */
  it('testProto3Optional', () => {
    const msg = new proto.jspb.test.TestProto3();

    expect(msg.getOptionalInt32()).toEqual(0);
    expect(msg.getOptionalInt64()).toEqual(0);
    expect(msg.getOptionalUint32()).toEqual(0);
    expect(msg.getOptionalUint64()).toEqual(0);
    expect(msg.getOptionalSint32()).toEqual(0);
    expect(msg.getOptionalSint64()).toEqual(0);
    expect(msg.getOptionalFixed32()).toEqual(0);
    expect(msg.getOptionalFixed64()).toEqual(0);
    expect(msg.getOptionalSfixed32()).toEqual(0);
    expect(msg.getOptionalSfixed64()).toEqual(0);
    expect(msg.getOptionalFloat()).toEqual(0);
    expect(msg.getOptionalDouble()).toEqual(0);
    expect(msg.getOptionalString()).toEqual('');

    // TODO(b/26173701): when we change bytes fields default getter to return
    expect(typeof msg.getOptionalBytes()).toEqual('string');
    expect(msg.getOptionalBytes_asU8() instanceof Uint8Array).toBeTrue();
    expect(typeof msg.getOptionalBytes_asB64()).toEqual('string');
    expect(msg.getOptionalBytes().length).toEqual(0);
    expect(msg.getOptionalBytes_asU8().length).toEqual(0);
    expect(msg.getOptionalBytes_asB64()).toEqual('');

    expect(msg.getOptionalForeignEnum())
        .toEqual(proto.jspb.test.Proto3Enum.PROTO3_FOO);
    expect(msg.getOptionalForeignMessage()).toBeUndefined();
    expect(msg.getOptionalForeignMessage()).toBeUndefined();

    // Serializing an empty proto yields the empty string.
    expect(msg.serializeBinary().length).toEqual(0);

    // Values start as unset, but can be explicitly set even to default values
    // like 0.
    expect(msg.hasOptionalInt32()).toBeFalse();
    msg.setOptionalInt32(0);
    expect(msg.hasOptionalInt32()).toBeTrue();

    expect(msg.hasOptionalInt64()).toBeFalse();
    msg.setOptionalInt64(0);
    expect(msg.hasOptionalInt64()).toBeTrue();

    expect(msg.hasOptionalString()).toBeFalse();
    msg.setOptionalString('');
    expect(msg.hasOptionalString()).toBeTrue();

    // Now the proto will have a non-zero size, even though its values are 0.
    const serialized = msg.serializeBinary();
    expect(serialized.length).not.toEqual(0);

    const msg2 = proto.jspb.test.TestProto3.deserializeBinary(serialized);
    expect(msg2.hasOptionalInt32()).toBeTrue();
    expect(msg2.hasOptionalInt64()).toBeTrue();
    expect(msg2.hasOptionalString()).toBeTrue();

    // We can clear fields to go back to empty.
    msg2.clearOptionalInt32();
    expect(msg2.hasOptionalInt32()).toBeFalse();

    msg2.clearOptionalString();
    expect(msg2.hasOptionalString()).toBeFalse();
  });

  /**
   * Test that all fields can be set ,and read via a serialization roundtrip.
   */
  it('testProto3FieldSetGet', () => {
    let msg = new proto.jspb.test.TestProto3();

    msg.setSingularInt32(-42);
    msg.setSingularInt64(-0x7fffffff00000000);
    msg.setSingularUint32(0x80000000);
    msg.setSingularUint64(0xf000000000000000);
    msg.setSingularSint32(-100);
    msg.setSingularSint64(-0x8000000000000000);
    msg.setSingularFixed32(1234);
    msg.setSingularFixed64(0x1234567800000000);
    msg.setSingularSfixed32(-1234);
    msg.setSingularSfixed64(-0x1234567800000000);
    msg.setSingularFloat(1.5);
    msg.setSingularDouble(-1.5);
    msg.setSingularBool(true);
    msg.setSingularString('hello world');
    msg.setSingularBytes(BYTES);
    let submsg = new proto.jspb.test.ForeignMessage();
    submsg.setC(16);
    msg.setSingularForeignMessage(submsg);
    msg.setSingularForeignEnum(proto.jspb.test.Proto3Enum.PROTO3_BAR);

    msg.setRepeatedInt32List([-42]);
    msg.setRepeatedInt64List([-0x7fffffff00000000]);
    msg.setRepeatedUint32List([0x80000000]);
    msg.setRepeatedUint64List([0xf000000000000000]);
    msg.setRepeatedSint32List([-100]);
    msg.setRepeatedSint64List([-0x8000000000000000]);
    msg.setRepeatedFixed32List([1234]);
    msg.setRepeatedFixed64List([0x1234567800000000]);
    msg.setRepeatedSfixed32List([-1234]);
    msg.setRepeatedSfixed64List([-0x1234567800000000]);
    msg.setRepeatedFloatList([1.5]);
    msg.setRepeatedDoubleList([-1.5]);
    msg.setRepeatedBoolList([true]);
    msg.setRepeatedStringList(['hello world']);
    msg.setRepeatedBytesList([BYTES]);
    submsg = new proto.jspb.test.ForeignMessage();
    submsg.setC(1000);
    msg.setRepeatedForeignMessageList([submsg]);
    msg.setRepeatedForeignEnumList([proto.jspb.test.Proto3Enum.PROTO3_BAR]);

    msg.setOneofString('asdf');

    const serialized = msg.serializeBinary();
    msg = proto.jspb.test.TestProto3.deserializeBinary(serialized);

    expect(msg.getSingularInt32()).toEqual(-42);
    expect(msg.getSingularInt64()).toEqual(-0x7fffffff00000000);
    expect(msg.getSingularUint32()).toEqual(0x80000000);
    expect(msg.getSingularUint64()).toEqual(0xf000000000000000);
    expect(msg.getSingularSint32()).toEqual(-100);
    expect(msg.getSingularSint64()).toEqual(-0x8000000000000000);
    expect(msg.getSingularFixed32()).toEqual(1234);
    expect(msg.getSingularFixed64()).toEqual(0x1234567800000000);
    expect(msg.getSingularSfixed32()).toEqual(-1234);
    expect(msg.getSingularSfixed64()).toEqual(-0x1234567800000000);
    expect(msg.getSingularFloat()).toEqual(1.5);
    expect(msg.getSingularDouble()).toEqual(-1.5);
    expect(msg.getSingularBool()).toBeTrue();
    expect(msg.getSingularString()).toEqual('hello world');
    expect(bytesCompare(msg.getSingularBytes(), BYTES)).toEqual(true);
    expect(msg.getSingularForeignMessage().getC()).toEqual(16);
    expect(msg.getSingularForeignEnum())
        .toEqual(proto.jspb.test.Proto3Enum.PROTO3_BAR);

    expect(msg.getRepeatedInt32List()).toEqual([-42]);
    expect(msg.getRepeatedInt64List()).toEqual([-0x7fffffff00000000]);
    expect(msg.getRepeatedUint32List()).toEqual([0x80000000]);
    expect(msg.getRepeatedUint64List()).toEqual([0xf000000000000000]);
    expect(msg.getRepeatedSint32List()).toEqual([-100]);
    expect(msg.getRepeatedSint64List()).toEqual([-0x8000000000000000]);
    expect(msg.getRepeatedFixed32List()).toEqual([1234]);
    expect(msg.getRepeatedFixed64List()).toEqual([0x1234567800000000]);
    expect(msg.getRepeatedSfixed32List()).toEqual([-1234]);
    expect(msg.getRepeatedSfixed64List()).toEqual([-0x1234567800000000]);
    expect(msg.getRepeatedFloatList()).toEqual([1.5]);
    expect(msg.getRepeatedDoubleList()).toEqual([-1.5]);
    expect(msg.getRepeatedBoolList()).toEqual([true]);
    expect(msg.getRepeatedStringList()).toEqual(['hello world']);
    expect(msg.getRepeatedBytesList().length).toEqual(1);
    expect(true).toEqual(bytesCompare(msg.getRepeatedBytesList()[0], BYTES));
    expect(msg.getRepeatedForeignMessageList().length).toEqual(1);
    expect(msg.getRepeatedForeignMessageList()[0].getC()).toEqual(1000);
    expect(msg.getRepeatedForeignEnumList()).toEqual([
      proto.jspb.test.Proto3Enum.PROTO3_BAR
    ]);

    expect(msg.getOneofString()).toEqual('asdf');
  });


  /**
   * Test that oneofs continue to have a notion of field presence.
   */
  it('testOneofs', () => {
    // Default instance.
    const msg = new proto.jspb.test.TestProto3();
    expect(msg.getOneofUint32()).toEqual(0);
    expect(msg.getOneofForeignMessage()).toBeUndefined();
    expect(msg.getOneofString()).toEqual('');
    expect(msg.getOneofBytes()).toEqual('');

    expect(msg.hasOneofUint32()).toBeFalse();
    expect(msg.hasOneofForeignMessage()).toBeFalse();
    expect(msg.hasOneofString()).toBeFalse();
    expect(msg.hasOneofBytes()).toBeFalse();

    // Integer field.
    msg.setOneofUint32(42);
    expect(msg.getOneofUint32()).toEqual(42);
    expect(msg.getOneofForeignMessage()).toBeUndefined();
    expect(msg.getOneofString()).toEqual('');
    expect(msg.getOneofBytes()).toEqual('');

    expect(msg.hasOneofUint32()).toBeTrue();
    expect(msg.hasOneofForeignMessage()).toBeFalse();
    expect(msg.hasOneofString()).toBeFalse();
    expect(msg.hasOneofBytes()).toBeFalse();

    // Sub-message field.
    const submsg = new proto.jspb.test.ForeignMessage();
    msg.setOneofForeignMessage(submsg);
    expect(msg.getOneofUint32()).toEqual(0);
    expect(submsg).toEqual(msg.getOneofForeignMessage());
    expect(msg.getOneofString()).toEqual('');
    expect(msg.getOneofBytes()).toEqual('');

    expect(msg.hasOneofUint32()).toBeFalse();
    expect(msg.hasOneofForeignMessage()).toBeTrue();
    expect(msg.hasOneofString()).toBeFalse();
    expect(msg.hasOneofBytes()).toBeFalse();

    // String field.
    msg.setOneofString('hello');
    expect(msg.getOneofUint32()).toEqual(0);
    expect(msg.getOneofForeignMessage()).toBeUndefined();
    expect(msg.getOneofString()).toEqual('hello');
    expect(msg.getOneofBytes()).toEqual('');

    expect(msg.hasOneofUint32()).toBeFalse();
    expect(msg.hasOneofForeignMessage()).toBeFalse();
    expect(msg.hasOneofString()).toBeTrue();
    expect(msg.hasOneofBytes()).toBeFalse();

    // Bytes field.
    msg.setOneofBytes(goog.crypt.base64.encodeString('\u00FF\u00FF'));
    expect(msg.getOneofUint32()).toEqual(0);
    expect(msg.getOneofForeignMessage()).toBeUndefined();
    expect(msg.getOneofString()).toEqual('');
    expect(msg.getOneofBytes_asB64())
        .toEqual(goog.crypt.base64.encodeString('\u00FF\u00FF'));

    expect(msg.hasOneofUint32()).toBeFalse();
    expect(msg.hasOneofForeignMessage()).toBeFalse();
    expect(msg.hasOneofString()).toBeFalse();
    expect(msg.hasOneofBytes()).toBeTrue();
  });


  /**
   * Test that "default"-valued primitive fields are not emitted on the wire.
   */
  it('testNoSerializeDefaults', () => {
    const msg = new proto.jspb.test.TestProto3();

    // Set each primitive to a non-default value, then back to its default, to
    // ensure that the serialization is actually checking the value and not just
    // whether it has ever been set.
    msg.setSingularInt32(42);
    msg.setSingularInt32(0);
    msg.setSingularDouble(3.14);
    msg.setSingularDouble(0.0);
    msg.setSingularBool(true);
    msg.setSingularBool(false);
    msg.setSingularString('hello world');
    msg.setSingularString('');
    msg.setSingularBytes(goog.crypt.base64.encodeString('\u00FF\u00FF'));
    msg.setSingularBytes('');
    msg.setSingularForeignMessage(new proto.jspb.test.ForeignMessage());
    msg.setSingularForeignMessage(null);
    msg.setSingularForeignEnum(proto.jspb.test.Proto3Enum.PROTO3_BAR);
    msg.setSingularForeignEnum(proto.jspb.test.Proto3Enum.PROTO3_FOO);
    msg.setOneofUint32(32);
    msg.clearOneofUint32();


    const serialized = msg.serializeBinary();
    expect(serialized.length).toEqual(0);
  });

  /**
   * Test that base64 string and Uint8Array are interchangeable in bytes fields.
   */
  it('testBytesFieldsInterop', () => {
    let msg = new proto.jspb.test.TestProto3();
    // Set as a base64 string and check all the getters work.
    msg.setSingularBytes(BYTES_B64);
    expect(bytesCompare(msg.getSingularBytes_asU8(), BYTES)).toBeTrue();
    expect(bytesCompare(msg.getSingularBytes_asB64(), BYTES)).toBeTrue();
    expect(bytesCompare(msg.getSingularBytes(), BYTES)).toBeTrue();

    // Test binary serialize round trip doesn't break it.
    msg = proto.jspb.test.TestProto3.deserializeBinary(msg.serializeBinary());
    expect(bytesCompare(msg.getSingularBytes_asU8(), BYTES)).toBeTrue();
    expect(bytesCompare(msg.getSingularBytes_asB64(), BYTES)).toBeTrue();
    expect(bytesCompare(msg.getSingularBytes(), BYTES)).toBeTrue();

    msg = new proto.jspb.test.TestProto3();
    // Set as a Uint8Array and check all the getters work.
    msg.setSingularBytes(BYTES);
    expect(bytesCompare(msg.getSingularBytes_asU8(), BYTES)).toBeTrue();
    expect(bytesCompare(msg.getSingularBytes_asB64(), BYTES)).toBeTrue();
    expect(bytesCompare(msg.getSingularBytes(), BYTES)).toBeTrue();
  });

  it('testTimestampWellKnownType', () => {
    const msg = new proto.google.protobuf.Timestamp();
    msg.fromDate(new Date(123456789));
    expect(msg.getSeconds()).toEqual(123456);
    expect(msg.getNanos()).toEqual(789000000);
    const date = msg.toDate();
    expect(date.getTime()).toEqual(123456789);
    const anotherMsg = proto.google.protobuf.Timestamp.fromDate(date);
    expect(anotherMsg.getSeconds()).toEqual(msg.getSeconds());
    expect(anotherMsg.getNanos()).toEqual(msg.getNanos());
  });

  it('testStructWellKnownType', () => {
    const jsObj = {
      abc: 'def',
      number: 12345.678,
      nullKey: null,
      boolKey: true,
      listKey: [1, null, true, false, 'abc'],
      structKey: {foo: 'bar', somenum: 123},
      complicatedKey: [{xyz: {abc: [3, 4, null, false]}}, 'zzz']
    };

    const struct = proto.google.protobuf.Struct.fromJavaScript(jsObj);
    const jsObj2 = struct.toJavaScript();

    expect('def').toEqual(jsObj2.abc);
    expect(12345.678).toEqual(jsObj2.number);
    expect(null).toEqual(jsObj2.nullKey);
    expect(true).toEqual(jsObj2.boolKey);
    expect('abc').toEqual(jsObj2.listKey[4]);
    expect('bar').toEqual(jsObj2.structKey.foo);
    expect(4).toEqual(jsObj2.complicatedKey[0].xyz.abc[1]);
  });
});
