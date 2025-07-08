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
 * @fileoverview Test cases for jspb's binary protocol buffer writer. In
 * practice BinaryWriter is used to drive the Decoder and Reader test cases,
 * so only writer-specific tests are here.
 *
 * Test suite is written using Jasmine -- see http://jasmine.github.io/
 *
 * @author aappleby@google.com (Austin Appleby)
 */

goog.require('jspb.BinaryConstants');
goog.require('jspb.BinaryReader');
goog.require('jspb.binary.test_utils');
goog.require('jspb.BinaryWriter');
goog.require('jspb.bytestring');
goog.require('jspb.utils');
goog.require('goog.crypt');
goog.require('goog.crypt.base64');

const BinaryMessage = goog.module.get('jspb.BinaryConstants').BinaryMessage;
const BinaryReader = goog.module.get('jspb.BinaryReader');
const BinaryWriter = goog.module.get('jspb.BinaryWriter');
const ByteString = goog.module.get('jspb.bytestring').ByteString;
const FLOAT32_MAX = goog.module.get('jspb.BinaryConstants').FLOAT32_MAX;
const FLOAT32_MIN = goog.module.get('jspb.BinaryConstants').FLOAT32_MIN;
const base64 = goog.module.get('goog.crypt.base64');
const byteArrayToHex = goog.module.get('goog.crypt').byteArrayToHex;
const byteSourceToUint8Array = goog.module.get('jspb.utils').byteSourceToUint8Array;
const getSplit64High = goog.module.get('jspb.utils').getSplit64High;
const getSplit64Low = goog.module.get('jspb.utils').getSplit64Low;
const splitDecimalString = goog.module.get('jspb.utils').splitDecimalString;
const toHexFields = goog.module.get('jspb.binary.test_utils').toHexFields;

