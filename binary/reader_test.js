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
 * @fileoverview Test cases for jspb's binary protocol buffer reader.
 *
 * There are two particular magic numbers that need to be pointed out -
 * 2^64-1025 is the largest number representable as both a double and an
 * unsigned 64-bit integer, and 2^63-513 is the largest number representable as
 * both a double and a signed 64-bit integer.
 *
 * Test suite is written using Jasmine -- see http://jasmine.github.io/
 *
 * @author aappleby@google.com (Austin Appleby)
 */

goog.require('jspb.BinaryConstants');
goog.require('jspb.binary.decoder');
goog.require('jspb.binary.encoder');
goog.require('jspb.BinaryReader');
goog.require('jspb.BinaryWriter');
goog.require('jspb.utils');

const BinaryConstants = goog.module.get('jspb.BinaryConstants');
const BinaryMessage = BinaryConstants.BinaryMessage;
const BinaryDecoder = goog.module.get('jspb.binary.decoder').BinaryDecoder;
const BinaryEncoder = goog.module.get('jspb.binary.encoder').BinaryEncoder;
const BinaryReader = goog.module.get('jspb.BinaryReader');
const BinaryWriter = goog.module.get('jspb.BinaryWriter');
const makeTag = goog.module.get('jspb.utils').makeTag;
const sliceUint8Array = goog.module.get('jspb.utils').sliceUint8Array;

const test64BitIntSignedData = [
  '-9223372036854775808',
  '-4611686018427387904',
  4294967296,
  -2147483648,
  -1,
  0,
  1,
  2147483648,
  4294967296,
  '4611686018427387904',
  '9223372036854775807',
];

const test64BitIntUnsignedData = [
  0,
  1,
  2147483648,
  4294967296,
  '4611686018427387904',
  '9223372036854775808',
  '18446744073709551615',
];

/**
 * @param {number|string|bigint} x
 * @returns number
 */
function asNumberOrString(x) {
  const num = Number(x);
  return Number.isSafeInteger(num) ? num : (/** @type{number} */(String(x)));
}

function doTest64BitIntField(
    /** function(this:!BinaryReader): number */ readField,
  /** function(this:!BinaryWriter, number, number) */writeField,
  /** ReadonlyArray<number|string> */testData,
) {
  const writer = new BinaryWriter();

  const inputValues = [];

  for (const cursor of testData) {
    writeField.call(writer, 1, /** @type{number}*/(cursor));
    inputValues.push({
      fieldNumber: 1,
      value: cursor,
    });
  }

  const reader = BinaryReader.alloc(writer.getResultBuffer());

  for (let i = 0; i < inputValues.length; i++) {
    const expected = inputValues[i];
    reader.nextField();
    expect(reader.getFieldNumber()).toBe(expected.fieldNumber);
    expect(readField.call(reader)).toBe(/** @type{number}*/(expected.value));
  }
}

function doTestSigned64BitIntField(
  /** function(this:!BinaryReader): number */ readField,
  /** function(this:!BinaryWriter, number, number) */writeField
) {
  doTest64BitIntField(readField, writeField, test64BitIntSignedData);

  // Encoding values outside should truncate.
  const outOfRangeData = ['-36893488147419103230', '36893488147419103230'];
  const writer = new BinaryWriter();

  for (const value of outOfRangeData) {
    writeField.call(writer, 1, /** @type{number} */(value));
  }

  const reader = BinaryReader.alloc(writer.getResultBuffer());
  for (const value of outOfRangeData) {
    reader.nextField();
    expect(reader.getFieldNumber()).toBe(1);
    expect(readField.call(reader)).toBe(
      asNumberOrString(BigInt.asIntN(64, BigInt(value)).toString()),
    );
  }
}

function doTestUnsigned64BitIntField(
  /** function(this:!BinaryReader): number */ readField,
  /** function(this:!BinaryWriter, number, number) */writeField
) {
  doTest64BitIntField(readField, writeField, test64BitIntUnsignedData);

  // Out of range numbers should assert.
  const pastLowerLimit = -1;
  const writer = new BinaryWriter();
  expect(() => void writeField.call(writer, 1, pastLowerLimit)).toThrow();

  // Out of range strings should truncate.
  const pastUpperLimit = '36893488147419103230';
  writeField.call(writer, 1, /** @type{number} */(pastUpperLimit));

  const reader = BinaryReader.alloc(writer.getResultBuffer());
  reader.nextField();
  expect(reader.getFieldNumber()).toBe(1);
  expect(readField.call(reader)).toBe(
    asNumberOrString(BigInt.asUintN(64, BigInt(pastUpperLimit)).toString()),
  );
}

