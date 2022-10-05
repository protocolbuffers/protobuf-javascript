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

// Test suite is written using Jasmine -- see http://jasmine.github.io/

goog.require('goog.crypt.base64');

goog.require('jspb.BinaryWriter');
goog.require('jspb.Message');

// CommonJS-LoadFromFile: ../protos/testbinary_pb proto.jspb.test
goog.require('proto.jspb.test.ExtendsWithMessage');
goog.require('proto.jspb.test.ForeignEnum');
goog.require('proto.jspb.test.ForeignMessage');
goog.require('proto.jspb.test.TestAllTypes');
goog.require('proto.jspb.test.TestExtendable');
goog.require('proto.jspb.test.extendOptionalBool');
goog.require('proto.jspb.test.extendOptionalBytes');
goog.require('proto.jspb.test.extendOptionalDouble');
goog.require('proto.jspb.test.extendOptionalFixed32');
goog.require('proto.jspb.test.extendOptionalFixed64');
goog.require('proto.jspb.test.extendOptionalFloat');
goog.require('proto.jspb.test.extendOptionalForeignEnum');
goog.require('proto.jspb.test.extendOptionalInt32');
goog.require('proto.jspb.test.extendOptionalInt64');
goog.require('proto.jspb.test.extendOptionalSfixed32');
goog.require('proto.jspb.test.extendOptionalSfixed64');
goog.require('proto.jspb.test.extendOptionalSint32');
goog.require('proto.jspb.test.extendOptionalSint64');
goog.require('proto.jspb.test.extendOptionalString');
goog.require('proto.jspb.test.extendOptionalUint32');
goog.require('proto.jspb.test.extendOptionalUint64');
goog.require('proto.jspb.test.extendPackedRepeatedBoolList');
goog.require('proto.jspb.test.extendPackedRepeatedDoubleList');
goog.require('proto.jspb.test.extendPackedRepeatedFixed32List');
goog.require('proto.jspb.test.extendPackedRepeatedFixed64List');
goog.require('proto.jspb.test.extendPackedRepeatedFloatList');
goog.require('proto.jspb.test.extendPackedRepeatedForeignEnumList');
goog.require('proto.jspb.test.extendPackedRepeatedInt32List');
goog.require('proto.jspb.test.extendPackedRepeatedInt64List');
goog.require('proto.jspb.test.extendPackedRepeatedSfixed32List');
goog.require('proto.jspb.test.extendPackedRepeatedSfixed64List');
goog.require('proto.jspb.test.extendPackedRepeatedSint32List');
goog.require('proto.jspb.test.extendPackedRepeatedSint64List');
goog.require('proto.jspb.test.extendPackedRepeatedUint32List');
goog.require('proto.jspb.test.extendPackedRepeatedUint64List');
goog.require('proto.jspb.test.extendRepeatedBoolList');
goog.require('proto.jspb.test.extendRepeatedBytesList');
goog.require('proto.jspb.test.extendRepeatedDoubleList');
goog.require('proto.jspb.test.extendRepeatedFixed32List');
goog.require('proto.jspb.test.extendRepeatedFixed64List');
goog.require('proto.jspb.test.extendRepeatedFloatList');
goog.require('proto.jspb.test.extendRepeatedForeignEnumList');
goog.require('proto.jspb.test.extendRepeatedInt32List');
goog.require('proto.jspb.test.extendRepeatedInt64List');
goog.require('proto.jspb.test.extendRepeatedSfixed32List');
goog.require('proto.jspb.test.extendRepeatedSfixed64List');
goog.require('proto.jspb.test.extendRepeatedSint32List');
goog.require('proto.jspb.test.extendRepeatedSint64List');
goog.require('proto.jspb.test.extendRepeatedStringList');
goog.require('proto.jspb.test.extendRepeatedUint32List');
goog.require('proto.jspb.test.extendRepeatedUint64List');

// clang-format off
// CommonJS-LoadFromFile: ../node_modules/google-protobuf/google/protobuf/any_pb proto.google.protobuf
goog.require('proto.google.protobuf.Any');


const suite = {};

const BYTES = new Uint8Array([1, 2, 8, 9]);

const BYTES_B64 = goog.crypt.base64.encodeByteArray(BYTES);


/**
 * Helper: fill all fields on a TestAllTypes message.
 * @param {proto.jspb.test.TestAllTypes} msg
 */
