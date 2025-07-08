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
 * @fileoverview Test cases for jspb's helper functions.
 *
 * Test suite is written using Jasmine -- see http://jasmine.github.io/
 *
 * @author aappleby@google.com (Austin Appleby)
 */

goog.require('goog.crypt');
goog.require('goog.crypt.base64');
goog.require('jspb.BinaryConstants');
goog.require('jspb.BinaryWriter');
goog.require('jspb.utils');

const BinaryWriter = goog.module.get('jspb.BinaryWriter');
const BinaryMessage = goog.module.get('jspb.BinaryConstants').BinaryMessage;
const FLOAT32_EPS = goog.module.get('jspb.BinaryConstants').FLOAT32_EPS;
const FLOAT32_MAX = goog.module.get('jspb.BinaryConstants').FLOAT32_MAX;
const FLOAT32_MIN = goog.module.get('jspb.BinaryConstants').FLOAT32_MIN;
const FLOAT64_EPS = goog.module.get('jspb.BinaryConstants').FLOAT64_EPS;
const FLOAT64_MAX = goog.module.get('jspb.BinaryConstants').FLOAT64_MAX;
const FLOAT64_MIN = goog.module.get('jspb.BinaryConstants').FLOAT64_MIN;
const byteArrayToString = goog.module.get('goog.crypt').byteArrayToString;
const encodeByteArray = goog.module.get('goog.crypt.base64').encodeByteArray;
const byteSourceToUint8Array = goog.module.get('jspb.utils').byteSourceToUint8Array;
const countDelimitedFields = goog.module.get('jspb.utils').countDelimitedFields;
const countFixed32Fields = goog.module.get('jspb.utils').countFixed32Fields;
const countFixed64Fields = goog.module.get('jspb.utils').countFixed64Fields;
const countVarintFields = goog.module.get('jspb.utils').countVarintFields;
const countVarints = goog.module.get('jspb.utils').countVarints;
const fromZigzag64 = goog.module.get('jspb.utils').fromZigzag64;
const getSplit64High = goog.module.get('jspb.utils').getSplit64High;
const getSplit64Low = goog.module.get('jspb.utils').getSplit64Low;
const hash64ArrayToDecimalStrings = goog.module.get('jspb.utils').hash64ArrayToDecimalStrings;
const hexStringToHash64 = goog.module.get('jspb.utils').hexStringToHash64;
const joinFloat32 = goog.module.get('jspb.utils').joinFloat32;
const joinFloat64 = goog.module.get('jspb.utils').joinFloat64;
const joinUnsignedDecimalString = goog.module.get('jspb.utils').joinUnsignedDecimalString;
const splitDecimalString = goog.module.get('jspb.utils').splitDecimalString;
const splitFloat32 = goog.module.get('jspb.utils').splitFloat32;
const splitFloat64 = goog.module.get('jspb.utils').splitFloat64;
const toZigzag64 = goog.module.get('jspb.utils').toZigzag64;


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
 * Converts an 64-bit integer in split representation to a 64-bit hash string
 * (8 bits encoded per character).
 * @param {number} bitsLow The low 32 bits of the split 64-bit integer.
 * @param {number} bitsHigh The high 32 bits of the split 64-bit integer.
 * @return {string} The encoded hash string, 8 bits per character.
 */
function toHashString(bitsLow, bitsHigh) {
  return String.fromCharCode(
    (bitsLow >>> 0) & 0xFF, (bitsLow >>> 8) & 0xFF, (bitsLow >>> 16) & 0xFF,
    (bitsLow >>> 24) & 0xFF, (bitsHigh >>> 0) & 0xFF, (bitsHigh >>> 8) & 0xFF,
    (bitsHigh >>> 16) & 0xFF, (bitsHigh >>> 24) & 0xFF);
}