describe('binaryWriterTest', () => {
  /**
   * Verifies that misuse of the writer class triggers assertions.
   */
  it('testWriteErrors', () => {
    // Submessages with invalid field indices should assert.
    let writer = new BinaryWriter();
    const dummyMessage = /** @type {!BinaryMessage} */ ({});

    expect(() => {
      writer.writeMessage(-1, dummyMessage, goog.nullFunction);
    }).toThrowError();

    // Writing invalid field indices should assert.
    writer = new BinaryWriter();
    expect(() => {
      writer.writeUint64(-1, 1);
    }).toThrowError();

    // Writing out-of-range field values should assert.
    writer = new BinaryWriter();

    expect(() => {
      writer.writeInt32(1, -Infinity);
    }).toThrowError();
    expect(() => {
      writer.writeInt32(1, Infinity);
    }).toThrowError();

    expect(() => {
      writer.writeInt64(1, -Infinity);
    }).toThrowError();
    expect(() => {
      writer.writeInt64(1, Infinity);
    }).toThrowError();

    expect(() => {
      writer.writeUint32(1, -1);
    }).toThrowError();
    expect(() => {
      writer.writeUint32(1, Infinity);
    }).toThrowError();

    expect(() => {
      writer.writeUint64(1, -1);
    }).toThrowError();
    expect(() => {
      writer.writeUint64(1, Infinity);
    }).toThrowError();

    expect(() => {
      writer.writeSint32(1, -Infinity);
    }).toThrowError();
    expect(() => {
      writer.writeSint32(1, Infinity);
    }).toThrowError();

    expect(() => {
      writer.writeSint64(1, -Infinity);
    }).toThrowError();
    expect(() => {
      writer.writeSint64(1, Infinity);
    }).toThrowError();

    expect(() => {
      writer.writeFixed32(1, -1);
    }).toThrowError();
    expect(() => {
      writer.writeFixed32(1, Infinity);
    }).toThrowError();

    expect(() => {
      writer.writeFixed64(1, -1);
    }).toThrowError();
    expect(() => {
      writer.writeFixed64(1, Infinity);
    }).toThrowError();

    expect(() => {
      writer.writeSfixed32(1, -Infinity);
    }).toThrowError();
    expect(() => {
      writer.writeSfixed32(1, Infinity);
    }).toThrowError();

    expect(() => {
      writer.writeSfixed64(1, -Infinity);
    }).toThrowError();
    expect(() => {
      writer.writeSfixed64(1, Infinity);
    }).toThrowError();
  });


  /**
   * Basic test of retrieving the result as a Uint8Array buffer
   */
  it('testGetResultBuffer', () => {
    const expected = '0864120b48656c6c6f20776f726c641a0301020320c801';

    const writer = new BinaryWriter();
    writer.writeUint32(1, 100);
    writer.writeString(2, 'Hello world');
    writer.writeBytes(3, new Uint8Array([1, 2, 3]));
    writer.writeUint32(4, 200);

    const buffer = writer.getResultBuffer();
    expect(byteArrayToHex(buffer)).toEqual(expected);
  });


  /**
   * Tests websafe encodings for base64 strings.
   */
  it('testWebSafeOption', () => {
    const writer = new BinaryWriter();
    writer.writeBytes(1, new Uint8Array([127]));
    expect(writer.getResultBase64String()).toEqual('CgF/');
    expect(writer.getResultBase64String(base64.Alphabet.DEFAULT))
        .toEqual('CgF/');
    expect(writer.getResultBase64String(base64.Alphabet.WEBSAFE_NO_PADDING))
        .toEqual('CgF_');
  });

  it('writes split 64 fields', () => {
    const writer = new BinaryWriter();
    writer.writeSplitVarint64(1, 0x1, 0x2);
    writer.writeSplitVarint64(1, 0xFFFFFFFF, 0xFFFFFFFF);
    writer.writeSplitFixed64(2, 0x1, 0x2);
    writer.writeSplitFixed64(2, 0xFFFFFFF0, 0xFFFFFFFF);
    function lo(i) {
      return i + 1;
    }
    function hi(i) {
      return i + 2;
    }
    writer.writeRepeatedSplitVarint64(3, [0, 1, 2], lo, hi);
    writer.writeRepeatedSplitFixed64(4, [0, 1, 2], lo, hi);
    writer.writePackedSplitVarint64(5, [0, 1, 2], lo, hi);
    writer.writePackedSplitFixed64(6, [0, 1, 2], lo, hi);

    const reader = BinaryReader.alloc(writer.getResultBuffer());
    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(1);
    expect(reader.readSplitVarint64(bitsAsArray)).toEqual([0x1, 0x2]);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(1);
    expect(reader.readSplitVarint64(bitsAsArray)).toEqual([
      0xFFFFFFFF,
      0xFFFFFFFF,
    ]);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(2);
    expect(reader.readSplitFixed64(bitsAsArray)).toEqual([0x1, 0x2]);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(2);
    expect(reader.readSplitFixed64(bitsAsArray)).toEqual([
      0xFFFFFFF0,
      0xFFFFFFFF,
    ]);

    for (let i = 0; i < 3; i++) {
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(3);
      expect(reader.readSplitVarint64(bitsAsArray)).toEqual([i + 1, i + 2]);
    }

    for (let i = 0; i < 3; i++) {
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(4);
      expect(reader.readSplitFixed64(bitsAsArray)).toEqual([i + 1, i + 2]);
    }

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(5);
    const a = [];
    expect((reader.readPackableInt64StringInto(a), a)).toEqual([
      String(2 * 2 ** 32 + 1),
      String(3 * 2 ** 32 + 2),
      String(4 * 2 ** 32 + 3),
    ]);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(6);
    expect((a.length = 0, reader.readPackableFixed64StringInto(a), a)).toEqual([
      String(2 * 2 ** 32 + 1),
      String(3 * 2 ** 32 + 2),
      String(4 * 2 ** 32 + 3),
    ]);
  });

  it('writes packed 64bit string fields', () => {
    const MAX_UINT64 = '18446744073709551615';  // 0xFFFFFFFFFFFFFFFF
    const MAX_INT64 = '9223372036854775807';    // 0x7FFFFFFFFFFFFFFF
    const MIN_INT64 = '-9223372036854775808';   // 0x8000000000000000
    const signedValues = ['0', '-1', MAX_INT64, MIN_INT64];
    const unsignedValues = ['0', '1', MAX_UINT64];
    const writer = new BinaryWriter();
    writer.writePackedSfixed64String(1, signedValues);
    writer.writePackedInt64String(2, signedValues);
    writer.writePackedSint64String(3, signedValues);

    writer.writePackedFixed64String(4, unsignedValues);
    writer.writePackedUint64String(5, unsignedValues);

    const resultBuffer = writer.getResultBuffer();
    expect(toHexFields(resultBuffer)).toEqual({
      1: '0a20' +
          '0000000000000000' +  // 0
          'ffffffffffffffff' +  // -1
          'ffffffffffffff7f' +  // MAX_INT64
          '0000000000000080',   // MIN_INT64
      2: '121e' +
          '00' +                    // 0
          'ffffffffffffffffff01' +  // -1
          'ffffffffffffffff7f' +    // MAX_INT64
          '80808080808080808001',   // MIN_INT64
      3: '1a16' +
          '00' +                    // 0
          '01' +                    // -1
          'feffffffffffffffff01' +  // MAX_INT64
          'ffffffffffffffffff01',   // MIN_INT64
      4: '2218' +
          '0000000000000000' +  // 0
          '0100000000000000' +  // 1
          'ffffffffffffffff',   // MAX_UINT64
      5: '2a0c' +
          '00' +                   // 0
          '01' +                   // 1
          'ffffffffffffffffff01',  // MAX_UINT64
    });
    const reader = BinaryReader.alloc(resultBuffer);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(1);
    const /** !Array<string> */ results1 = [];
    reader.readPackableSfixed64StringInto(results1);
    expect(results1).toEqual(signedValues);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(2);
    const /** !Array<string> */ results2 = [];
    reader.readPackableInt64StringInto(results2);
    expect(results2).toEqual(signedValues);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(3);
    const /** !Array<string> */ results3 = [];
    reader.readPackableSint64StringInto(results3);
    expect(results3).toEqual(signedValues);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(4);
    const /** !Array<string> */ results4 = [];
    reader.readPackableFixed64StringInto(results4);
    expect(results4).toEqual(unsignedValues);

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(5);
    const /** !Array<string> */ results5 = [];
    reader.readPackableUint64StringInto(results5);
    expect(results5).toEqual(unsignedValues);
  });

  it('writes zigzag 64 fields', () => {
    // Test cases direcly from the protobuf dev guide.
    // https://engdoc.corp.google.com/eng/howto/protocolbuffers/developerguide/encoding.shtml?cl=head#types
    const testCases = [
      {original: '0', zigzag: '0'},
      {original: '-1', zigzag: '1'},
      {original: '1', zigzag: '2'},
      {original: '-2', zigzag: '3'},
      {original: '2147483647', zigzag: '4294967294'},
      {original: '-2147483648', zigzag: '4294967295'},
      // 64-bit extremes, not in dev guide.
      {original: '9223372036854775807', zigzag: '18446744073709551614'},
      {original: '-9223372036854775808', zigzag: '18446744073709551615'},
    ];
    function decimalToLowBits(v) {
      splitDecimalString(v);
      return getSplit64Low() >>> 0;
    }
    function decimalToHighBits(v) {
      splitDecimalString(v);
      return getSplit64High() >>> 0;
    }

    const writer = new BinaryWriter();
    testCases.forEach(c => {
      writer.writeSint64String(1, c.original);
      splitDecimalString(c.original);
      writer.writeSplitZigzagVarint64(1, getSplit64Low(), getSplit64High());
    });

    writer.writeRepeatedSint64String(2, testCases.map(c => c.original));

    writer.writeRepeatedSplitZigzagVarint64(
        4, testCases.map(c => c.original), decimalToLowBits, decimalToHighBits);

    writer.writePackedSint64String(5, testCases.map(c => c.original));

    writer.writePackedSplitZigzagVarint64(
        7, testCases.map(c => c.original), decimalToLowBits, decimalToHighBits);

    // Verify by reading the stream as normal int64 fields and checking with
    // the canonical zigzag encoding of each value.
    const reader = BinaryReader.alloc(writer.getResultBuffer());
    testCases.forEach(c => {
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(1);
      expect(reader.readUint64String()).toEqual(c.zigzag);
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(1);
      expect(reader.readUint64String()).toEqual(c.zigzag);
    });

    testCases.forEach(c => {
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(2);
      expect(reader.readUint64String()).toEqual(c.zigzag);
    });

    testCases.forEach(c => {
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(4);
      expect(reader.readUint64String()).toEqual(c.zigzag);
    });

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(5);
    const a = [];
    expect((reader.readPackableUint64StringInto(a), a))
        .toEqual(testCases.map(c => c.zigzag));

    reader.nextField();
    expect(reader.getFieldNumber()).toEqual(7);
    expect((a.length = 0, reader.readPackableUint64StringInto(a), a))
        .toEqual(testCases.map(c => c.zigzag));
  });

  it('writes float32 fields', () => {
    const testCases = [
      0,
      1,
      -1,
      FLOAT32_MIN,
      -FLOAT32_MIN,
      FLOAT32_MAX,
      -FLOAT32_MAX,
      3.1415927410125732,
      Infinity,
      -Infinity,
      NaN,
    ];
    const writer = new BinaryWriter();
    testCases.forEach(f => {
      writer.writeFloat(1, f);
    });
    const reader = BinaryReader.alloc(writer.getResultBuffer());
    testCases.forEach(f => {
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(1);
      if (isNaN(f)) {
        expect(isNaN(reader.readFloat())).toEqual(true);
      } else {
        expect(reader.readFloat()).toEqual(f);
      }
    });
  });

  it('writes double fields', () => {
    const testCases = [
      0,
      1,
      -1,
      Number.MAX_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER,
      Number.MAX_VALUE,
      Number.MIN_VALUE,
      FLOAT32_MIN,
      -FLOAT32_MIN,
      FLOAT32_MAX,
      -FLOAT32_MAX,
      Math.PI,
      Infinity,
      -Infinity,
      NaN,
    ];
    const writer = new BinaryWriter();
    testCases.forEach(f => {
      writer.writeDouble(1, f);
    });
    const reader = BinaryReader.alloc(writer.getResultBuffer());
    testCases.forEach(f => {
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(1);
      if (isNaN(f)) {
        expect(isNaN(reader.readDouble())).toEqual(true);
      } else {
        expect(reader.readDouble()).toEqual(f);
      }
    });
  });

  it('writes binary fields', () => {
    const testCases = [
      new Uint8Array([1, 2, 3]),
      // Test that we don't stackoverflow with large blocks.
      new Uint8Array(new Array(1000000).fill(1)),
      '1234',
      ByteString.fromBase64('5678'),
      ByteString.fromUint8Array(new Uint8Array([9, 10])),
    ];
    const writer = new BinaryWriter();
    testCases.forEach((f) => {
      writer.writeBytes(1, f);
    });
    const reader = BinaryReader.alloc(writer.getResultBuffer());
    testCases.forEach(f => {
      reader.nextField();
      expect(reader.getFieldNumber()).toEqual(1);
      expect(reader.readBytes()).toEqual(byteSourceToUint8Array(f));
    });
  });
});

/**
 * @param {number} lowBits
 * @param {number} highBits
 * @return {!Array<number>}
 */
function bitsAsArray(lowBits, highBits) {
  return [lowBits >>> 0, highBits >>> 0];
}