describe('binaryReaderTest', () => {
  /** Tests the reader instance cache. */
  it('testInstanceCaches', () => {
    const writer = new BinaryWriter();
    const dummyMessage = /** @type {!BinaryMessage} */ ({});
    writer.writeMessage(1, dummyMessage, () => { });
    writer.writeMessage(2, dummyMessage, () => { });

    const buffer = writer.getResultBuffer();

    // Empty the instance caches.
    BinaryReader.resetInstanceCache();

    // Allocating and then freeing three decoders should leave us with three in
    // the cache.

    const decoder1 = BinaryDecoder.alloc();
    const decoder2 = BinaryDecoder.alloc();
    const decoder3 = BinaryDecoder.alloc();
    decoder1.free();
    decoder2.free();
    decoder3.free();

    expect(BinaryDecoder.getInstanceCache().length).toEqual(3);
    expect(BinaryReader.getInstanceCache().length).toEqual(0);

    // Allocating and then freeing a reader should remove one decoder from its
    // cache, but it should stay stuck to the reader afterwards since we can't
    // have a reader without a decoder.
    BinaryReader.alloc().free();

    expect(BinaryDecoder.getInstanceCache().length).toEqual(2);
    expect(BinaryReader.getInstanceCache().length).toEqual(1);

    // Allocating a reader should remove a reader from the cache.
    const reader = BinaryReader.alloc(buffer);

    expect(BinaryDecoder.getInstanceCache().length).toEqual(2);
    expect(BinaryReader.getInstanceCache().length).toEqual(0);

    // Processing the message reuses the current reader.
    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(1);
    reader.readMessage(dummyMessage, () => {
      expect(BinaryReader.getInstanceCache().length).toEqual(0);
    });

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(2);
    reader.readMessage(dummyMessage, () => {
      expect(BinaryReader.getInstanceCache().length).toEqual(0);
    });

    expect(reader.nextField()).toEqual(false);

    expect(BinaryDecoder.getInstanceCache().length).toEqual(2);
    expect(BinaryReader.getInstanceCache().length).toEqual(0);

    // Freeing the reader should put it back into the cache.
    reader.free();

    expect(BinaryDecoder.getInstanceCache().length).toEqual(2);
    expect(BinaryReader.getInstanceCache().length).toEqual(1);
  });

  /**
   * @param {number} x
   * @return {number}
   */
  function truncate(x) {
    const temp = new Float32Array(1);
    temp[0] = x;
    return temp[0];
  }

  /** Verifies that misuse of the reader class triggers assertions. */
  it('testReadErrors', /** @suppress {checkTypes|visibility} */() => {
    // Calling readMessage on a non-delimited field should trigger an
    // assertion.
    let reader = BinaryReader.alloc([8, 1]);
    const dummyMessage = /** @type {!BinaryMessage} */ ({});
    reader.nextField();
    expect(() => {
      reader.readMessage(dummyMessage, goog.nullFunction);
    }).toThrowError();

    // Reading past the end of the stream should trigger an assertion.
    reader = BinaryReader.alloc([9, 1]);
    reader.nextField();
    expect(() => reader.readFixed64()).toThrowError();

    // Reading past the end of a submessage should trigger an assertion.
    reader = BinaryReader.alloc([10, 4, 13, 1, 1, 1]);
    reader.nextField();
    expect(() => {
      reader.readMessage(dummyMessage, () => {
        reader.nextField();
        expect(() => reader.readFixed32())
          .toThrowError('Tried to read past the end of the data 7 > 6');
      });
    })
      .toThrowError(
        'Message parsing ended unexpectedly. Expected to read 4 bytes, instead read 5 bytes, either the data ended unexpectedly or the message misreported its own length');

    // Skipping an invalid field should trigger an assertion.
    reader = BinaryReader.alloc([12, 1]);
    reader.nextWireType_ = 1000;
    expect(() => reader.skipField()).toThrowError();

    // Reading fields with the wrong wire type should assert.
    reader = BinaryReader.alloc([9, 0, 0, 0, 0, 0, 0, 0, 0]);
    reader.nextField();
    expect(() => reader.readInt32()).toThrowError();
    expect(() => reader.readInt32String()).toThrowError();
    expect(() => reader.readInt64()).toThrowError();
    expect(() => reader.readInt64String()).toThrowError();
    expect(() => reader.readUint32()).toThrowError();
    expect(() => reader.readUint32String()).toThrowError();
    expect(() => reader.readUint64()).toThrowError();
    expect(() => reader.readUint64String()).toThrowError();
    expect(() => reader.readSint32()).toThrowError();
    expect(() => reader.readBool()).toThrowError();
    expect(() => reader.readEnum()).toThrowError();

    reader = BinaryReader.alloc([8, 1]);
    reader.nextField();
    expect(() => reader.readFixed32()).toThrowError();
    expect(() => reader.readFixed64()).toThrowError();
    expect(() => reader.readSfixed32()).toThrowError();
    expect(() => reader.readSfixed64()).toThrowError();
    expect(() => reader.readFloat()).toThrowError();
    expect(() => reader.readDouble()).toThrowError();

    expect(() => reader.readString()).toThrowError();
    expect(() => reader.readBytes()).toThrowError();
  });

  /**
   * Tests encoding and decoding of unsigned field types.
   * @param {!Function} readField
   * @param {!Function} writeField
   * @param {number} epsilon
   * @param {number} upperLimit
   * @param {!Function} filter
   * @private @suppress {missingProperties}
   */
  const doTestUnsignedField =
    (readField, writeField, epsilon, upperLimit, filter) => {
      expect(readField).not.toBeNull();
      expect(writeField).not.toBeNull();

      const writer = new BinaryWriter();

      // Encode zero and limits.
      writeField.call(writer, 1, filter(0));
      writeField.call(writer, 2, filter(epsilon));
      writeField.call(writer, 3, filter(upperLimit));

      // Encode positive values.
      for (let cursor = epsilon; cursor < upperLimit; cursor *= 1.1) {
        writeField.call(writer, 4, filter(cursor));
      }

      const reader = BinaryReader.alloc(writer.getResultBuffer());

      // Check zero and limits.
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(1);
      expect(readField.call(reader)).toEqual(filter(0));

      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(2);
      expect(readField.call(reader)).toEqual(filter(epsilon));

      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(3);
      expect(readField.call(reader)).toEqual(filter(upperLimit));

      // Check positive values.
      for (let cursor = epsilon; cursor < upperLimit; cursor *= 1.1) {
        reader.nextField();
        if (4 != reader.getFieldNumber()) throw 'fail!';
        if (filter(cursor) != readField.call(reader)) throw 'fail!';
      }
    };

  /**
   * Tests encoding and decoding of signed field types.
   * @param {!Function} readField
   * @param {!Function} writeField
   * @param {number} epsilon
   * @param {number} lowerLimit
   * @param {number} upperLimit
   * @param {!Function} filter
   * @private @suppress {missingProperties}
   */
  const doTestSignedField =
    (readField, writeField, epsilon, lowerLimit, upperLimit, filter) => {
      const writer = new BinaryWriter();

      // Encode zero and limits.
      writeField.call(writer, 1, filter(lowerLimit));
      writeField.call(writer, 2, filter(-epsilon));
      writeField.call(writer, 3, filter(0));
      writeField.call(writer, 4, filter(epsilon));
      writeField.call(writer, 5, filter(upperLimit));

      const inputValues = [];

      // Encode negative values.
      for (let cursor = lowerLimit; cursor < -epsilon; cursor /= 1.1) {
        const val = filter(cursor);
        writeField.call(writer, 6, val);
        inputValues.push({
          fieldNumber: 6,
          value: val,
        });
      }

      // Encode positive values.
      for (let cursor = epsilon; cursor < upperLimit; cursor *= 1.1) {
        const val = filter(cursor);
        writeField.call(writer, 7, val);
        inputValues.push({
          fieldNumber: 7,
          value: val,
        });
      }

      const reader = BinaryReader.alloc(writer.getResultBuffer());

      // Check zero and limits.
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(1);
      expect(readField.call(reader)).toEqual(filter(lowerLimit));

      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(2);
      expect(readField.call(reader)).toEqual(filter(-epsilon));

      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(3);
      expect(readField.call(reader)).toEqual(filter(0));

      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(4);
      expect(readField.call(reader)).toEqual(filter(epsilon));

      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(5);
      expect(readField.call(reader)).toEqual(filter(upperLimit));

      for (let i = 0; i < inputValues.length; i++) {
        const expected = inputValues[i];
        reader.nextField();
        expect(reader.getFieldNumber()).toEqual(expected.fieldNumber);
        expect(readField.call(reader)).toEqual(expected.value);
      }
    };

  /** Tests fields that use varint encoding. */
  it('testVarintFields', () => {
    expect(BinaryReader.prototype.readUint32).toBeDefined();
    expect(BinaryWriter.prototype.writeUint32).toBeDefined();
    expect(BinaryReader.prototype.readUint64).toBeDefined();
    expect(BinaryWriter.prototype.writeUint64).toBeDefined();
    expect(BinaryReader.prototype.readBool).toBeDefined();
    expect(BinaryWriter.prototype.writeBool).toBeDefined();
    doTestUnsignedField(
      BinaryReader.prototype.readUint32, BinaryWriter.prototype.writeUint32,
      1, Math.pow(2, 32) - 1, Math.round);

    doTestUnsigned64BitIntField(
      BinaryReader.prototype.readUint64, BinaryWriter.prototype.writeUint64);

    doTestSignedField(
      BinaryReader.prototype.readInt32, BinaryWriter.prototype.writeInt32, 1,
      -Math.pow(2, 31), Math.pow(2, 31) - 1, Math.round);

    doTestSigned64BitIntField(BinaryReader.prototype.readInt64, BinaryWriter.prototype.writeInt64);

    doTestSignedField(
      BinaryReader.prototype.readEnum, BinaryWriter.prototype.writeEnum, 1,
      -Math.pow(2, 31), Math.pow(2, 31) - 1, Math.round);

    doTestUnsignedField(
      BinaryReader.prototype.readBool, BinaryWriter.prototype.writeBool, 1, 1,
      (x) => !!x);
  });

  /**
   * Tests reading a field from hexadecimal string (format: '08 BE EF').
   * @param {!Function} readField
   * @param {number} expected
   * @param {string} hexString
   */
  function doTestHexStringVarint(readField, expected, hexString) {
    const bytesCount = (hexString.length + 1) / 3;
    const bytes = new Uint8Array(bytesCount);
    for (let i = 0; i < bytesCount; i++) {
      bytes[i] = parseInt(hexString.substring(i * 3, i * 3 + 2), 16);
    }
    const reader = BinaryReader.alloc(bytes);
    reader.nextField();
    expect(readField.call(reader)).toEqual(expected);
  }

  /** Tests non-canonical redundant varint decoding. */
  it('testRedundantVarintFields', () => {
    expect(BinaryReader.prototype.readUint32).toBeDefined();
    expect(BinaryReader.prototype.readUint64).toBeDefined();
    expect(BinaryReader.prototype.readSint32).toBeDefined();
    expect(BinaryReader.prototype.readSint64).toBeDefined();

    // uint32 and sint32 take no more than 5 bytes
    // 08 - field prefix (type = 0 means varint)
    doTestHexStringVarint(
      BinaryReader.prototype.readUint32, 12, '08 8C 80 80 80 00');

    // 11 stands for -6 in zigzag encoding
    doTestHexStringVarint(
      BinaryReader.prototype.readSint32, -6, '08 8B 80 80 80 00');

    // uint64 and sint64 take no more than 10 bytes
    // 08 - field prefix (type = 0 means varint)
    doTestHexStringVarint(
      BinaryReader.prototype.readUint64, 12,
      '08 8C 80 80 80 80 80 80 80 80 00');

    // 11 stands for -6 in zigzag encoding
    doTestHexStringVarint(
      BinaryReader.prototype.readSint64, -6,
      '08 8B 80 80 80 80 80 80 80 80 00');
  });

  /** Tests reading 64-bit integers as split values. */
  it('handles split 64 fields', () => {
    const writer = new BinaryWriter();
    writer.writeInt64String(1, '4294967296');
    writer.writeSfixed64String(2, '4294967298');
    writer.writeInt64String(3, '3');  // 3 is the zig-zag encoding of -2.
    const reader = BinaryReader.alloc(writer.getResultBuffer());

    function rejoin(lowBits, highBits) {
      return highBits * 2 ** 32 + (lowBits >>> 0);
    }
    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(1);
    expect(reader.readSplitVarint64(rejoin)).toEqual(0x100000000);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(2);
    expect(reader.readSplitFixed64(rejoin)).toEqual(0x100000002);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(3);
    expect(reader.readSplitZigzagVarint64(rejoin)).toEqual(-2);
  });

  /** Tests 64-bit fields that are handled as strings. */
  it('testStringInt64Fields', () => {
    const writer = new BinaryWriter();

    const testSignedData = [
      '2730538252207801776',
      '-2688470994844604560',
      '3398529779486536359',
      '3568577411627971000',
      '272477188847484900',
      '-6649058714086158188',
      '-7695254765712060806',
      '-4525541438037104029',
      '-4993706538836508568',
      '4990160321893729138',
    ];
    const testUnsignedData = [
      '7822732630241694882',
      '6753602971916687352',
      '2399935075244442116',
      '8724292567325338867',
      '16948784802625696584',
      '4136275908516066934',
      '3575388346793700364',
      '5167142028379259461',
      '1557573948689737699',
      '17100725280812548567',
    ];

    for (let i = 0; i < testSignedData.length; i++) {
      writer.writeInt64String(2 * i + 1, testSignedData[i]);
      writer.writeUint64String(2 * i + 2, testUnsignedData[i]);
    }

    const reader = BinaryReader.alloc(writer.getResultBuffer());

    for (let i = 0; i < testSignedData.length; i++) {
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(2 * i + 1);
      expect(reader.readInt64String()).toEqual(testSignedData[i]);
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(2 * i + 2);
      expect(reader.readUint64String()).toEqual(testUnsignedData[i]);
    }
  });

  /** Tests fields that use zigzag encoding. */
  it('testZigzagFields', () => {
    doTestSignedField(
      BinaryReader.prototype.readSint32, BinaryWriter.prototype.writeSint32,
      1, -Math.pow(2, 31), Math.pow(2, 31) - 1, Math.round);

    doTestSigned64BitIntField(BinaryReader.prototype.readSint64, BinaryWriter.prototype.writeSint64);
  });

  /** Tests fields that use fixed-length encoding. */
  it('testFixedFields', () => {
    doTestUnsignedField(
      BinaryReader.prototype.readFixed32, BinaryWriter.prototype.writeFixed32,
      1, Math.pow(2, 32) - 1, Math.round);

    doTestUnsigned64BitIntField(BinaryReader.prototype.readFixed64, BinaryWriter.prototype.writeFixed64);

    doTestSignedField(
      BinaryReader.prototype.readSfixed32,
      BinaryWriter.prototype.writeSfixed32, 1, -Math.pow(2, 31),
      Math.pow(2, 31) - 1, Math.round);

    doTestSigned64BitIntField(BinaryReader.prototype.readSfixed64, BinaryWriter.prototype.writeSfixed64);
  });

  /** Tests floating point fields. */
  it('testFloatFields', () => {
    doTestSignedField(
      BinaryReader.prototype.readFloat, BinaryWriter.prototype.writeFloat,
      BinaryConstants.FLOAT32_MIN, -BinaryConstants.FLOAT32_MAX,
      BinaryConstants.FLOAT32_MAX, truncate);

    doTestSignedField(
      BinaryReader.prototype.readDouble, BinaryWriter.prototype.writeDouble,
      BinaryConstants.FLOAT64_EPS * 10, -BinaryConstants.FLOAT64_MIN,
      BinaryConstants.FLOAT64_MIN, (x) => x);
  });

  /** Tests length-delimited string fields. */
  it('testStringFields', () => {
    const s1 = 'The quick brown fox jumps over the lazy dog.';
    const s2 = '人人生而自由，在尊嚴和權利上一律平等。';

    const writer = new BinaryWriter();

    writer.writeString(1, s1);
    writer.writeString(2, s2);

    const reader = BinaryReader.alloc(writer.getResultBuffer());

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(1);
    expect(reader.readString()).toEqual(s1);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(2);
    expect(reader.readString()).toEqual(s2);
  });

  /** Tests length-delimited byte fields. */
  it('testByteFields', () => {
    const lowerLimit = 1;
    const upperLimit = 256;

    const writer = new BinaryWriter();

    for (let cursor = lowerLimit; cursor < upperLimit; cursor *= 1.1) {
      const len = Math.round(cursor);
      const bytes = [];
      for (let i = 0; i < len; i++) bytes.push(i % 256);

      writer.writeBytes(len, bytes);
    }

    const reader = BinaryReader.alloc(writer.getResultBuffer());

    for (let cursor = lowerLimit; reader.nextField(); cursor *= 1.1) {
      const len = Math.round(cursor);
      if (len != reader.getFieldNumber()) throw 'fail!';

      const bytes = reader.readBytes();
      if (len != bytes.length) throw 'fail!';
      for (let i = 0; i < bytes.length; i++) {
        if (i % 256 != bytes[i]) throw 'fail!';
      }
    }
    expect().nothing();  // suppress 'no expectations' warning
  });

  /** Tests nested messages. */
  it('testNesting', () => {
    const writer = new BinaryWriter();
    const dummyMessage = /** @type {!BinaryMessage} */ ({});

    writer.writeInt32(1, 100);

    // Add one message with 3 int fields.
    writer.writeMessage(2, dummyMessage, () => {
      writer.writeInt32(3, 300);
      writer.writeInt32(4, 400);
      writer.writeInt32(5, 500);
    });

    // Add one empty message.
    writer.writeMessage(6, dummyMessage, () => { });

    writer.writeInt32(7, 700);

    const reader = BinaryReader.alloc(writer.getResultBuffer());

    // Validate outermost message.

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(1);
    expect(reader.readInt32()).toEqual(100);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(2);
    reader.readMessage(dummyMessage, () => {
      // Validate embedded message 1.
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(3);
      expect(reader.readInt32()).toEqual(300);

      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(4);
      expect(reader.readInt32()).toEqual(400);

      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(5);
      expect(reader.readInt32()).toEqual(500);

      expect(reader.nextField()).toEqual(false);
    });

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(6);
    reader.readMessage(dummyMessage, () => {
      // Validate embedded message 2.

      expect(reader.nextField()).toEqual(false);
    });

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(7);
    expect(reader.readInt32()).toEqual(700);

    expect(reader.nextField()).toEqual(false);
  });

  /**
   * Tests skipping fields of each type by interleaving them with sentinel
   * values and skipping everything that's not a sentinel.
   */
  it('testSkipField', () => {
    const writer = new BinaryWriter();

    const sentinel = 123456789;

    // Write varint fields of different sizes.
    writer.writeInt32(1, sentinel);
    writer.writeInt32(1, 1);
    writer.writeInt32(1, 1000);
    writer.writeInt32(1, 1000000);
    writer.writeInt32(1, 1000000000);

    // Write fixed 64-bit encoded fields.
    writer.writeInt32(2, sentinel);
    writer.writeDouble(2, 1);
    writer.writeFixed64(2, 1);
    writer.writeSfixed64(2, 1);

    // Write fixed 32-bit encoded fields.
    writer.writeInt32(3, sentinel);
    writer.writeFloat(3, 1);
    writer.writeFixed32(3, 1);
    writer.writeSfixed32(3, 1);

    // Write delimited fields.
    writer.writeInt32(4, sentinel);
    writer.writeBytes(4, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    writer.writeString(4, 'The quick brown fox jumps over the lazy dog');

    // Write a group with a nested group inside.
    writer.writeInt32(5, sentinel);
    const dummyMessage = /** @type {!BinaryMessage} */ ({});
    writer.writeGroup(5, dummyMessage, () => {
      // Previously the skipGroup implementation was wrong, which only consume
      // the decoder by nextField. This case is for making the previous
      // implementation failed in skipGroup by an early end group tag.
      // The reason is 44 = 5 * 8 + 4, this will be translated in to a field
      // with number 5 and with type 4 (end group)
      writer.writeInt64(44, 44);
      // This will make previous implementation failed by invalid tag (7).
      writer.writeInt64(42, 47);
      writer.writeInt64(42, 42);
      // This is for making the previous implementation failed by an invalid
      // varint. The bytes have at least 9 consecutive minus byte, which will
      // fail in this.nextField for previous implementation.
      writer.writeBytes(43, [255, 255, 255, 255, 255, 255, 255, 255, 255, 255]);
      writer.writeGroup(6, dummyMessage, () => {
        writer.writeInt64(84, 42);
        writer.writeInt64(84, 44);
        writer.writeBytes(
          43, [255, 255, 255, 255, 255, 255, 255, 255, 255, 255]);
      });
    });

    // Write final sentinel.
    writer.writeInt32(6, sentinel);

    const reader = BinaryReader.alloc(writer.getResultBuffer());

    function skip(field, count) {
      for (let i = 0; i < count; i++) {
        expect(reader.nextField()).toBe(true);
        if (field != reader.getFieldNumber()) throw 'fail!';
        reader.skipField();
      }
    }

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(1);
    expect(reader.readInt32()).toEqual(sentinel);
    skip(1, 4);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(2);
    expect(reader.readInt32()).toEqual(sentinel);
    skip(2, 3);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(3);
    expect(reader.readInt32()).toEqual(sentinel);
    skip(3, 3);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(4);
    expect(reader.readInt32()).toEqual(sentinel);
    skip(4, 2);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(5);
    expect(reader.readInt32()).toEqual(sentinel);
    skip(5, 1);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(6);
    expect(reader.readInt32()).toEqual(sentinel);
  });

  /** Tests Packable fields. */
  it('testPackableFields', () => {
    const writer = new BinaryWriter();

    const sentinel = 123456789;

    const unsignedData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const signedData = [-1, 2, -3, 4, -5, 6, -7, 8, -9, 10];
    const floatData = [1.1, 2.2, 3.3, 4.4, 5.5, 6.6, 7.7, 8.8, 9.9, 10.10];
    const doubleData = [1.1, 2.2, 3.3, 4.4, 5.5, 6.6, 7.7, 8.8, 9.9, 10.10];
    const boolData = [true, false, true, true, false, false, true, false];

    for (let i = 0; i < floatData.length; i++) {
      floatData[i] = truncate(floatData[i]);
    }

    writer.writeInt32(1, sentinel);

    writer.writePackedInt32(2, signedData);
    writer.writePackedInt64(2, signedData);
    writer.writePackedUint32(2, unsignedData);
    writer.writePackedUint64(2, unsignedData);
    writer.writePackedSint32(2, signedData);
    writer.writePackedSint64(2, signedData);
    writer.writePackedFixed32(2, unsignedData);
    writer.writePackedFixed64(2, unsignedData);
    writer.writePackedSfixed32(2, signedData);
    writer.writePackedSfixed64(2, signedData);
    writer.writePackedFloat(2, floatData);
    writer.writePackedDouble(2, doubleData);
    writer.writePackedBool(2, boolData);
    writer.writePackedEnum(2, unsignedData);

    writer.writeInt32(3, sentinel);

    const reader = BinaryReader.alloc(writer.getResultBuffer());

    reader.nextField();
    expect(reader.readInt32()).toEqual(sentinel);

    reader.nextField();
    const array = [];
    reader.readPackableInt32Into(array);
    expect(array).toEqual(signedData);

    reader.nextField();
    array.length = 0;
    reader.readPackableInt64Into(array);
    expect(array).toEqual(signedData);

    reader.nextField();
    array.length = 0;
    reader.readPackableUint32Into(array);
    expect(array).toEqual(unsignedData);

    reader.nextField();
    array.length = 0;
    reader.readPackableUint64Into(array);
    expect(array).toEqual(unsignedData);

    reader.nextField();
    array.length = 0;
    reader.readPackableSint32Into(array);
    expect(array).toEqual(signedData);

    reader.nextField();
    array.length = 0;
    reader.readPackableSint64Into(array);
    expect(array).toEqual(signedData);

    reader.nextField();
    array.length = 0;
    reader.readPackableFixed32Into(array);
    expect(array).toEqual(unsignedData);

    reader.nextField();
    array.length = 0;
    reader.readPackableFixed64Into(array);
    expect(array).toEqual(unsignedData);

    reader.nextField();
    array.length = 0;
    reader.readPackableSfixed32Into(array);
    expect(array).toEqual(signedData);

    reader.nextField();
    array.length = 0;
    reader.readPackableSfixed64Into(array);
    expect(array).toEqual(signedData);

    reader.nextField();
    array.length = 0;
    reader.readPackableFloatInto(array);
    expect(array).toEqual(floatData);

    reader.nextField();
    array.length = 0;
    reader.readPackableDoubleInto(array);
    expect(array).toEqual(doubleData);

    reader.nextField();
    array.length = 0;
    reader.readPackableBoolInto(array);
    expect(array).toEqual(boolData);

    reader.nextField();
    array.length = 0;
    reader.readPackableEnumInto(array);
    expect(array).toEqual(unsignedData);

    reader.nextField();
    expect(reader.readInt32()).toEqual(sentinel);
  });

  /**
   * Byte blobs inside nested messages should always have their byte offset set
   * relative to the start of the outermost blob, not the start of their parent
   * blob.
   */
  it('testNestedBlobs', () => {
    // Create a proto consisting of two nested messages, with the inner one
    // containing a blob of bytes.

    const fieldTag = (1 << 3) | BinaryConstants.WireType.DELIMITED;
    const blob = [1, 2, 3, 4, 5];
    const writer = new BinaryWriter();
    const dummyMessage = /** @type {!BinaryMessage} */ ({});

    writer.writeMessage(1, dummyMessage, () => {
      writer.writeMessage(1, dummyMessage, () => {
        writer.writeBytes(1, blob);
      });
    });

    // Peel off the outer two message layers. Each layer should have two bytes
    // of overhead, one for the field tag and one for the length of the inner
    // blob.
    const buf = writer.getResultBuffer();
    const decoder1 = new BinaryDecoder(buf);
    expect(BinaryDecoder.readUnsignedVarint32(decoder1)).toEqual(fieldTag);
    expect(BinaryDecoder.readUnsignedVarint32(decoder1))
      .toEqual(blob.length + 4);

    const decoder2 = new BinaryDecoder(decoder1.readBytes(blob.length + 4));
    expect(BinaryDecoder.readUnsignedVarint32(decoder2)).toEqual(fieldTag);
    expect(BinaryDecoder.readUnsignedVarint32(decoder2))
      .toEqual(blob.length + 2);

    expect(BinaryDecoder.readUnsignedVarint32(decoder2)).toEqual(fieldTag);
    expect(BinaryDecoder.readUnsignedVarint32(decoder2)).toEqual(blob.length);
    const bytes = decoder2.readBytes(blob.length);

    // Mutating the input buffer shouldn't matter here because it will have been
    // copied.
    buf.fill(0);

    // toEqual doesn't support uint8array, so convert to arrays.
    expect(Array.from(bytes)).toEqual(Array.from(blob));
  });

  /** Tests read callbacks. */
  it('test read message', () => {
    const writer = new BinaryWriter();
    const dummyMessage = /** @type {!BinaryMessage} */ ({});

    // Add an int, a submessage, and another int.
    writer.writeInt32(1, 100);

    writer.writeMessage(2, dummyMessage, () => {
      writer.writeInt32(3, 300);
      writer.writeInt32(4, 400);
      writer.writeInt32(5, 500);
    });

    writer.writeInt32(7, 700);

    const reader = BinaryReader.alloc(writer.getResultBuffer());

    // Read the container message.
    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(1);
    expect(reader.readInt32()).toEqual(100);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(2);
    reader.readMessage(dummyMessage, () => {
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(3);
      expect(reader.readInt32()).toEqual(300);

      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(4);
      expect(reader.readInt32()).toEqual(400);

      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(5);
      expect(reader.readInt32()).toEqual(500);

      expect(reader.nextField()).toEqual(false);
    });

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(7);
    expect(reader.readInt32()).toEqual(700);

    expect(reader.nextField()).toEqual(false);
  });
  it('test group ends early when reading', () => {
    const writer = new BinaryWriter();
    writer.writeGroup(1, {}, (msg, writer) => {
      writer.writeString(1, 'hello');
    });
    const reader = BinaryReader.alloc(writer.getResultBuffer());
    // Normal reading works fine
    expect(reader.nextField()).toBe(true);
    reader.readGroup(1, {}, (msg, reader) => {
      expect(reader.nextField()).toBe(true);
      expect(reader.readString()).toBe('hello');
      expect(reader.nextField()).toBe(true);
    });
    reader.reset();
    expect(reader.nextField()).toBe(true);
    // If the reader callback returns early then an error will be thrown
    expect(() => {
      reader.readGroup(1, {}, (msg, reader) => {
        expect(reader.nextField()).toBe(true);
        expect(reader.readString()).toBe('hello');
      });
    }).toThrowError('Group submessage did not end with an END_GROUP tag');
  });
  it('test group ends with wrong tag when reading', () => {
    const writer = new BinaryWriter();
    writer.writeGroup(1, {}, (msg, writer) => {
      writer.writeString(1, 'hello');
    });
    const bytes = writer.getResultBuffer();
    // make the end tag at the end correspond to the wrong field number
    bytes[bytes.length - 1] = makeTag(2, BinaryConstants.WireType.END_GROUP);
    // slice the endgroup tag off
    const reader = BinaryReader.alloc(bytes);
    reader.nextField();
    expect(() => reader.readGroup(1, {}, (msg, reader) => {
      expect(reader.nextField()).toBe(true);
      expect(reader.readString()).toBe('hello');
      expect(reader.nextField()).toBe(true);
    })).toThrowError('Unmatched end-group tag');
  });
  it('test group ends early when skipping', () => {
    const writer = new BinaryWriter();
    writer.writeGroup(1, {}, (msg, writer) => {
      writer.writeString(1, 'hello');
    });
    // slice the endgroup tag off
    const reader =
      BinaryReader.alloc(sliceUint8Array(writer.getResultBuffer(), 0, -1));
    reader.nextField();
    expect(() => reader.skipField())
      .toThrowError('Unmatched start-group tag: stream EOF');
  });

  it('test group ends with wrong end tag when skipping', () => {
    const writer = new BinaryWriter();
    writer.writeGroup(1, {}, (msg, writer) => {
      writer.writeString(1, 'hello');
    });
    const bytes = writer.getResultBuffer();
    // make the end tag at the end correspond to the wrong field number
    bytes[bytes.length - 1] = makeTag(2, BinaryConstants.WireType.END_GROUP);
    const reader = BinaryReader.alloc(bytes);
    reader.nextField();
    expect(() => reader.skipField()).toThrowError('Unmatched end-group tag');
  });


  it('throws when stop group appears first', () => {
    const misplacedEndGroupEncoder = new BinaryEncoder();
    const fieldNumber = 1;
    misplacedEndGroupEncoder.writeUnsignedVarint32(
      (fieldNumber << 3) + BinaryConstants.WireType.END_GROUP);
    const misplacedEndGroupData = misplacedEndGroupEncoder.end();
    const reader = BinaryReader.alloc(misplacedEndGroupData);
    reader.nextField();

    expect(() => reader.skipField())
      .toThrowError('Invalid wire type: 4 (at position 0)');
  });

  it('throws on invalid wire types', () => {
    const badWireTypeEncoder = new BinaryEncoder();
    const fieldNumber = 1;
    badWireTypeEncoder.writeUnsignedVarint32(
      (fieldNumber << 3) + /* max wiretype + 1 */6);
    const badWireTypeData = badWireTypeEncoder.end();
    const reader = BinaryReader.alloc(badWireTypeData);
    expect(() => reader.nextField())
      .toThrowError('Invalid wire type: 6 (at position 0)');
  });
});
