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
goog.require('jspb.BinaryDecoder');
goog.require('jspb.BinaryReader');
goog.require('jspb.BinaryWriter');
goog.require('jspb.utils');

goog.requireType('jspb.BinaryMessage');


describe('binaryReaderTest', () => {
  /**
   * Tests the reader instance cache.
   */
  it('testInstanceCaches', /** @suppress {visibility} */ () => {
    const writer = new jspb.BinaryWriter();
    const dummyMessage = /** @type {!jspb.BinaryMessage} */ ({});
    writer.writeMessage(1, dummyMessage, () => {});
    writer.writeMessage(2, dummyMessage, () => {});

    const buffer = writer.getResultBuffer();

    // Empty the instance caches.
    jspb.BinaryReader.clearInstanceCache();

    // Allocating and then freeing three decoders should leave us with three in
    // the cache.

    const decoder1 = jspb.BinaryDecoder.alloc();
    const decoder2 = jspb.BinaryDecoder.alloc();
    const decoder3 = jspb.BinaryDecoder.alloc();
    decoder1.free();
    decoder2.free();
    decoder3.free();

    expect(jspb.BinaryDecoder.getInstanceCacheLength()).toEqual(3);
    expect(jspb.BinaryReader.getInstanceCacheLength()).toEqual(0);

    // Allocating and then freeing a reader should remove one decoder from its
    // cache, but it should stay stuck to the reader afterwards since we can't
    // have a reader without a decoder.
    jspb.BinaryReader.alloc().free();

    expect(jspb.BinaryDecoder.getInstanceCacheLength()).toEqual(2);
    expect(jspb.BinaryReader.getInstanceCacheLength()).toEqual(1);

    // Allocating a reader should remove a reader from the cache.
    const reader = jspb.BinaryReader.alloc(buffer);

    expect(jspb.BinaryDecoder.getInstanceCacheLength()).toEqual(2);
    expect(jspb.BinaryReader.getInstanceCacheLength()).toEqual(0);

    // Processing the message reuses the current reader.
    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(1);
    reader.readMessage(dummyMessage, () => {
        expect(jspb.BinaryReader.getInstanceCacheLength()).toEqual(0);
      });

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(2);
    reader.readMessage(dummyMessage, () => {
        expect(jspb.BinaryReader.getInstanceCacheLength()).toEqual(0);
      });

    expect(reader.nextField()).toEqual(false);

    expect(jspb.BinaryDecoder.getInstanceCacheLength()).toEqual(2);
    expect(jspb.BinaryReader.getInstanceCacheLength()).toEqual(0);

    // Freeing the reader should put it back into the cache.
    reader.free();

    expect(jspb.BinaryDecoder.getInstanceCacheLength()).toEqual(2);
    expect(jspb.BinaryReader.getInstanceCacheLength()).toEqual(1);
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


  /**
   * Verifies that misuse of the reader class triggers assertions.
   */
  it('testReadErrors', /** @suppress {checkTypes|visibility} */ () => {
      // Calling readMessage on a non-delimited field should trigger an
      // assertion.
      let reader = jspb.BinaryReader.alloc([8, 1]);
      const dummyMessage = /** @type {!jspb.BinaryMessage} */ ({});
      reader.nextField();
      expect(() => {
        reader.readMessage(dummyMessage, () => { });
      }).toThrow();

      // Reading past the end of the stream should trigger an assertion.
      reader = jspb.BinaryReader.alloc([9, 1]);
      reader.nextField();
      expect(() => {
        reader.readFixed64();
      }).toThrow();

      // Reading past the end of a submessage should trigger an assertion.
      reader = jspb.BinaryReader.alloc([10, 4, 13, 1, 1, 1]);
      reader.nextField();
      reader.readMessage(dummyMessage, () => {
          reader.nextField();
          expect(() => {
            reader.readFixed32();
          }).toThrow();
        });

      // Skipping an invalid field should trigger an assertion.
      reader = jspb.BinaryReader.alloc([12, 1]);
      reader.nextWireType_ = 1000;
      expect(() => {
        reader.skipField();
      }).toThrow();

      // Reading fields with the wrong wire type should assert.
      reader = jspb.BinaryReader.alloc([9, 0, 0, 0, 0, 0, 0, 0, 0]);
      reader.nextField();
      expect(() => {
        reader.readInt32();
      }).toThrow();
      expect(function () {
        reader.readInt32String();
      }).toThrow();
      expect(function () {
        reader.readInt64();
      }).toThrow();
      expect(function () {
        reader.readInt64String();
      }).toThrow();
      expect(function () {
        reader.readUint32();
      }).toThrow();
      expect(function () {
        reader.readUint32String();
      }).toThrow();
      expect(function () {
        reader.readUint64();
      }).toThrow();
      expect(function () {
        reader.readUint64String();
      }).toThrow();
      expect(function () {
        reader.readSint32();
      }).toThrow();
      expect(function () {
        reader.readBool();
      }).toThrow();
      expect(function () {
        reader.readEnum();
      }).toThrow();

      reader = jspb.BinaryReader.alloc([8, 1]);
      reader.nextField();
      expect(function () {
        reader.readFixed32();
      }).toThrow();
      expect(function () {
        reader.readFixed64();
      }).toThrow();
      expect(function () {
        reader.readSfixed32();
      }).toThrow();
      expect(function () {
        reader.readSfixed64();
      }).toThrow();
      expect(function () {
        reader.readFloat();
      }).toThrow();
      expect(function () {
        reader.readDouble();
      }).toThrow();

      expect(function () {
        reader.readString();
      }).toThrow();
      expect(function () {
        reader.readBytes();
      }).toThrow();
    });


  /**
   * Tests encoding and decoding of unsigned field types.
   * @param {Function} readField
   * @param {Function} writeField
   * @param {number} epsilon
   * @param {number} upperLimit
   * @param {Function} filter
   * @private
   * @suppress {missingProperties}
   */
  const doTestUnsignedField_ = function(
      readField, writeField, epsilon, upperLimit, filter) {
    expect(readField).not.toBeNull();
    expect(writeField).not.toBeNull();

    const writer = new jspb.BinaryWriter();

    // Encode zero and limits.
    writeField.call(writer, 1, filter(0));
    writeField.call(writer, 2, filter(epsilon));
    writeField.call(writer, 3, filter(upperLimit));

    // Encode positive values.
    for (let cursor = epsilon; cursor < upperLimit; cursor *= 1.1) {
      writeField.call(writer, 4, filter(cursor));
    }

    const reader = jspb.BinaryReader.alloc(writer.getResultBuffer());

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
   * @param {Function} readField
   * @param {Function} writeField
   * @param {number} epsilon
   * @param {number} lowerLimit
   * @param {number} upperLimit
   * @param {Function} filter
   * @private
   * @suppress {missingProperties}
   */
  const doTestSignedField_ = function(
      readField, writeField, epsilon, lowerLimit, upperLimit, filter) {
    const writer = new jspb.BinaryWriter();

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
      inputValues.push({fieldNumber: 6, value: val});
    }

    // Encode positive values.
    for (let cursor = epsilon; cursor < upperLimit; cursor *= 1.1) {
      const val = filter(cursor);
      writeField.call(writer, 7, val);
      inputValues.push({fieldNumber: 7, value: val});
    }

    const reader = jspb.BinaryReader.alloc(writer.getResultBuffer());

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


  /**
   * Tests fields that use varint encoding.
   */
  it('testVarintFields', () => {
    expect(jspb.BinaryReader.prototype.readUint32).not.toBeUndefined();
    expect(jspb.BinaryWriter.prototype.writeUint32).not.toBeUndefined();
    expect(jspb.BinaryReader.prototype.readUint64).not.toBeUndefined();
    expect(jspb.BinaryWriter.prototype.writeUint64).not.toBeUndefined();
    expect(jspb.BinaryReader.prototype.readBool).not.toBeUndefined();
    expect(jspb.BinaryWriter.prototype.writeBool).not.toBeUndefined();
    doTestUnsignedField_(
        jspb.BinaryReader.prototype.readUint32,
        jspb.BinaryWriter.prototype.writeUint32, 1, Math.pow(2, 32) - 1,
        Math.round);

    doTestUnsignedField_(
        jspb.BinaryReader.prototype.readUint64,
        jspb.BinaryWriter.prototype.writeUint64, 1, Math.pow(2, 64) - 1025,
        Math.round);

    doTestSignedField_(
        jspb.BinaryReader.prototype.readInt32,
        jspb.BinaryWriter.prototype.writeInt32, 1, -Math.pow(2, 31),
        Math.pow(2, 31) - 1, Math.round);

    doTestSignedField_(
        jspb.BinaryReader.prototype.readInt64,
        jspb.BinaryWriter.prototype.writeInt64, 1, -Math.pow(2, 63),
        Math.pow(2, 63) - 513, Math.round);

    doTestSignedField_(
        jspb.BinaryReader.prototype.readEnum,
        jspb.BinaryWriter.prototype.writeEnum, 1, -Math.pow(2, 31),
        Math.pow(2, 31) - 1, Math.round);

    doTestUnsignedField_(
        jspb.BinaryReader.prototype.readBool,
        jspb.BinaryWriter.prototype.writeBool, 1, 1, function(x) {
          return !!x;
        });
  });


  /**
   * Tests reading a field from hexadecimal string (format: '08 BE EF').
   * @param {Function} readField
   * @param {number} expected
   * @param {string} hexString
   */
  function doTestHexStringVarint_(readField, expected, hexString) {
    const bytesCount = (hexString.length + 1) / 3;
    const bytes = new Uint8Array(bytesCount);
    for (let i = 0; i < bytesCount; i++) {
      bytes[i] = parseInt(hexString.substring(i * 3, i * 3 + 2), 16);
    }
    const reader = jspb.BinaryReader.alloc(bytes);
    reader.nextField();
    expect(readField.call(reader)).toEqual(expected);
  }


  /**
   * Tests non-canonical redundant varint decoding.
   */
  it('testRedundantVarintFields', () => {
    expect(jspb.BinaryReader.prototype.readUint32).not.toBeNull();
    expect(jspb.BinaryReader.prototype.readUint64).not.toBeNull();
    expect(jspb.BinaryReader.prototype.readSint32).not.toBeNull();
    expect(jspb.BinaryReader.prototype.readSint64).not.toBeNull();

    // uint32 and sint32 take no more than 5 bytes
    // 08 - field prefix (type = 0 means varint)
    doTestHexStringVarint_(
        jspb.BinaryReader.prototype.readUint32, 12, '08 8C 80 80 80 00');

    // 11 stands for -6 in zigzag encoding
    doTestHexStringVarint_(
        jspb.BinaryReader.prototype.readSint32, -6, '08 8B 80 80 80 00');

    // uint64 and sint64 take no more than 10 bytes
    // 08 - field prefix (type = 0 means varint)
    doTestHexStringVarint_(
        jspb.BinaryReader.prototype.readUint64, 12,
        '08 8C 80 80 80 80 80 80 80 80 00');

    // 11 stands for -6 in zigzag encoding
    doTestHexStringVarint_(
        jspb.BinaryReader.prototype.readSint64, -6,
        '08 8B 80 80 80 80 80 80 80 80 00');
  });

  /**
   * Tests reading 64-bit integers as split values.
   */
  it('handles split 64 fields', () => {
    const writer = new jspb.BinaryWriter();
    writer.writeInt64String(1, '4294967296');
    writer.writeSfixed64String(2, '4294967298');
    writer.writeInt64String(3, '3');  // 3 is the zig-zag encoding of -2.
    const reader = jspb.BinaryReader.alloc(writer.getResultBuffer());

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

  /**
   * Tests 64-bit fields that are handled as strings.
   */
  it('testStringInt64Fields', () => {
    const writer = new jspb.BinaryWriter();

    const testSignedData = [
      '2730538252207801776', '-2688470994844604560', '3398529779486536359',
      '3568577411627971000', '272477188847484900', '-6649058714086158188',
      '-7695254765712060806', '-4525541438037104029', '-4993706538836508568',
      '4990160321893729138'
    ];
    const testUnsignedData = [
      '7822732630241694882', '6753602971916687352', '2399935075244442116',
      '8724292567325338867', '16948784802625696584', '4136275908516066934',
      '3575388346793700364', '5167142028379259461', '1557573948689737699',
      '17100725280812548567'
    ];

    for (let i = 0; i < testSignedData.length; i++) {
      writer.writeInt64String(2 * i + 1, testSignedData[i]);
      writer.writeUint64String(2 * i + 2, testUnsignedData[i]);
    }

    const reader = jspb.BinaryReader.alloc(writer.getResultBuffer());

    for (let i = 0; i < testSignedData.length; i++) {
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(2 * i + 1);
      expect(testSignedData[i]).toEqual(reader.readInt64String());
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(2 * i + 2);
      expect(testUnsignedData[i]).toEqual(reader.readUint64String());
    }
  });


  /**
   * Tests fields that use zigzag encoding.
   */
  it('testZigzagFields', () => {
    doTestSignedField_(
        jspb.BinaryReader.prototype.readSint32,
        jspb.BinaryWriter.prototype.writeSint32, 1, -Math.pow(2, 31),
        Math.pow(2, 31) - 1, Math.round);

    doTestSignedField_(
        jspb.BinaryReader.prototype.readSint64,
        jspb.BinaryWriter.prototype.writeSint64, 1, -Math.pow(2, 63),
        Math.pow(2, 63) - 513, Math.round);

    doTestSignedField_(
        jspb.BinaryReader.prototype.readSintHash64,
        jspb.BinaryWriter.prototype.writeSintHash64, 1, -Math.pow(2, 63),
        Math.pow(2, 63) - 513, jspb.utils.numberToHash64);
  });


  /**
   * Tests fields that use fixed-length encoding.
   */
  it('testFixedFields', () => {
    doTestUnsignedField_(
        jspb.BinaryReader.prototype.readFixed32,
        jspb.BinaryWriter.prototype.writeFixed32, 1, Math.pow(2, 32) - 1,
        Math.round);

    doTestUnsignedField_(
        jspb.BinaryReader.prototype.readFixed64,
        jspb.BinaryWriter.prototype.writeFixed64, 1, Math.pow(2, 64) - 1025,
        Math.round);

    doTestSignedField_(
        jspb.BinaryReader.prototype.readSfixed32,
        jspb.BinaryWriter.prototype.writeSfixed32, 1, -Math.pow(2, 31),
        Math.pow(2, 31) - 1, Math.round);

    doTestSignedField_(
        jspb.BinaryReader.prototype.readSfixed64,
        jspb.BinaryWriter.prototype.writeSfixed64, 1, -Math.pow(2, 63),
        Math.pow(2, 63) - 513, Math.round);
  });


  /**
   * Tests floating point fields.
   */
  it('testFloatFields', () => {
    doTestSignedField_(
        jspb.BinaryReader.prototype.readFloat,
        jspb.BinaryWriter.prototype.writeFloat,
        jspb.BinaryConstants.FLOAT32_MIN, -jspb.BinaryConstants.FLOAT32_MAX,
        jspb.BinaryConstants.FLOAT32_MAX, truncate);

    doTestSignedField_(
        jspb.BinaryReader.prototype.readDouble,
        jspb.BinaryWriter.prototype.writeDouble,
        jspb.BinaryConstants.FLOAT64_EPS * 10,
        -jspb.BinaryConstants.FLOAT64_MIN, jspb.BinaryConstants.FLOAT64_MIN,
        function(x) {
          return x;
        });
  });


  /**
   * Tests length-delimited string fields.
   */
  it('testStringFields', () => {
    const s1 = 'The quick brown fox jumps over the lazy dog.';
    const s2 = '人人生而自由，在尊嚴和權利上一律平等。';

    const writer = new jspb.BinaryWriter();

    writer.writeString(1, s1);
    writer.writeString(2, s2);

    const reader = jspb.BinaryReader.alloc(writer.getResultBuffer());

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(1);
    expect(reader.readString()).toEqual(s1);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(2);
    expect(reader.readString()).toEqual(s2);
  });


  /**
   * Tests length-delimited byte fields.
   */
  it('testByteFields', () => {
    const message = [];
    const lowerLimit = 1;
    const upperLimit = 256;
    const scale = 1.1;

    const writer = new jspb.BinaryWriter();

    for (let cursor = lowerLimit; cursor < upperLimit; cursor *= 1.1) {
      const len = Math.round(cursor);
      const bytes = [];
      for (let i = 0; i < len; i++) bytes.push(i % 256);

      writer.writeBytes(len, bytes);
    }

    const reader = jspb.BinaryReader.alloc(writer.getResultBuffer());

    for (let cursor = lowerLimit; reader.nextField(); cursor *= 1.1) {
      const len = Math.round(cursor);
      if (len != reader.getFieldNumber()) throw 'fail!';

      const bytes = reader.readBytes();
      if (len != bytes.length) throw 'fail!';
      for (let i = 0; i < bytes.length; i++) {
        if (i % 256 != bytes[i]) throw 'fail!';
      }
    }
  });


  /**
   * Tests nested messages.
   */
  it('testNesting', () => {
    const writer = new jspb.BinaryWriter();
    const dummyMessage = /** @type {!jspb.BinaryMessage} */ ({});

    writer.writeInt32(1, 100);

    // Add one message with 3 int fields.
    writer.writeMessage(2, dummyMessage, () => {
      writer.writeInt32(3, 300);
      writer.writeInt32(4, 400);
      writer.writeInt32(5, 500);
    });

    // Add one empty message.
    writer.writeMessage(6, dummyMessage, () => {});

    writer.writeInt32(7, 700);

    const reader = jspb.BinaryReader.alloc(writer.getResultBuffer());

    // Validate outermost message.

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(1);
    expect(100).toEqual(reader.readInt32());

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(2);
    reader.readMessage(dummyMessage, () => {
      // Validate embedded message 1.
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(3);
      expect(300).toEqual(reader.readInt32());

      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(4);
      expect(400).toEqual(reader.readInt32());

      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(5);
      expect(500).toEqual(reader.readInt32());

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
    expect(700).toEqual(reader.readInt32());

    expect(reader.nextField()).toEqual(false);
  });

  /**
   * Tests skipping fields of each type by interleaving them with sentinel
   * values and skipping everything that's not a sentinel.
   */
  it('testSkipField', () => {
    const writer = new jspb.BinaryWriter();

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
    const dummyMessage = /** @type {!jspb.BinaryMessage} */ ({});
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

    const reader = jspb.BinaryReader.alloc(writer.getResultBuffer());

    function skip(field, count) {
      for (let i = 0; i < count; i++) {
        reader.nextField();
        if (field != reader.getFieldNumber()) throw 'fail!';
        reader.skipField();
      }
    }

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(1);
    expect(sentinel).toEqual(reader.readInt32());
    skip(1, 4);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(2);
    expect(sentinel).toEqual(reader.readInt32());
    skip(2, 3);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(3);
    expect(sentinel).toEqual(reader.readInt32());
    skip(3, 3);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(4);
    expect(sentinel).toEqual(reader.readInt32());
    skip(4, 2);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(5);
    expect(sentinel).toEqual(reader.readInt32());
    skip(5, 1);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(6);
    expect(sentinel).toEqual(reader.readInt32());
  });


  /**
   * Tests packed fields.
   */
  it('testPackedFields', () => {
    const writer = new jspb.BinaryWriter();

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

    const reader = jspb.BinaryReader.alloc(writer.getResultBuffer());

    reader.nextField();
    expect(sentinel).toEqual(reader.readInt32());

    reader.nextField();
    expect(signedData).toEqual(reader.readPackedInt32());

    reader.nextField();
    expect(signedData).toEqual(reader.readPackedInt64());

    reader.nextField();
    expect(unsignedData).toEqual(reader.readPackedUint32());

    reader.nextField();
    expect(unsignedData).toEqual(reader.readPackedUint64());

    reader.nextField();
    expect(signedData).toEqual(reader.readPackedSint32());

    reader.nextField();
    expect(signedData).toEqual(reader.readPackedSint64());

    reader.nextField();
    expect(unsignedData).toEqual(reader.readPackedFixed32());

    reader.nextField();
    expect(unsignedData).toEqual(reader.readPackedFixed64());

    reader.nextField();
    expect(signedData).toEqual(reader.readPackedSfixed32());

    reader.nextField();
    expect(signedData).toEqual(reader.readPackedSfixed64());

    reader.nextField();
    expect(floatData).toEqual(reader.readPackedFloat());

    reader.nextField();
    expect(doubleData).toEqual(reader.readPackedDouble());

    reader.nextField();
    expect(boolData).toEqual(reader.readPackedBool());

    reader.nextField();
    expect(unsignedData).toEqual(reader.readPackedEnum());

    reader.nextField();
    expect(sentinel).toEqual(reader.readInt32());
  });


  /**
   * Byte blobs inside nested messages should always have their byte offset set
   * relative to the start of the outermost blob, not the start of their parent
   * blob.
   */
  it('testNestedBlobs', () => {
    // Create a proto consisting of two nested messages, with the inner one
    // containing a blob of bytes.

    const fieldTag = (1 << 3) | /* jspb.BinaryConstants.WireType.DELIMITED = */ 2;
    const blob = [1, 2, 3, 4, 5];
    const writer = new jspb.BinaryWriter();
    const dummyMessage = /** @type {!jspb.BinaryMessage} */ ({});

    writer.writeMessage(1, dummyMessage, () => {
      writer.writeMessage(1, dummyMessage, () => {
        writer.writeBytes(1, blob);
      });
    });

    // Peel off the outer two message layers. Each layer should have two bytes
    // of overhead, one for the field tag and one for the length of the inner
    // blob.

    const decoder1 = new jspb.BinaryDecoder(writer.getResultBuffer());
    expect(fieldTag).toEqual(decoder1.readUnsignedVarint32());
    expect(blob.length + 4).toEqual(decoder1.readUnsignedVarint32());

    const decoder2 =
        new jspb.BinaryDecoder(decoder1.readBytes(blob.length + 4));
    expect(fieldTag).toEqual(decoder2.readUnsignedVarint32());
    expect(blob.length + 2).toEqual(decoder2.readUnsignedVarint32());

    expect(fieldTag).toEqual(decoder2.readUnsignedVarint32());
    expect(blob.length).toEqual(decoder2.readUnsignedVarint32());
    const bytes = decoder2.readBytes(blob.length);

    expect(Uint8Array.from(blob)).toEqual(bytes);
  });


  /**
   * Tests read callbacks.
   */
  it('testReadCallbacks', () => {
    const writer = new jspb.BinaryWriter();
    const dummyMessage = /** @type {!jspb.BinaryMessage} */ ({});

    // Add an int, a submessage, and another int.
    writer.writeInt32(1, 100);

    writer.writeMessage(2, dummyMessage, () => {
      writer.writeInt32(3, 300);
      writer.writeInt32(4, 400);
      writer.writeInt32(5, 500);
    });

    writer.writeInt32(7, 700);

    // Create the reader and register a custom read callback.
    const reader = jspb.BinaryReader.alloc(writer.getResultBuffer());

    /**
     * @param {!jspb.BinaryReader} reader
     * @return {*}
     */
    function readCallback(reader) {
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(3);
      expect(300).toEqual(reader.readInt32());

      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(4);
      expect(400).toEqual(reader.readInt32());

      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(5);
      expect(500).toEqual(reader.readInt32());

      expect(reader.nextField()).toEqual(false);
    };

    reader.registerReadCallback('readCallback', readCallback);

    // Read the container message.
    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(1);
    expect(100).toEqual(reader.readInt32());

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(2);
    reader.readMessage(dummyMessage, () => {
      // Decode the embedded message using the registered callback.
      reader.runReadCallback('readCallback');
    });

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(7);
    expect(700).toEqual(reader.readInt32());

    expect(reader.nextField()).toEqual(false);
  });
});