function fillAllFields(msg) {
  msg.setOptionalInt32(-42);
  // can be exactly represented by JS number (64-bit double, i.e., 52-bit
  // mantissa).
  msg.setOptionalInt64(-0x7fffffff00000000);
  msg.setOptionalUint32(0x80000000);
  msg.setOptionalUint64(0xf000000000000000);
  msg.setOptionalSint32(-100);
  msg.setOptionalSint64(-0x8000000000000000);
  msg.setOptionalFixed32(1234);
  msg.setOptionalFixed64(0x1234567800000000);
  msg.setOptionalSfixed32(-1234);
  msg.setOptionalSfixed64(-0x1234567800000000);
  msg.setOptionalFloat(1.5);
  msg.setOptionalDouble(-1.5);
  msg.setOptionalBool(true);
  msg.setOptionalString('hello world');
  msg.setOptionalBytes(BYTES);
  msg.setOptionalGroup(new proto.jspb.test.TestAllTypes.OptionalGroup());
  msg.getOptionalGroup().setA(100);
  let submsg = new proto.jspb.test.ForeignMessage();
  submsg.setC(16);
  msg.setOptionalForeignMessage(submsg);
  msg.setOptionalForeignEnum(proto.jspb.test.ForeignEnum.FOREIGN_FOO);
  msg.setOneofString('oneof');


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
  msg.setRepeatedBytesList([BYTES, BYTES]);
  msg.setRepeatedGroupList([new proto.jspb.test.TestAllTypes.RepeatedGroup()]);
  msg.getRepeatedGroupList()[0].setA(100);
  submsg = new proto.jspb.test.ForeignMessage();
  submsg.setC(1000);
  msg.setRepeatedForeignMessageList([submsg]);
  msg.setRepeatedForeignEnumList([proto.jspb.test.ForeignEnum.FOREIGN_FOO]);

  msg.setPackedRepeatedInt32List([-42]);
  msg.setPackedRepeatedInt64List([-0x7fffffff00000000]);
  msg.setPackedRepeatedUint32List([0x80000000]);
  msg.setPackedRepeatedUint64List([0xf000000000000000]);
  msg.setPackedRepeatedSint32List([-100]);
  msg.setPackedRepeatedSint64List([-0x8000000000000000]);
  msg.setPackedRepeatedFixed32List([1234]);
  msg.setPackedRepeatedFixed64List([0x1234567800000000]);
  msg.setPackedRepeatedSfixed32List([-1234]);
  msg.setPackedRepeatedSfixed64List([-0x1234567800000000]);
  msg.setPackedRepeatedFloatList([1.5]);
  msg.setPackedRepeatedDoubleList([-1.5]);
  msg.setPackedRepeatedBoolList([true]);
}


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


/**
 * Helper: verify contents of given TestAllTypes message as set by
 * fillAllFields().
 * @param {proto.jspb.test.TestAllTypes} original
 * @param {proto.jspb.test.TestAllTypes} copy
 */
