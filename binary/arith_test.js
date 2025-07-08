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
 * @fileoverview Test cases for Int64-manipulation functions.
 *
 * Test suite is written using Jasmine -- see http://jasmine.github.io/
 *
 * @author cfallin@google.com (Chris Fallin)
 */

goog.require('jspb.arith.Int64');
goog.require('jspb.arith.UInt64');

const Int64 = goog.module.get('jspb.arith').Int64;
const UInt64 = goog.module.get('jspb.arith').UInt64;


describe('binaryArithTest', () => {
  describe('UInt64', () => {
    const /** ReadonlyArray<[number, number, string]> */ testData = Object.freeze([
      [0x0, 0x0, '0'],
      [0xffffffff, 0xffffffff, '18446744073709551615'],
      [0xffffffff, 0x00000000, '4294967295'],
      [0x00000000, 0xffffffff, '18446744069414584320'],
      [0x000f4240, 0x00000000, '1000000'],
      [0x000f423f, 0x00000000, '999999'],
      [0xd4a51000, 0x0000000e8, '1000000000000'],
      [0xd4a50fff, 0x0000000e8, '999999999999'],
      [0x5e84c935, 0xcae33d0e, '14619595947299359029'],
      [0x62b3b8b8, 0x93480544, '10612738313170434232'],
      [0x319bfb13, 0xc01c4172, '13843011313344445203'],
      [0x5b8a65fb, 0xa5885b31, '11927883880638080507'],
      [0x6bdb80f1, 0xb0d1b16b, '12741159895737008369'],
      [0x4b82b442, 0x2e0d8c97, '3318463081876730946'],
      [0x780d5208, 0x7d76752c, '9040542135845999112'],
      [0x2e46800f, 0x0993778d, '690026616168284175'],
      [0xf00a7e32, 0xcd8e3931, '14811839111111540274'],
      [0x1baeccd6, 0x923048c4, '10533999535534820566'],
      [0x03669d29, 0xbff3ab72, '13831587386756603177'],
      [0x2526073e, 0x01affc81, '121593346566522686'],
      [0xc24244e0, 0xd7f40d0e, '15561076969511732448'],
      [0xc56a341e, 0xa68b66a7, '12000798502816461854'],
      [0x8738d64d, 0xbfe78604, '13828168534871037517'],
      [0x5baff03b, 0xd7572aea, '15516918227177304123'],
      [0x4a843d8a, 0x864e132b, '9677693725920476554'],
      [0x25b4e94d, 0x22b54dc6, '2500990681505655117'],
      [0x6bbe664b, 0x55a5cc0e, '6171563226690381387'],
      [0xee916c81, 0xb00aabb3, '12685140089732426881'],
    ]);

    // If BigInt is available, verify our test data with that.
    if (typeof BigInt !== 'undefined') {
      it('is tested with valid test data as verified with BigInt', () => {
        for (const testCase of testData) {
          const big = (BigInt(testCase[1]) << BigInt(32)) + BigInt(testCase[0]);
          expect(big.toString()).toEqual(testCase[2]);
        }
      });

      describe('fromBigInt', () => {
        it(`parses testData`, () => {
          for (const testCase of testData) {
            const roundtrip = UInt64.fromBigInt(BigInt(testCase[2]));
            expect(roundtrip.lo).withContext(testCase[2]).toEqual(testCase[0]);
            expect(roundtrip.hi).withContext(testCase[2]).toEqual(testCase[1]);
          }
        });
      });
    }

    describe('toDecimalString', () => {
      it(`serializes testData`, () => {
        for (const testCase of testData) {
          const a = new UInt64(testCase[0], testCase[1]);
          const actualString = a.toDecimalString();
          expect(actualString).withContext(testCase[2]).toEqual(testCase[2]);
        }
      });
    });

    describe('fromString', () => {
      it(`parses testData`, () => {
        for (const testCase of testData) {
          const roundtrip = UInt64.fromString(testCase[2]);
          expect(roundtrip.lo).withContext(testCase[2]).toEqual(testCase[0]);
          expect(roundtrip.hi).withContext(testCase[2]).toEqual(testCase[1]);
        }
      });

      it('parses empty string as zero', () => {
        expect(UInt64.fromString('')).toEqual(UInt64.fromString('0'));
      });

      it('does not parse non-decimal strings', () => {
        expect(UInt64.fromString('0x123')).toBeNull();
        expect(UInt64.fromString(' 123')).toBeNull();
      });

      it('tolerates extra leading zeros', () => {
        expect(UInt64.fromString('0018446744073709551615')).toEqual(
          UInt64.fromString('18446744073709551615'),
        );
      });

      it('truncates values that are too big', () => {
        // 0x1_FFFF_FFFF_FFFF_FFFF = 36893488147419103231
        // 0xFFFF_FFFF_FFFF_FFFF = 18446744073709551615
        expect(UInt64.fromString('36893488147419103231')).toEqual(
          UInt64.fromString('18446744073709551615'),
        );
      });
    });

    describe('negateInTwosComplement', () => {
      if (typeof BigInt !== 'undefined') {
        it('produces correct values', () => {
          for (const testCase of testData) {
            if (testCase[0] === 0 && testCase[1] === 0) continue;
            const result = new UInt64(
              testCase[0],
              testCase[1],
            ).negateInTwosComplement();
            const resultBigInt =
              (BigInt(result.hi) << BigInt(32)) + BigInt(result.lo);
            const expected =
              (BigInt(1) << BigInt(64)) -
              ((BigInt(testCase[1]) << BigInt(32)) + BigInt(testCase[0]));
            expect(resultBigInt).toEqual(expected);
          }
        });
      }

      it('round-trips', () => {
        for (const testCase of testData) {
          expect(
            new UInt64(testCase[0], testCase[1])
              .negateInTwosComplement()
              .negateInTwosComplement()
              .toDecimalString(),
          ).toBe(testCase[2]);
        }
      });
    });
  });

  describe('Int64', () => {
    const /** ReadonlyArray<[number, number, string]> */ testData = Object.freeze([
      [0x0, 0x0, '0'],
      [0xffffffff, 0xffffffff, '-1'],
      [0x00000000, 0x80000000, '-9223372036854775808'],
      [0xffffffff, 0x3fffffff, '4611686018427387903'],
      [0xffffffff, 0x00000000, '4294967295'],
      [0x00000000, 0xffffffff, '-4294967296'],
      [0x000f4240, 0x00000000, '1000000'],
      [0xd4a51000, 0x0000000e8, '1000000000000'],
      [0xc5bb087e, 0x931814a6, '-7847499644178593666'],
      [0xb58a5643, 0x3458a55b, '3771946501229139523'],
      [0x7113da74, 0x27de6fcf, '2872856549054995060'],
      [0x9d22f8c8, 0xafc92384, '-5780049594274350904'],
      [0x48c45eb1, 0x2ef59f66, '3383785956695105201'],
      [0x4f0a03e2, 0x294269f0, '2973055184857072610'],
      [0xd4e95c3a, 0xca29805e, '-3879428459215627206'],
      [0x934049d7, 0x3fb24a16, '4589812431064156631'],
      [0xd272e654, 0x75bd7dc4, '8484075557333689940'],
      [0x21f03f77, 0xeec5322, '1075325817098092407'],
      [0x12158d26, 0xc3ad6da7, '-4346697501012292314'],
      [0x7247925d, 0x22895b1f, '2488620459718316637'],
      [0xb8d3e7a0, 0x54d48381, '6112655187423520672'],
      [0xbf4836f8, 0xcd45d7c6, '-3655278273928612104'],
      [0xf853f23c, 0x2fba545b, '3439154019435803196'],
      [0xc004fc2d, 0xdef52fa, '1004112478843763757'],
      [0x394e4b63, 0xa4937731, '-6587790776614368413'],
      [0x596ed01a, 0x09382394, '664320065099714586'],
      [0xe3244770, 0x42106251, '4760412909973292912'],
      [0x92c2b290, 0x9233453d, '-7911903989602274672'],
    ]);

    // If BigInt is available, verify our test data with that.
    if (typeof BigInt !== 'undefined') {
      it('is tested with valid test data as verified with BigInt', () => {
        for (const testCase of testData) {
          let big = (BigInt(testCase[1]) << BigInt(32)) + BigInt(testCase[0]);
          if (testCase[2][0] === '-') {
            big -= BigInt(2 ** 64);
          }
          expect(big.toString()).toEqual(testCase[2]);
        }
      });

      describe('fromBigInt', () => {
        it(`parses testData`, () => {
          for (const testCase of testData) {
            const roundtrip = Int64.fromBigInt(BigInt(testCase[2]));
            expect(roundtrip.lo).withContext(testCase[2]).toEqual(testCase[0]);
            expect(roundtrip.hi).withContext(testCase[2]).toEqual(testCase[1]);
          }
        });
      });
    }

    describe('toDecimalString', () => {
      it(`serializes testData`, () => {
        for (const testCase of testData) {
          const a = new Int64(testCase[0], testCase[1]);
          const actualString = a.toDecimalString();
          expect(actualString).withContext(testCase[2]).toEqual(testCase[2]);
        }
      });
    });

    describe('fromString', () => {
      it(`parses testData`, () => {
        for (const testCase of testData) {
          const roundtrip = Int64.fromString(testCase[2]);
          expect(roundtrip.lo).withContext(testCase[2]).toEqual(testCase[0]);
          expect(roundtrip.hi).withContext(testCase[2]).toEqual(testCase[1]);
        }
      });

      it('parses empty string as zero', () => {
        expect(Int64.fromString('')).toEqual(Int64.fromString('0'));
      });

      it('parses -0 string as zero', () => {
        expect(Int64.fromString('-0')).toEqual(Int64.fromString('0'));
      });

      it('parses positive values that overflow into the negative space', () => {
        expect(
          Int64.fromString('9223372036854775808')?.toDecimalString(),
        ).toEqual('-9223372036854775808');
      });

      it('truncates values that are too big', () => {
        // 0x1_FFFF_FFFF_FFFF_FFFF = 36893488147419103231
        // 0xFFFF_FFFF_FFFF_FFFF = 18446744073709551615
        expect(Int64.fromString('36893488147419103231')).toEqual(
          Int64.fromString('18446744073709551615'),
        );
      });

      it('does not parse non-decimal strings', () => {
        expect(Int64.fromString('0x123')).toBeNull();
        expect(Int64.fromString(' 123')).toBeNull();
      });
    });
  });
});
