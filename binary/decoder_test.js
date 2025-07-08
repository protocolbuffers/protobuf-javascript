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
 * @fileoverview Test cases for jspb's binary protocol buffer decoder.
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
goog.require('jspb.utils');
goog.require('jspb.binary.decoder');
goog.require('jspb.binary.encoder');
goog.require('jspb.binary.utf8');
goog.require('jspb.bytestring');

const BinaryConstants = goog.module.get('jspb.BinaryConstants');
const utils = goog.module.get('jspb.utils');
const BinaryDecoder = goog.module.get('jspb.binary.decoder').BinaryDecoder;
const BinaryEncoder = goog.module.get('jspb.binary.encoder').BinaryEncoder;
const ByteString = goog.module.get('jspb.bytestring').ByteString;
const encodeUtf8 = goog.module.get('jspb.binary.utf8').encodeUtf8;

/**
 *
 * @param {number|string|bigint} x
 * @returns number
 */
function asNumberOrString(x) {
  const num = Number(x);
  return Number.isSafeInteger(num) ? num : (/** @type{number} */(String(x)));
}

/**
 * Tests encoding and decoding of unsigned types.
 * @param {!Function} readValue
 * @param {!Function} writeValue
 * @param {number} epsilon
 * @param {number} upperLimit
 * @param {!Function} filter
 * @suppress {missingProperties|visibility}
 */
function doTestUnsignedValue(readValue,
  writeValue, epsilon, upperLimit, filter) {
  const encoder = new BinaryEncoder();

  // Encode zero and limits.
  writeValue.call(encoder, filter(0));
  writeValue.call(encoder, filter(epsilon));
  writeValue.call(encoder, filter(upperLimit));

  // Encode positive values.
  for (let cursor = epsilon; cursor < upperLimit; cursor *= 1.1) {
    writeValue.call(encoder, filter(cursor));
  }

  const decoder = BinaryDecoder.alloc(encoder.end());

  // Check zero and limits.
  expect(readValue(decoder)).toEqual(filter(0));
  expect(readValue(decoder)).toEqual(filter(epsilon));
  expect(readValue(decoder)).toEqual(filter(upperLimit));

  // Check positive values.
  for (let cursor = epsilon; cursor < upperLimit; cursor *= 1.1) {
    if (filter(cursor) != readValue(decoder)) throw 'fail!';
  }

  // Encoding values outside the valid range should assert.
  expect(() => {
    writeValue.call(encoder, -1);
  }).toThrow();
  expect(() => {
    writeValue.call(encoder, upperLimit * 1.1);
  }).toThrow();
}

/**
 * Tests encoding and decoding of signed types.
 * @param {!Function} readValue
 * @param {!Function} writeValue
 * @param {number} epsilon
 * @param {number} lowerLimit
 * @param {number} upperLimit
 * @param {!Function} filter
 * @suppress {missingProperties}
 */
function doTestSignedValue(readValue,
  writeValue, epsilon, lowerLimit, upperLimit, filter) {
  const encoder = new BinaryEncoder();

  // Encode zero and limits.
  writeValue.call(encoder, filter(lowerLimit));
  writeValue.call(encoder, filter(-epsilon));
  writeValue.call(encoder, filter(0));
  writeValue.call(encoder, filter(epsilon));
  writeValue.call(encoder, filter(upperLimit));

  const inputValues = [];

  // Encode negative values.
  for (let cursor = lowerLimit; cursor < -epsilon; cursor /= 1.1) {
    const val = filter(cursor);
    writeValue.call(encoder, val);
    inputValues.push(val);
  }

  // Encode positive values.
  for (let cursor = epsilon; cursor < upperLimit; cursor *= 1.1) {
    const val = filter(cursor);
    writeValue.call(encoder, val);
    inputValues.push(val);
  }

  const decoder = BinaryDecoder.alloc(encoder.end());

  // Check zero and limits.
  expect(readValue(decoder)).toEqual(filter(lowerLimit));
  expect(readValue(decoder)).toEqual(filter(-epsilon));
  expect(readValue(decoder)).toEqual(filter(0));
  expect(readValue(decoder)).toEqual(filter(epsilon));
  expect(readValue(decoder)).toEqual(filter(upperLimit));

  // Verify decoded values.
  const nestedData =
    new Uint8Array(decoder.getBuffer().buffer, decoder.getCursor());
  for (let i = 0; i < inputValues.length; i++) {
    expect(readValue(decoder)).toEqual(inputValues[i]);
  }
  // Verify we can read from a nested Uint8Array.
  const nestedDecoder = BinaryDecoder.alloc(nestedData);
  for (let i = 0; i < inputValues.length; i++) {
    expect(readValue(nestedDecoder)).toEqual(inputValues[i]);
  }

  // Encoding values outside the valid range should assert.
  const pastLowerLimit = lowerLimit * 1.1;
  const pastUpperLimit = upperLimit * 1.1;
  if (pastLowerLimit !== -Infinity) {
    expect(() => void writeValue.call(encoder, pastLowerLimit)).toThrow();
  }
  if (pastUpperLimit !== Infinity) {
    expect(() => void writeValue.call(encoder, pastUpperLimit)).toThrow();
  }
}