function checkAllFields(original, copy) {
  expect(copy.getOptionalInt32()).toEqual(-42);
  expect(copy.getOptionalInt64()).toEqual(-0x7fffffff00000000);
  expect(copy.getOptionalUint32()).toEqual(0x80000000);
  expect(copy.getOptionalUint64()).toEqual(0xf000000000000000);
  expect(copy.getOptionalSint32()).toEqual(-100);
  expect(copy.getOptionalSint64()).toEqual(-0x8000000000000000);
  expect(copy.getOptionalFixed32()).toEqual(1234);
  expect(copy.getOptionalFixed64()).toEqual(0x1234567800000000);
  expect(copy.getOptionalSfixed32()).toEqual(-1234);
  expect(copy.getOptionalSfixed64()).toEqual(-0x1234567800000000);
  expect(copy.getOptionalFloat()).toEqual(1.5);
  expect(copy.getOptionalDouble()).toEqual(-1.5);
  expect(copy.getOptionalBool()).toBeTrue();
  expect(copy.getOptionalString()).toEqual('hello world');
  expect(bytesCompare(copy.getOptionalBytes(), BYTES)).toEqual(true);
  expect(true).toEqual(bytesCompare(copy.getOptionalBytes_asU8(), BYTES));
  expect(copy.getOptionalBytes_asB64())
      .toEqual(goog.crypt.base64.encodeByteArray(BYTES));

  expect(copy.getOptionalGroup().getA()).toEqual(100);
  expect(copy.getOptionalForeignMessage().getC()).toEqual(16);
  expect(proto.jspb.test.ForeignEnum.FOREIGN_FOO)
      .toEqual(copy.getOptionalForeignEnum());


  expect(copy.getOneofString()).toEqual('oneof');
  expect(proto.jspb.test.TestAllTypes.OneofFieldCase.ONEOF_STRING)
      .toEqual(copy.getOneofFieldCase());

  expect(copy.getRepeatedInt32List()).toEqual([-42]);
  expect(copy.getRepeatedInt64List()).toEqual([-0x7fffffff00000000]);
  expect(copy.getRepeatedUint32List()).toEqual([0x80000000]);
  expect(copy.getRepeatedUint64List()).toEqual([0xf000000000000000]);
  expect(copy.getRepeatedSint32List()).toEqual([-100]);
  expect(copy.getRepeatedSint64List()).toEqual([-0x8000000000000000]);
  expect(copy.getRepeatedFixed32List()).toEqual([1234]);
  expect(copy.getRepeatedFixed64List()).toEqual([0x1234567800000000]);
  expect(copy.getRepeatedSfixed32List()).toEqual([-1234]);
  expect(copy.getRepeatedSfixed64List()).toEqual([-0x1234567800000000]);
  expect(copy.getRepeatedFloatList()).toEqual([1.5]);
  expect(copy.getRepeatedDoubleList()).toEqual([-1.5]);
  expect(copy.getRepeatedBoolList()).toEqual([true]);
  expect(copy.getRepeatedStringList()).toEqual(['hello world']);
  expect(copy.getRepeatedBytesList().length).toEqual(2);
  expect(true).toEqual(
      bytesCompare(copy.getRepeatedBytesList_asU8()[0], BYTES));
  expect(true).toEqual(bytesCompare(copy.getRepeatedBytesList()[0], BYTES));
  expect(true).toEqual(
      bytesCompare(copy.getRepeatedBytesList_asU8()[1], BYTES));
  expect(copy.getRepeatedBytesList_asB64()[0]).toEqual(BYTES_B64);
  expect(copy.getRepeatedBytesList_asB64()[1]).toEqual(BYTES_B64);
  expect(copy.getRepeatedGroupList().length).toEqual(1);
  expect(copy.getRepeatedGroupList()[0].getA()).toEqual(100);
  expect(copy.getRepeatedForeignMessageList().length).toEqual(1);
  expect(copy.getRepeatedForeignMessageList()[0].getC()).toEqual(1000);
  expect([
    proto.jspb.test.ForeignEnum.FOREIGN_FOO
  ]).toEqual(copy.getRepeatedForeignEnumList());

  expect(copy.getPackedRepeatedInt32List()).toEqual([-42]);
  expect(copy.getPackedRepeatedInt64List()).toEqual([-0x7fffffff00000000]);
  expect(copy.getPackedRepeatedUint32List()).toEqual([0x80000000]);
  expect(copy.getPackedRepeatedUint64List()).toEqual([0xf000000000000000]);
  expect(copy.getPackedRepeatedSint32List()).toEqual([-100]);
  expect(copy.getPackedRepeatedSint64List()).toEqual([-0x8000000000000000]);
  expect(copy.getPackedRepeatedFixed32List()).toEqual([1234]);
  expect(copy.getPackedRepeatedFixed64List()).toEqual([0x1234567800000000]);
  expect(copy.getPackedRepeatedSfixed32List()).toEqual([-1234]);
  expect(copy.getPackedRepeatedSfixed64List()).toEqual([-0x1234567800000000]);
  expect(copy.getPackedRepeatedFloatList()).toEqual([1.5]);
  expect(copy.getPackedRepeatedDoubleList()).toEqual([-1.5]);


  // Check last so we get more granular errors first.
  expect(jspb.Message.equals(original, copy)).toBeTrue();
}


/**
 * Helper: verify that all expected extensions are present.
 * @param {!proto.jspb.test.TestExtendable} msg
 */