describe('binaryUtilsTest', () => {
  /**
   * Tests lossless binary-to-decimal conversion.
   */
  it('testDecimalConversion', () => {
    // Check some magic numbers.
    let result = joinUnsignedDecimalString(0x89e80001, 0x8ac72304);
    expect(result).toEqual('10000000000000000001');

    result = joinUnsignedDecimalString(0xacd05f15, 0x1b69b4b);
    expect(result).toEqual('123456789123456789');

    result = joinUnsignedDecimalString(0xeb1f0ad2, 0xab54a98c);
    expect(result).toEqual('12345678901234567890');

    result = joinUnsignedDecimalString(0xe3b70cb1, 0x891087b8);
    expect(result).toEqual('9876543210987654321');

    // Check limits.
    result = joinUnsignedDecimalString(0x00000000, 0x00000000);
    expect(result).toEqual('0');

    result = joinUnsignedDecimalString(0xFFFFFFFF, 0xFFFFFFFF);
    expect(result).toEqual('18446744073709551615');

    // Check each bit of the low dword.
    for (let i = 0; i < 32; i++) {
      const low = (1 << i) >>> 0;
      result = joinUnsignedDecimalString(low, 0);
      expect(result).toEqual('' + Math.pow(2, i));
    }

    // Check the first 20 bits of the high dword.
    for (let i = 0; i < 20; i++) {
      const high = (1 << i) >>> 0;
      result = joinUnsignedDecimalString(0, high);
      expect(result).toEqual('' + Math.pow(2, 32 + i));
    }

    // V8's internal double-to-string conversion is inaccurate for values above
    // 2^52, even if they're representable integers - check the rest of the bits
    // manually against the correct string representations of 2^N.

    result = joinUnsignedDecimalString(0x00000000, 0x00100000);
    expect(result).toEqual('4503599627370496');

    result = joinUnsignedDecimalString(0x00000000, 0x00200000);
    expect(result).toEqual('9007199254740992');

    result = joinUnsignedDecimalString(0x00000000, 0x00400000);
    expect(result).toEqual('18014398509481984');

    result = joinUnsignedDecimalString(0x00000000, 0x00800000);
    expect(result).toEqual('36028797018963968');

    result = joinUnsignedDecimalString(0x00000000, 0x01000000);
    expect(result).toEqual('72057594037927936');

    result = joinUnsignedDecimalString(0x00000000, 0x02000000);
    expect(result).toEqual('144115188075855872');

    result = joinUnsignedDecimalString(0x00000000, 0x04000000);
    expect(result).toEqual('288230376151711744');

    result = joinUnsignedDecimalString(0x00000000, 0x08000000);
    expect(result).toEqual('576460752303423488');

    result = joinUnsignedDecimalString(0x00000000, 0x10000000);
    expect(result).toEqual('1152921504606846976');

    result = joinUnsignedDecimalString(0x00000000, 0x20000000);
    expect(result).toEqual('2305843009213693952');

    result = joinUnsignedDecimalString(0x00000000, 0x40000000);
    expect(result).toEqual('4611686018427387904');

    result = joinUnsignedDecimalString(0x00000000, 0x80000000);
    expect(result).toEqual('9223372036854775808');
  });

  /**
   * Sanity check the behavior of Javascript's strings when doing funny things
   * with unicode characters.
   */
  it('sanityCheckUnicodeStrings', () => {
    const strings = new Array(65536);

    // All possible unsigned 16-bit values should be storable in a string, they
    // shouldn't do weird things with the length of the string, and they should
    // come back out of the string unchanged.
    for (let i = 0; i < 65536; i++) {
      strings[i] = 'a' + String.fromCharCode(i) + 'a';
      expect(strings[i].length).toEqual(3);
      expect(strings[i].charCodeAt(1)).toEqual(i);
    }

    // Each unicode character should compare equal to itself and not equal to a
    // different unicode character.
    for (let i = 0; i < 65536; i++) {
      expect(strings[i] == strings[i]).toEqual(true);
      expect(strings[i] == strings[(i + 1) % 65536]).toEqual(false);
    }
  });


  /**
   * Tests conversion from 32-bit floating point numbers to split64 numbers.
   */
  it('testFloat32ToSplit64', () => {
    const f32_max_safe_int = joinFloat32(0x4b7fffff, 0);
    const f32_pi = Math.fround(Math.PI);

    // NaN.
    splitFloat32(NaN);
    expect(isNaN(joinFloat32(getSplit64Low(), getSplit64High()))).toEqual(true);

    /**
     * @param {number} x
     * @param {number=} opt_bits
     */
    function test(x, opt_bits) {
      splitFloat32(x);
      if (opt_bits !== undefined) {
        if (opt_bits != getSplit64Low()) throw 'fail!';
      }
      expect(truncate(x))
        .toEqual(joinFloat32(getSplit64Low(), getSplit64High()));
    }

    // Positive and negative infinity.
    test(Infinity, 0x7f800000);
    test(-Infinity, 0xff800000);

    // Positive and negative zero.
    test(0, 0x00000000);
    test(-0, 0x80000000);

    // Positive and negative epsilon.
    test(FLOAT32_EPS, 0x00000001);
    test(-FLOAT32_EPS, 0x80000001);

    // Positive and negative min.
    test(FLOAT32_MIN, 0x00800000);
    test(-FLOAT32_MIN, 0x80800000);

    // Positive and negative max.
    test(FLOAT32_MAX, 0x7F7FFFFF);
    test(-FLOAT32_MAX, 0xFF7FFFFF);

    // Positive and negative max_safe_int.
    test(f32_max_safe_int, 0x4B7FFFFF);
    test(-f32_max_safe_int, 0xCB7FFFFF);

    // Pi.
    test(f32_pi, 0x40490fdb);

    // corner cases
    test(0.9999999762949594, 0x3f800000);
    test(7.99999999999999, 0x41000000);
    test(Math.sin(30 * Math.PI / 180), 0x3f000000);  // sin(30 degrees)

    // Various positive values.
    let cursor = FLOAT32_EPS * 10;
    while (cursor != Infinity) {
      test(cursor);
      cursor *= 1.1;
    }

    // Various negative values.
    cursor = -FLOAT32_EPS * 10;
    while (cursor != -Infinity) {
      test(cursor);
      cursor *= 1.1;
    }
  });


  /**
   * Tests conversion from 64-bit floating point numbers to split64 numbers.
   */
  it('testFloat64ToSplit64', () => {
    // NaN.
    splitFloat64(NaN);
    expect(isNaN(joinFloat64(getSplit64Low(), getSplit64High()))).toEqual(true);

    /**
     * @param {number} x
     * @param {number=} opt_highBits
     * @param {number=} opt_lowBits
     */
    function test(x, opt_highBits, opt_lowBits) {
      splitFloat64(x);
      if (opt_highBits !== undefined) {
        const split64High = getSplit64High();
        expect(opt_highBits.toString(16)).toEqual(split64High.toString(16));
      }
      if (opt_lowBits !== undefined) {
        const split64Low = getSplit64Low();
        expect(opt_lowBits.toString(16)).toEqual(split64Low.toString(16));
      }
      expect(joinFloat64(getSplit64Low(), getSplit64High())).toEqual(x);
    }

    // Positive and negative infinity.
    test(Infinity, 0x7ff00000, 0x00000000);
    test(-Infinity, 0xfff00000, 0x00000000);

    // Positive and negative zero.
    test(0, 0x00000000, 0x00000000);
    test(-0, 0x80000000, 0x00000000);

    test(1, 0x3FF00000, 0x00000000);
    test(2, 0x40000000, 0x00000000);

    // Positive and negative epsilon.
    test(FLOAT64_EPS, 0x00000000, 0x00000001);
    test(-FLOAT64_EPS, 0x80000000, 0x00000001);

    // Positive and negative min.
    test(FLOAT64_MIN, 0x00100000, 0x00000000);
    test(-FLOAT64_MIN, 0x80100000, 0x00000000);

    // Positive and negative max.
    test(FLOAT64_MAX, 0x7FEFFFFF, 0xFFFFFFFF);
    test(-FLOAT64_MAX, 0xFFEFFFFF, 0xFFFFFFFF);

    test(Number.MAX_SAFE_INTEGER, 0x433FFFFF, 0xFFFFFFFF);
    test(Number.MIN_SAFE_INTEGER, 0xC33FFFFF, 0xFFFFFFFF);

    // Test various edge cases with mantissa of all 1, all 0, or just the
    // highest or lowest significant bit.
    test(4503599627370497, 0x43300000, 0x00000001);
    test(6755399441055744, 0x43380000, 0x00000000);
    test(1.348269851146737e+308, 0x7FE80000, 0x00000000);
    test(1.9999999999999998, 0x3FFFFFFF, 0xFFFFFFFF);
    test(2.225073858507201e-308, 0x000FFFFF, 0xFFFFFFFF);
    test(Math.PI, 0x400921fb, 0x54442d18);
    test(FLOAT32_MIN, 0x38100000, 0x00000000);

    // Various positive values.
    let cursor = FLOAT64_EPS * 10;
    while (cursor != Infinity) {
      test(cursor);
      cursor *= 1.1;
    }

    // Various negative values.
    cursor = -FLOAT64_EPS * 10;
    while (cursor != -Infinity) {
      test(cursor);
      cursor *= 1.1;
    }
  });

  /**
   * Tests zigzag conversions.
   */
  it('can encode and decode zigzag 64', () => {
    function stringToHiLoPair(str) {
      splitDecimalString(str);
      return { lo: getSplit64Low() >>> 0, hi: getSplit64High() >>> 0 };
    }
    function makeHiLoPair(lo, hi) {
      return { lo: lo >>> 0, hi: hi >>> 0 };
    }
    // Test cases directly from the protobuf dev guide.
    // https://engdoc.corp.google.com/eng/howto/protocolbuffers/developerguide/encoding.shtml?cl=head#types
    const testCases = [
      { original: stringToHiLoPair('0'), zigzag: stringToHiLoPair('0') },
      { original: stringToHiLoPair('-1'), zigzag: stringToHiLoPair('1') },
      { original: stringToHiLoPair('1'), zigzag: stringToHiLoPair('2') },
      { original: stringToHiLoPair('-2'), zigzag: stringToHiLoPair('3') },
      {
        original: stringToHiLoPair('2147483647'),
        zigzag: stringToHiLoPair('4294967294')
      },
      {
        original: stringToHiLoPair('-2147483648'),
        zigzag: stringToHiLoPair('4294967295')
      },
      // 64-bit extremes
      {
        original: stringToHiLoPair('9223372036854775807'),
        zigzag: stringToHiLoPair('18446744073709551614')
      },
      {
        original: stringToHiLoPair('-9223372036854775808'),
        zigzag: stringToHiLoPair('18446744073709551615')
      },
    ];
    for (const c of testCases) {
      expect(toZigzag64(c.original.lo, c.original.hi, makeHiLoPair))
        .toEqual(c.zigzag);
      expect(fromZigzag64(c.zigzag.lo, c.zigzag.hi, makeHiLoPair))
        .toEqual(c.original);
    }
  });


  /**
   * Tests counting packed varints.
   */
  it('testCountVarints', () => {
    const values = [];
    for (let i = 1; i < 1000000000; i *= 1.1) {
      values.push(Math.floor(i));
    }

    const writer = new BinaryWriter();
    writer.writePackedUint64(1, values);

    const buffer = new Uint8Array(writer.getResultBuffer());

    // We should have two more varints than we started with - one for the field
    // tag, one for the packed length.
    expect(countVarints(buffer, 0, buffer.length)).toEqual(values.length + 2);
  });


  /**
   * Tests counting matching varint fields.
   */
  it('testCountVarintFields', () => {
    let writer = new BinaryWriter();

    let count = 0;
    for (let i = 1; i < 1000000000; i *= 1.1) {
      writer.writeUint64(1, Math.floor(i));
      count++;
    }
    writer.writeString(2, 'terminator');

    let buffer = new Uint8Array(writer.getResultBuffer());
    expect(countVarintFields(buffer, 0, buffer.length, 1)).toEqual(count);

    writer = new BinaryWriter();

    count = 0;
    for (let i = 1; i < 1000000000; i *= 1.1) {
      writer.writeUint64(123456789, Math.floor(i));
      count++;
    }
    writer.writeString(2, 'terminator');

    buffer = new Uint8Array(writer.getResultBuffer());
    expect(countVarintFields(buffer, 0, buffer.length, 123456789)).toEqual(count);
  });


  /**
   * Tests counting matching fixed32 fields.
   */
  it('testCountFixed32Fields', () => {
    let writer = new BinaryWriter();

    let count = 0;
    for (let i = 1; i < 1000000000; i *= 1.1) {
      writer.writeFixed32(1, Math.floor(i));
      count++;
    }
    writer.writeString(2, 'terminator');

    let buffer = new Uint8Array(writer.getResultBuffer());
    expect(countFixed32Fields(buffer, 0, buffer.length, 1)).toEqual(count);

    writer = new BinaryWriter();

    count = 0;
    for (let i = 1; i < 1000000000; i *= 1.1) {
      writer.writeFixed32(123456789, Math.floor(i));
      count++;
    }
    writer.writeString(2, 'terminator');

    buffer = new Uint8Array(writer.getResultBuffer());
    expect(countFixed32Fields(buffer, 0, buffer.length, 123456789)).toEqual(count);
  });


  /**
   * Tests counting matching fixed64 fields.
   */
  it('testCountFixed64Fields', () => {
    let writer = new BinaryWriter();

    let count = 0;
    for (let i = 1; i < 1000000000; i *= 1.1) {
      writer.writeDouble(1, i);
      count++;
    }
    writer.writeString(2, 'terminator');

    let buffer = new Uint8Array(writer.getResultBuffer());
    expect(countFixed64Fields(buffer, 0, buffer.length, 1)).toEqual(count);

    writer = new BinaryWriter();

    count = 0;
    for (let i = 1; i < 1000000000; i *= 1.1) {
      writer.writeDouble(123456789, i);
      count++;
    }
    writer.writeString(2, 'terminator');

    buffer = new Uint8Array(writer.getResultBuffer());
    expect(countFixed64Fields(buffer, 0, buffer.length, 123456789)).toEqual(count);
  });


  /**
   * Tests counting matching delimited fields.
   */
  it('testCountDelimitedFields', () => {
    let writer = new BinaryWriter();

    let count = 0;
    for (let i = 1; i < 1000; i *= 1.1) {
      writer.writeBytes(1, [Math.floor(i)]);
      count++;
    }
    writer.writeString(2, 'terminator');

    let buffer = new Uint8Array(writer.getResultBuffer());
    expect(countDelimitedFields(buffer, 0, buffer.length, 1)).toEqual(count);

    writer = new BinaryWriter();

    count = 0;
    for (let i = 1; i < 1000; i *= 1.1) {
      writer.writeBytes(123456789, [Math.floor(i)]);
      count++;
    }
    writer.writeString(2, 'terminator');

    buffer = new Uint8Array(writer.getResultBuffer());
    expect(countDelimitedFields(buffer, 0, buffer.length, 123456789))
      .toEqual(count);
  });

  /**
   * Tests converting byte blob sources into byte blobs.
   */
  it('testByteSourceToUint8Array', () => {
    const convert = byteSourceToUint8Array;

    const sourceData = [];
    for (let i = 0; i < 256; i++) {
      sourceData.push(i);
    }

    const sourceBytes = new Uint8Array(sourceData);
    const sourceBuffer = sourceBytes.buffer;
    const sourceBase64 = encodeByteArray(sourceData);

    function check(result) {
      expect(result.constructor).toEqual(Uint8Array);
      expect(result.length).toEqual(sourceData.length);
      for (let i = 0; i < result.length; i++) {
        expect(result[i]).toEqual(sourceData[i]);
      }
    }

    // Converting Uint8Arrays into Uint8Arrays should be a no-op.
    expect(convert(sourceBytes)).toEqual(sourceBytes);

    // Converting Array<numbers> into Uint8Arrays should work.
    check(convert(sourceData));

    // Converting ArrayBuffers into Uint8Arrays should work.
    check(convert(sourceBuffer));

    // Converting base64-encoded strings into Uint8Arrays should work.
    check(convert(sourceBase64));
  });
});