/**
 * @param {function(!BinaryDecoder):number} readValue
 * @param {function(!BinaryEncoder, number)} writeValue
 */
function doTestSigned64BitIntValue(
  readValue,
  writeValue
) {
  const encoder = new BinaryEncoder();

  const lowerLimit = -Math.pow(2, 63);
  const upperLimit = Math.pow(2, 63) - 1024;

  const inputValues = [];
  function addValue(/** number */v, /**string|undefined*/withPrecision) {
    writeValue.call(encoder, v);
    inputValues.push(withPrecision ? asNumberOrString(withPrecision) : v);
  }
  // Encode zero and limits.
  addValue(lowerLimit, '-9223372036854775808');
  addValue(-1);
  addValue(0);
  addValue(1);
  addValue(upperLimit, '9223372036854774784');

  // Encode negative values.
  for (
    let cursor = BigInt('-9223372036854775808');
    cursor < BigInt(-1);
    cursor /= BigInt(2)
  ) {
    addValue(Number(cursor), String(cursor));
  }

  // Encode positive values.
  for (
    let cursor = BigInt(1);
    cursor < BigInt('9223372036854774784');
    cursor *= BigInt(2)
  ) {
    addValue(Number(cursor), String(cursor));
  }

  const encodedData = encoder.end();
  const decoder = BinaryDecoder.alloc(encodedData);
  const u8 = new Uint8Array(encodedData.length + 5);
  u8.set(encodedData, 5);
  // Verify we can read from a Uint8Array that has a byteoffset
  const offsetDecoder = BinaryDecoder.alloc(new Uint8Array(u8.buffer, 5));

  // Verify decoded values.
  for (let i = 0; i < inputValues.length; i++) {
    expect(readValue(decoder)).toBe(inputValues[i]);
    expect(readValue(offsetDecoder)).toBe(inputValues[i]);
  }
  // Encoding values outside the valid range should assert.
  const pastLowerLimit = lowerLimit * 1.1;
  const pastUpperLimit = upperLimit * 1.1;
  expect(() => { writeValue.call(encoder, pastLowerLimit); }).toThrow();
  expect(() => { writeValue.call(encoder, pastUpperLimit); }).toThrow();
}

/**
 * @param {function(!BinaryDecoder):number} readValue
 * @param {function(!BinaryEncoder, number)} writeValue
 */
function doTestUnsigned64BitIntValue(
  readValue,
  writeValue
) {
  const encoder = new BinaryEncoder();
  const upperLimit = Math.pow(2, 64) - 2048;

  // Encode zero and limits.
  writeValue.call(encoder, 0);
  writeValue.call(encoder, 1);
  writeValue.call(encoder, upperLimit);
  // Encode positive values.
  for (
    let cursor = BigInt(1);
    cursor < BigInt('18446744073709549568');
    cursor *= BigInt(2)
  ) {
    writeValue.call(encoder, asNumberOrString(cursor.toString()));
  }

  const decoder = BinaryDecoder.alloc(encoder.end());

  // Check zero and limits.
  expect(readValue(decoder)).toEqual(0);
  expect(readValue(decoder)).toEqual(1);
  expect(readValue(decoder)).toEqual(
    /** @type{number}*/('18446744073709549568')
  );

  // Check positive values.
  for (
    let cursor = BigInt(1);
    cursor < BigInt('18446744073709549568');
    cursor *= BigInt(2)
  ) {
    expect(readValue(decoder)).toEqual(asNumberOrString(cursor.toString()));
  }

  // Encoding values outside the valid range should assert.
  expect(() => {
    writeValue.call(encoder, -1);
  }).toThrow();
  expect(() => {
    writeValue.call(
      encoder,
      Number(
        BigInt('18446744073709549568') * BigInt(2),
      ),
    );
  }).toThrow();
}