function checkExtensions(msg) {
  expect(0).toEqual(msg.getExtension(proto.jspb.test.extendOptionalInt32));
  expect(-0x7fffffff00000000)
      .toEqual(msg.getExtension(proto.jspb.test.extendOptionalInt64));
  expect(0x80000000)
      .toEqual(msg.getExtension(proto.jspb.test.extendOptionalUint32));
  expect(0xf000000000000000)
      .toEqual(msg.getExtension(proto.jspb.test.extendOptionalUint64));
  expect(-100).toEqual(msg.getExtension(proto.jspb.test.extendOptionalSint32));
  expect(-0x8000000000000000)
      .toEqual(msg.getExtension(proto.jspb.test.extendOptionalSint64));
  expect(1234).toEqual(msg.getExtension(proto.jspb.test.extendOptionalFixed32));
  expect(0x1234567800000000)
      .toEqual(msg.getExtension(proto.jspb.test.extendOptionalFixed64));
  expect(-1234).toEqual(
      msg.getExtension(proto.jspb.test.extendOptionalSfixed32));
  expect(-0x1234567800000000)
      .toEqual(msg.getExtension(proto.jspb.test.extendOptionalSfixed64));
  expect(msg.getExtension(proto.jspb.test.extendOptionalFloat)).toEqual(1.5);
  expect(msg.getExtension(proto.jspb.test.extendOptionalDouble)).toEqual(-1.5);
  expect(msg.getExtension(proto.jspb.test.extendOptionalBool)).toEqual(true);
  expect(msg.getExtension(proto.jspb.test.extendOptionalString))
      .toEqual('hello world');
  expect(bytesCompare(
             msg.getExtension(proto.jspb.test.extendOptionalBytes), BYTES))
      .toEqual(true);
  expect(msg.getExtension(proto.jspb.test.ExtendsWithMessage.optionalExtension)
             .getFoo())
      .toEqual(16);


  expect(msg.getExtension(proto.jspb.test.extendRepeatedInt32List)).toEqual([
    -42
  ]);
  expect(msg.getExtension(proto.jspb.test.extendRepeatedInt64List)).toEqual([
    -0x7fffffff00000000
  ]);
  expect(msg.getExtension(proto.jspb.test.extendRepeatedUint32List)).toEqual([
    0x80000000
  ]);
  expect(msg.getExtension(proto.jspb.test.extendRepeatedUint64List)).toEqual([
    0xf000000000000000
  ]);
  expect(msg.getExtension(proto.jspb.test.extendRepeatedSint32List)).toEqual([
    -100
  ]);
  expect(msg.getExtension(proto.jspb.test.extendRepeatedSint64List)).toEqual([
    -0x8000000000000000
  ]);
  expect(msg.getExtension(proto.jspb.test.extendRepeatedFixed32List)).toEqual([
    1234
  ]);
  expect(msg.getExtension(proto.jspb.test.extendRepeatedFixed64List)).toEqual([
    0x1234567800000000
  ]);
  expect(msg.getExtension(proto.jspb.test.extendRepeatedSfixed32List)).toEqual([
    -1234
  ]);
  expect(msg.getExtension(proto.jspb.test.extendRepeatedSfixed64List)).toEqual([
    -0x1234567800000000
  ]);
  expect(msg.getExtension(proto.jspb.test.extendRepeatedFloatList)).toEqual([
    1.5
  ]);
  expect(msg.getExtension(proto.jspb.test.extendRepeatedDoubleList)).toEqual([
    -1.5
  ]);
  expect(msg.getExtension(proto.jspb.test.extendRepeatedBoolList)).toEqual([
    true
  ]);
  expect(msg.getExtension(proto.jspb.test.extendRepeatedStringList)).toEqual([
    'hello world'
  ]);
  expect(true).toEqual(bytesCompare(
      msg.getExtension(proto.jspb.test.extendRepeatedBytesList)[0], BYTES));
  expect(1000).toEqual(
      msg.getExtension(
             proto.jspb.test.ExtendsWithMessage.repeatedExtensionList)[0]
          .getFoo());
  expect([
    proto.jspb.test.ForeignEnum.FOREIGN_FOO
  ]).toEqual(msg.getExtension(proto.jspb.test.extendRepeatedForeignEnumList));


  expect(msg.getExtension(proto.jspb.test.extendPackedRepeatedInt32List))
      .toEqual([-42]);
  expect(msg.getExtension(proto.jspb.test.extendPackedRepeatedInt64List))
      .toEqual([-0x7fffffff00000000]);
  expect(msg.getExtension(proto.jspb.test.extendPackedRepeatedUint32List))
      .toEqual([0x80000000]);
  expect(msg.getExtension(proto.jspb.test.extendPackedRepeatedUint64List))
      .toEqual([0xf000000000000000]);
  expect(msg.getExtension(proto.jspb.test.extendPackedRepeatedSint32List))
      .toEqual([-100]);
  expect(msg.getExtension(proto.jspb.test.extendPackedRepeatedSint64List))
      .toEqual([-0x8000000000000000]);
  expect(msg.getExtension(proto.jspb.test.extendPackedRepeatedFixed32List))
      .toEqual([1234]);
  expect(msg.getExtension(proto.jspb.test.extendPackedRepeatedFixed64List))
      .toEqual([0x1234567800000000]);
  expect(msg.getExtension(proto.jspb.test.extendPackedRepeatedSfixed32List))
      .toEqual([-1234]);
  expect(msg.getExtension(proto.jspb.test.extendPackedRepeatedSfixed64List))
      .toEqual([-0x1234567800000000]);
  expect(msg.getExtension(proto.jspb.test.extendPackedRepeatedFloatList))
      .toEqual([1.5]);
  expect(msg.getExtension(proto.jspb.test.extendPackedRepeatedDoubleList))
      .toEqual([-1.5]);
  expect(msg.getExtension(proto.jspb.test.extendPackedRepeatedBoolList))
      .toEqual([true]);
  expect([proto.jspb.test.ForeignEnum.FOREIGN_FOO])
      .toEqual(msg.getExtension(
          proto.jspb.test.extendPackedRepeatedForeignEnumList));
}


describe('protoBinaryTest', function() {
  /**
   * Tests a basic serialization-deserializaton round-trip with all supported
   * field types (on the TestAllTypes message type).
   */
  it('testRoundTrip', function() {
    const msg = new proto.jspb.test.TestAllTypes();
    fillAllFields(msg);
    const encoded = msg.serializeBinary();
    const decoded = proto.jspb.test.TestAllTypes.deserializeBinary(encoded);
    checkAllFields(msg, decoded);
  });

  /**
   * Test that base64 string and Uint8Array are interchangeable in bytes fields.
   */
  it('testBytesFieldsGettersInterop', function() {
    let msg = new proto.jspb.test.TestAllTypes();
    // Set from a base64 string and check all the getters work.
    msg.setOptionalBytes(BYTES_B64);
    expect(bytesCompare(msg.getOptionalBytes_asU8(), BYTES)).toBeTrue();
    expect(bytesCompare(msg.getOptionalBytes_asB64(), BYTES)).toBeTrue();
    expect(bytesCompare(msg.getOptionalBytes(), BYTES)).toBeTrue();

    // Test binary serialize round trip doesn't break it.
    msg = proto.jspb.test.TestAllTypes.deserializeBinary(msg.serializeBinary());
    expect(bytesCompare(msg.getOptionalBytes_asU8(), BYTES)).toBeTrue();
    expect(bytesCompare(msg.getOptionalBytes_asB64(), BYTES)).toBeTrue();
    expect(bytesCompare(msg.getOptionalBytes(), BYTES)).toBeTrue();

    msg = new proto.jspb.test.TestAllTypes();
    // Set from a Uint8Array and check all the getters work.
    msg.setOptionalBytes(BYTES);
    expect(bytesCompare(msg.getOptionalBytes_asU8(), BYTES)).toBeTrue();
    expect(bytesCompare(msg.getOptionalBytes_asB64(), BYTES)).toBeTrue();
    expect(bytesCompare(msg.getOptionalBytes(), BYTES)).toBeTrue();
  });

  /**
   * Test that bytes setters will receive result of any of the getters.
   */
  it('testBytesFieldsSettersInterop', function() {
    const msg = new proto.jspb.test.TestAllTypes();
    msg.setOptionalBytes(BYTES);
    expect(bytesCompare(msg.getOptionalBytes(), BYTES)).toBeTrue();

    msg.setOptionalBytes(msg.getOptionalBytes());
    expect(bytesCompare(msg.getOptionalBytes(), BYTES)).toBeTrue();
    msg.setOptionalBytes(msg.getOptionalBytes_asB64());
    expect(bytesCompare(msg.getOptionalBytes(), BYTES)).toBeTrue();
    msg.setOptionalBytes(msg.getOptionalBytes_asU8());
    expect(bytesCompare(msg.getOptionalBytes(), BYTES)).toBeTrue();
  });

  /**
   * Test that bytes setters will receive result of any of the getters.
   */
  it('testRepeatedBytesGetters', function() {
    const msg = new proto.jspb.test.TestAllTypes();

    function assertGetters() {
      expect(typeof msg.getRepeatedBytesList_asB64()[0]).toEqual('string');
      expect(typeof msg.getRepeatedBytesList_asB64()[1]).toEqual('string');
      expect(msg.getRepeatedBytesList_asU8()[0] instanceof Uint8Array)
          .toBeTrue();
      expect(msg.getRepeatedBytesList_asU8()[1] instanceof Uint8Array)
          .toBeTrue();

      expect(bytesCompare(msg.getRepeatedBytesList()[0], BYTES)).toBeTrue();
      expect(bytesCompare(msg.getRepeatedBytesList()[1], BYTES)).toBeTrue();
      expect(bytesCompare(msg.getRepeatedBytesList_asB64()[0], BYTES))
          .toBeTrue();
      expect(bytesCompare(msg.getRepeatedBytesList_asB64()[1], BYTES))
          .toBeTrue();
      expect(bytesCompare(msg.getRepeatedBytesList_asU8()[0], BYTES))
          .toBeTrue();
      expect(bytesCompare(msg.getRepeatedBytesList_asU8()[1], BYTES))
          .toBeTrue();
    }
    msg.setRepeatedBytesList([BYTES, BYTES]);
    assertGetters();

    msg.setRepeatedBytesList([BYTES_B64, BYTES_B64]);
    assertGetters();

    msg.setRepeatedBytesList([]);
    expect(msg.getRepeatedBytesList().length).toEqual(0);
    expect(0).toEqual(msg.getRepeatedBytesList_asB64().length);
    expect(0).toEqual(msg.getRepeatedBytesList_asU8().length);
  });

  /**
   * Helper: fill all extension values.
   * @param {proto.jspb.test.TestExtendable} msg
   */
  function fillExtensions(msg) {
    msg.setExtension(proto.jspb.test.extendOptionalInt32, 0);
    msg.setExtension(proto.jspb.test.extendOptionalInt64, -0x7fffffff00000000);
    msg.setExtension(proto.jspb.test.extendOptionalUint32, 0x80000000);
    msg.setExtension(proto.jspb.test.extendOptionalUint64, 0xf000000000000000);
    msg.setExtension(proto.jspb.test.extendOptionalSint32, -100);
    msg.setExtension(proto.jspb.test.extendOptionalSint64, -0x8000000000000000);
    msg.setExtension(proto.jspb.test.extendOptionalFixed32, 1234);
    msg.setExtension(proto.jspb.test.extendOptionalFixed64, 0x1234567800000000);
    msg.setExtension(proto.jspb.test.extendOptionalSfixed32, -1234);
    msg.setExtension(
        proto.jspb.test.extendOptionalSfixed64, -0x1234567800000000);
    msg.setExtension(proto.jspb.test.extendOptionalFloat, 1.5);
    msg.setExtension(proto.jspb.test.extendOptionalDouble, -1.5);
    msg.setExtension(proto.jspb.test.extendOptionalBool, true);
    msg.setExtension(proto.jspb.test.extendOptionalString, 'hello world');
    msg.setExtension(proto.jspb.test.extendOptionalBytes, BYTES);
    let submsg = new proto.jspb.test.ExtendsWithMessage();
    submsg.setFoo(16);
    msg.setExtension(
        proto.jspb.test.ExtendsWithMessage.optionalExtension, submsg);
    msg.setExtension(
        proto.jspb.test.extendOptionalForeignEnum,
        proto.jspb.test.ForeignEnum.FOREIGN_FOO);


    msg.setExtension(proto.jspb.test.extendRepeatedInt32List, [-42]);
    msg.setExtension(
        proto.jspb.test.extendRepeatedInt64List, [-0x7fffffff00000000]);
    msg.setExtension(proto.jspb.test.extendRepeatedUint32List, [0x80000000]);
    msg.setExtension(
        proto.jspb.test.extendRepeatedUint64List, [0xf000000000000000]);
    msg.setExtension(proto.jspb.test.extendRepeatedSint32List, [-100]);
    msg.setExtension(
        proto.jspb.test.extendRepeatedSint64List, [-0x8000000000000000]);
    msg.setExtension(proto.jspb.test.extendRepeatedFixed32List, [1234]);
    msg.setExtension(
        proto.jspb.test.extendRepeatedFixed64List, [0x1234567800000000]);
    msg.setExtension(proto.jspb.test.extendRepeatedSfixed32List, [-1234]);
    msg.setExtension(
        proto.jspb.test.extendRepeatedSfixed64List, [-0x1234567800000000]);
    msg.setExtension(proto.jspb.test.extendRepeatedFloatList, [1.5]);
    msg.setExtension(proto.jspb.test.extendRepeatedDoubleList, [-1.5]);
    msg.setExtension(proto.jspb.test.extendRepeatedBoolList, [true]);
    msg.setExtension(proto.jspb.test.extendRepeatedStringList, ['hello world']);
    msg.setExtension(proto.jspb.test.extendRepeatedBytesList, [BYTES]);
    submsg = new proto.jspb.test.ExtendsWithMessage();
    submsg.setFoo(1000);
    msg.setExtension(
        proto.jspb.test.ExtendsWithMessage.repeatedExtensionList, [submsg]);
    msg.setExtension(
        proto.jspb.test.extendRepeatedForeignEnumList,
        [proto.jspb.test.ForeignEnum.FOREIGN_FOO]);


    msg.setExtension(proto.jspb.test.extendPackedRepeatedInt32List, [-42]);
    msg.setExtension(
        proto.jspb.test.extendPackedRepeatedInt64List, [-0x7fffffff00000000]);
    msg.setExtension(
        proto.jspb.test.extendPackedRepeatedUint32List, [0x80000000]);
    msg.setExtension(
        proto.jspb.test.extendPackedRepeatedUint64List, [0xf000000000000000]);
    msg.setExtension(proto.jspb.test.extendPackedRepeatedSint32List, [-100]);
    msg.setExtension(
        proto.jspb.test.extendPackedRepeatedSint64List, [-0x8000000000000000]);
    msg.setExtension(proto.jspb.test.extendPackedRepeatedFixed32List, [1234]);
    msg.setExtension(
        proto.jspb.test.extendPackedRepeatedFixed64List, [0x1234567800000000]);
    msg.setExtension(proto.jspb.test.extendPackedRepeatedSfixed32List, [-1234]);
    msg.setExtension(
        proto.jspb.test.extendPackedRepeatedSfixed64List,
        [-0x1234567800000000]);
    msg.setExtension(proto.jspb.test.extendPackedRepeatedFloatList, [1.5]);
    msg.setExtension(proto.jspb.test.extendPackedRepeatedDoubleList, [-1.5]);
    msg.setExtension(proto.jspb.test.extendPackedRepeatedBoolList, [true]);
    msg.setExtension(
        proto.jspb.test.extendPackedRepeatedForeignEnumList,
        [proto.jspb.test.ForeignEnum.FOREIGN_FOO]);
  }


  /**
   * Tests extension serialization and deserialization.
   */
  it('testExtensions', function() {
    const msg = new proto.jspb.test.TestExtendable();
    fillExtensions(msg);
    const encoded = msg.serializeBinary();
    const decoded = proto.jspb.test.TestExtendable.deserializeBinary(encoded);
    checkExtensions(decoded);
  });

  /**
   * Tests that unknown extensions don't cause deserialization failure.
   */
  it('testUnknownExtension', function() {
    const msg = new proto.jspb.test.TestExtendable();
    fillExtensions(msg);
    const writer = new jspb.BinaryWriter();
    writer.writeBool((1 << 29) - 1, true);
    proto.jspb.test.TestExtendable.serializeBinaryToWriter(msg, writer);
    const encoded = writer.getResultBuffer();
    const decoded = proto.jspb.test.TestExtendable.deserializeBinary(encoded);
    checkExtensions(decoded);
  });

  it('testAnyWellKnownType', function() {
    const any = new proto.google.protobuf.Any();
    const msg = new proto.jspb.test.TestAllTypes();

    fillAllFields(msg);

    any.pack(msg.serializeBinary(), 'jspb.test.TestAllTypes');

    expect(any.getTypeUrl())
        .toEqual('type.googleapis.com/jspb.test.TestAllTypes');

    const msg2 = any.unpack(
        proto.jspb.test.TestAllTypes.deserializeBinary,
        'jspb.test.TestAllTypes');

    checkAllFields(msg, msg2);
  });
});