describe('binaryDecoderTest', () => {
  /** Tests the decoder instance cache. */
  it('testInstanceCache', () => {
    // Empty the instance caches.
    BinaryDecoder.resetInstanceCache();

    // Allocating and then freeing a decoder should put it in the instance
    // cache.
    BinaryDecoder.alloc().free();

    expect(BinaryDecoder.getInstanceCache().length).toEqual(1);

    // Allocating and then freeing three decoders should leave us with three in
    // the cache.

    const decoder1 = BinaryDecoder.alloc();
    const decoder2 = BinaryDecoder.alloc();
    const decoder3 = BinaryDecoder.alloc();
    decoder1.free();
    decoder2.free();
    decoder3.free();

    expect(BinaryDecoder.getInstanceCache().length).toEqual(3);
  });

  describe('varint64', () => {
    let /** !BinaryEncoder */ encoder;
    let /** !BinaryDecoder */ decoder;

    const a = { lo: 0x00000000, hi: 0x00000000 };
    const b = { lo: 0x00003412, hi: 0x00000000 };
    const c = { lo: 0x78563412, hi: 0x21436587 };
    const d = { lo: 0xFFFFFFFF, hi: 0xFFFFFFFF };
    beforeEach(() => {
      encoder = new BinaryEncoder();

      encoder.writeSplitVarint64(a.lo, a.hi);
      encoder.writeSplitVarint64(b.lo, b.hi);
      encoder.writeSplitVarint64(c.lo, c.hi);
      encoder.writeSplitVarint64(d.lo, d.hi);

      encoder.writeSplitFixed64(a.lo, a.hi);
      encoder.writeSplitFixed64(b.lo, b.hi);
      encoder.writeSplitFixed64(c.lo, c.hi);
      encoder.writeSplitFixed64(d.lo, d.hi);

      decoder = BinaryDecoder.alloc(encoder.end());
    });

    it('reads split 64 bit integers', () => {
      function hexJoin(bitsLow, bitsHigh) {
        return `0x${(bitsHigh >>> 0).toString(16)}:0x${(bitsLow >>> 0).toString(16)}`;
      }
      function hexJoinPair(p) {
        return hexJoin(p.lo, p.hi);
      }

      expect(BinaryDecoder.readSplitVarint64(decoder, hexJoin)).toEqual(hexJoinPair(a));
      expect(BinaryDecoder.readSplitVarint64(decoder, hexJoin)).toEqual(hexJoinPair(b));
      expect(BinaryDecoder.readSplitVarint64(decoder, hexJoin)).toEqual(hexJoinPair(c));
      expect(BinaryDecoder.readSplitVarint64(decoder, hexJoin)).toEqual(hexJoinPair(d));

      expect(BinaryDecoder.readSplitFixed64(decoder, hexJoin)).toEqual(hexJoinPair(a));
      expect(BinaryDecoder.readSplitFixed64(decoder, hexJoin)).toEqual(hexJoinPair(b));
      expect(BinaryDecoder.readSplitFixed64(decoder, hexJoin)).toEqual(hexJoinPair(c));
      expect(BinaryDecoder.readSplitFixed64(decoder, hexJoin)).toEqual(hexJoinPair(d));
    });
    it('split 64 out of range', () => {
      decoder = BinaryDecoder.alloc(new Uint8Array([0, 1, 2]));
      expect(() => BinaryDecoder.readSplitFixed64(decoder, (hi, low) => {
        throw new Error();
      })).toThrowError('Tried to read past the end of the data 8 > 3');
    });
  });

  describe('sint64', () => {
    let /** !BinaryDecoder */ decoder;

    const a = { lo: 0x00000000, hi: 0x00000000 };
    const b = { lo: 0x00003412, hi: 0x00000000 };
    const c = { lo: 0x78563412, hi: 0x21436587 };
    const d = { lo: 0xFFFFFFFF, hi: 0xFFFFFFFF };
    beforeEach(() => {
      const encoder = new BinaryEncoder();

      encoder.writeSplitZigzagVarint64(a.lo, a.hi);
      encoder.writeSplitZigzagVarint64(b.lo, b.hi);
      encoder.writeSplitZigzagVarint64(c.lo, c.hi);
      encoder.writeSplitZigzagVarint64(d.lo, d.hi);

      decoder = BinaryDecoder.alloc(encoder.end());
    });

    it('reads 64-bit integers as decimal strings', () => {
      expect(BinaryDecoder.readZigzagVarint64String(decoder))
        .toEqual(utils.joinSignedDecimalString(a.lo, a.hi));
      expect(BinaryDecoder.readZigzagVarint64String(decoder))
        .toEqual(utils.joinSignedDecimalString(b.lo, b.hi));
      expect(BinaryDecoder.readZigzagVarint64String(decoder))
        .toEqual(utils.joinSignedDecimalString(c.lo, c.hi));
      expect(BinaryDecoder.readZigzagVarint64String(decoder))
        .toEqual(utils.joinSignedDecimalString(d.lo, d.hi));
    });

    it('reads split 64 bit zigzag integers', () => {
      function hexJoin(bitsLow, bitsHigh) {
        return `0x${(bitsHigh >>> 0).toString(16)}:0x${(bitsLow >>> 0).toString(16)}`;
      }
      function hexJoinPair(p) {
        return hexJoin(p.lo, p.hi);
      }

      expect(BinaryDecoder.readSplitZigzagVarint64(decoder, hexJoin)).toEqual(hexJoinPair(a));
      expect(BinaryDecoder.readSplitZigzagVarint64(decoder, hexJoin)).toEqual(hexJoinPair(b));
      expect(BinaryDecoder.readSplitZigzagVarint64(decoder, hexJoin)).toEqual(hexJoinPair(c));
      expect(BinaryDecoder.readSplitZigzagVarint64(decoder, hexJoin)).toEqual(hexJoinPair(d));
    });

    it('does zigzag encoding properly', () => {
      // Test cases direcly from the protobuf dev guide.
      // https://engdoc.corp.google.com/eng/howto/protocolbuffers/developerguide/encoding.shtml?cl=head#types
      const testCases = [
        { original: '0', zigzag: '0' },
        { original: '-1', zigzag: '1' },
        { original: '1', zigzag: '2' },
        { original: '-2', zigzag: '3' },
        { original: '2147483647', zigzag: '4294967294' },
        { original: '-2147483648', zigzag: '4294967295' },
        // 64-bit extremes, not in dev guide.
        { original: '9223372036854775807', zigzag: '18446744073709551614' },
        { original: '-9223372036854775808', zigzag: '18446744073709551615' },
      ];
      const encoder = new BinaryEncoder();
      testCases.forEach((c) => {
        encoder.writeZigzagVarint64String(c.original);
      });
      const buffer = encoder.end();
      const zigzagDecoder = BinaryDecoder.alloc(buffer);
      const varintDecoder = BinaryDecoder.alloc(buffer);
      testCases.forEach((c) => {
        expect(BinaryDecoder.readZigzagVarint64String(zigzagDecoder)).toEqual(c.original);
        expect(BinaryDecoder.readUnsignedVarint64String(varintDecoder)).toEqual(c.zigzag);
      });
    });
  });

  /** Tests reading and writing large strings */
  it('testLargeStrings', () => {
    const len = 150000;
    let long_string = '';
    for (let i = 0; i < len; i++) {
      long_string += 'a';
    }
    const decoder = BinaryDecoder.alloc(encodeUtf8(long_string));

    expect(decoder.readString(len, true)).toEqual(long_string);
  });

  /** Test encoding and decoding utf-8. */
  it('testUtf8', () => {

    const ascii = 'ASCII should work in 3, 2, 1...';
    const utf8_two_bytes = '©';
    const utf8_three_bytes = '❄';
    const utf8_four_bytes = '😁';

    expect(encodeUtf8(ascii).length).toBe(ascii.length);
    expect(encodeUtf8(utf8_two_bytes).length).toBe(2);
    expect(encodeUtf8(utf8_three_bytes).length).toBe(3);
    expect(encodeUtf8(utf8_four_bytes).length).toBe(4);

    const decoder = BinaryDecoder.alloc(new Uint8Array([
      ...encodeUtf8(ascii), ...encodeUtf8(utf8_two_bytes), ...encodeUtf8(utf8_three_bytes), ...encodeUtf8(utf8_four_bytes)
    ]));

    expect(decoder.readString(ascii.length, true)).toEqual(ascii);
    expect(decoder.readString(2, true)).toEqual(utf8_two_bytes);
    expect(decoder.readString(3, true)).toEqual(utf8_three_bytes);
    expect(decoder.readString(4, true)).toEqual(utf8_four_bytes);
  });

  it('test invalid utf8, repro b/191931501', () => {
    // "J\x06*e\xA9`\xF8'H8\x05\xC0" an errant value from b/191931501
    const decoder = BinaryDecoder.alloc(new Uint8Array([
      0x4A, 0x06, 0x2A, 0x65, 0xA9, 0x60, 0xF8, 0x27, 0x48, 0x38, 0x05, 0xC0
    ]));
    // This text is corrupted!  Not surprising since it is invalid utf8 of
    // course.
    expect(decoder.readString(12, false)).toEqual('J\u0006*e�`�\'H8\u0005�');
    expect(decoder.getCursor()).toEqual(12);  // but we didn't read past the end
    decoder.setCursor(0);
    // When we set requireUtf8, we get an error.
    expect(() => decoder.readString(12, true)).toThrow();
  });


  describe('bytes', () => {
    let /** Uint8Array */source;
    let /** Uint8Array */sourceCopy;
    beforeEach(() => {
      source = new Uint8Array([1, 2, 3, 255, 1, 2, 8, 4]);
      sourceCopy = new Uint8Array(source);
    });

    it('empty readBytes', () => {
      expect(BinaryDecoder.alloc(source).readBytes(0)).toEqual(
        new Uint8Array(0),
      );
    });
    it('empty readByteString', () => {
      expect(BinaryDecoder.alloc(source).readByteString(0)).toBe(
        ByteString.empty(),
      );
    });

    it('mutations to the source are not reflected in the output', () => {
      const decoded = BinaryDecoder.alloc(source).readBytes(source.length);

      expect(decoded).toEqual(sourceCopy);
      // Change the source array and ensure the underlying data was copied.
      source.set(new Uint8Array([7, 6, 5, 4, 3, 2, 1, 101]));

      // Assert that the decoded array hasn't changed.
      expect(decoded).toEqual(sourceCopy);
    });

    it('mutations to the source are not reflected in the output ByteString', () => {
      const decoded = BinaryDecoder.alloc(source).readByteString(source.length);

      expect(decoded.asUint8Array()).toEqual(sourceCopy);
      // Change the source array and ensure the underlying data was copied.
      source.set(new Uint8Array([7, 6, 5, 4, 3, 2, 1, 101]));

      // Assert that the decoded array hasn't changed.
      expect(decoded.asUint8Array()).toEqual(sourceCopy);
    });

    it('mutations to the output are not reflected in the source', () => {
      const decoded = BinaryDecoder.alloc(source).readBytes(source.length);

      // Change the output array and ensure the underlying data was copied.
      decoded.set(new Uint8Array([7, 6, 5, 4, 3, 2, 1, 101]));

      // Assert that the source hasn't changed.
      expect(sourceCopy).toEqual(source);
    });
  });


  /** Tests encoding and decoding of unsigned integers. */
  it('testUnsignedIntegers', () => {
    doTestUnsignedValue(
      BinaryDecoder.readUint8, BinaryEncoder.prototype.writeUint8,
      1, 0xFF, Math.round);

    doTestUnsignedValue(
      BinaryDecoder.readUint16, BinaryEncoder.prototype.writeUint16,
      1, 0xFFFF, Math.round);

    doTestUnsignedValue(
      BinaryDecoder.readUint32, BinaryEncoder.prototype.writeUint32,
      1, 0xFFFFFFFF, Math.round);

    doTestUnsigned64BitIntValue(BinaryDecoder.readUint64,
      BinaryEncoder.prototype.writeUint64);
  });

  /** Tests encoding and decoding of signed integers. */
  it('testSignedIntegers', () => {
    doTestSignedValue(
      BinaryDecoder.readInt8, BinaryEncoder.prototype.writeInt8, 1,
      -0x80, 0x7F, Math.round);

    doTestSignedValue(
      BinaryDecoder.readInt16, BinaryEncoder.prototype.writeInt16,
      1, -0x8000, 0x7FFF, Math.round);

    doTestSignedValue(
      BinaryDecoder.readInt32, BinaryEncoder.prototype.writeInt32,
      1, -0x80000000, 0x7FFFFFFF, Math.round);


    doTestSigned64BitIntValue(
      BinaryDecoder.readInt64, BinaryEncoder.prototype.writeInt64);
  });

  /** Tests encoding and decoding of floats. */
  it('testFloats', () => {
    /**
     * @param {number} x
     * @return {number}
     */
    function truncate(x) {
      const temp = new Float32Array(1);
      temp[0] = x;
      return temp[0];
    }
    doTestSignedValue(
      BinaryDecoder.readFloat, BinaryEncoder.prototype.writeFloat,
      BinaryConstants.FLOAT32_EPS, -BinaryConstants.FLOAT32_MAX,
      BinaryConstants.FLOAT32_MAX, truncate);

    doTestSignedValue(
      BinaryDecoder.readDouble, BinaryEncoder.prototype.writeDouble,
      BinaryConstants.FLOAT64_EPS * 10, -BinaryConstants.FLOAT64_MAX,
      BinaryConstants.FLOAT64_MAX, (x) => x);
  });
});
