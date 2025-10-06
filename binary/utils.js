/**
 * @fileoverview This file contains helper code used by BinaryReader
 * and BinaryWriter.
 *
 *
 * @author aappleby@google.com (Austin Appleby)
 */

goog.module('jspb.utils');
goog.module.declareLegacyNamespace();

const BinaryConstants = goog.require('jspb.BinaryConstants');
const { assert } = goog.require('goog.asserts');
const { isBigIntAvailable } = goog.require('jspb.internal_options');
const { ByteSource } = goog.require('jspb.binary.bytesource');
const { ByteString } = goog.require('jspb.bytestring');
const { decodeStringToUint8Array } = goog.require('goog.crypt.base64');
const { unsafeUint8ArrayFromByteString } = goog.require('jspb.unsafe_bytestring');

/**
 * Flag for browser support of Uint8Array slicing.
 *
 * This isn't available in every browser that supports Uint8Array
 *
 * See https://caniuse.com/mdn-javascript_builtins_typedarray_slice and
 * go/jscompiler-flags#browser-featureset-year-options
 * @const {boolean}
 */
const SUPPORTS_UINT8ARRAY_SLICING = goog.FEATURESET_YEAR >= 2018 ||
  (typeof Uint8Array.prototype.slice === 'function');


/** @const {number} */
const MAX_SCRATCHPAD_BYTES = 8;

/**
 * Returns a copy of a slice of a Uint8Array.
 *
 * @param {!Uint8Array} arr the input array to slice.
 * @param {number} startIdx The starting index of the slice.
 * @param {number} endIdx The ending index of the slice.
 * @return {!Uint8Array} the array slice.
 */
function sliceUint8Array(arr, startIdx, endIdx) {
  // See https://jsbench.me/ysl0kb8y54/1
  // This test is significantly faster than native slice performance for an
  // empty slice, and empty slices are not uncommon.
  if (startIdx === endIdx) {
    return new Uint8Array(0);
  }
  return SUPPORTS_UINT8ARRAY_SLICING ?
    arr.slice(startIdx, endIdx) :
    new Uint8Array(arr.subarray(startIdx, endIdx));
}

/**
 * Javascript can't natively handle 64-bit data types, so to manipulate them we
 * have to split them into two 32-bit halves and do the math manually.
 *
 * Instead of instantiating and passing small structures around to do this, we
 * instead just use two global temporary values. This one stores the low 32
 * bits of a split value - for example, if the original value was a 64-bit
 * integer, this temporary value will contain the low 32 bits of that integer.
 * If the original value was a double, this temporary value will contain the
 * low 32 bits of the binary representation of that double, etcetera.
 *
 * This value may be signed or unsigned for the same bit pattern. Coerce to a
 * specific interpretation before use if needed.
 * @type {number}
 */
let split64Low = 0;


/**
 * And correspondingly, this temporary variable will contain the high 32 bits
 * of whatever value was split.
 * @type {number}
 */
let split64High = 0;

/** @type {!DataView|undefined} */
let scratchpad;

/**
 * Splits an unsigned Javascript integer into two 32-bit halves and stores it
 * in the temp values above.
 * @param {number} value The number to split.
 */
function splitUint64(value) {
  // Extract low 32 bits and high 32 bits as unsigned integers.
  const lowBits = value >>> 0;
  const highBits = ((value - lowBits) / BinaryConstants.TWO_TO_32) >>> 0;

  split64Low = lowBits;
  split64High = highBits;
}

/**
 * Splits a signed Javascript integer into two 32-bit halves and stores it in
 * the temp values above.
 * @param {number} value The number to split.
 */
function splitInt64(value) {
  // Perform two's complement conversion if the sign bit was set.
  if (value < 0) {
    // Convert to sign-magnitude representation.
    splitUint64(0 - value);
    const [negLow, negHigh] = negate(split64Low, split64High);
    split64Low = negLow >>> 0;
    split64High = negHigh >>> 0;
  } else {
    splitUint64(value);
  }
}


/**
 * Converts a signed Javascript integer into zigzag format, splits it into two
 * 32-bit halves, and stores it in the temp values above.
 * @param {number} value The number to split.
 */
function splitZigzag64(value) {
  // Convert to sign-magnitude and scale by 2 before we split the value.
  const sign = (value < 0);
  value = Math.abs(value) * 2;

  splitUint64(value);
  let lowBits = split64Low;
  let highBits = split64High;

  // If the value is negative, subtract 1 from the split representation so we
  // don't lose the sign bit due to precision issues.
  if (sign) {
    if (lowBits == 0) {
      if (highBits == 0) {
        lowBits = 0xFFFFFFFF;
        highBits = 0xFFFFFFFF;
      } else {
        highBits--;
        lowBits = 0xFFFFFFFF;
      }
    } else {
      lowBits--;
    }
  }

  split64Low = lowBits;
  split64High = highBits;
}

/**
 * Initialize the scratchpad `DataView` to the given number of bytes and
 * returns scratchpad.
 * @param {number} numBytes
 * @return {!DataView}
 */
function getScratchpad(numBytes) {
  assert(numBytes <= MAX_SCRATCHPAD_BYTES);
  return scratchpad ||
    (scratchpad = new DataView(new ArrayBuffer(MAX_SCRATCHPAD_BYTES)));
}

/**
 * Converts a floating-point number into 32-bit IEEE representation and stores
 * it in the temp values above.
 * @param {number|string} value to split. Accepts 'Infinity'/'-Infinity'/'NaN'
 *     for JSPB wire format compatibility.
 */
function splitFloat32(value) {
  const scratch = getScratchpad(/* numBytes= */ 4);
  //  See go/proto-encoding#cheat-sheet re: little endian.
  scratch.setFloat32(0, +value, /* littleEndian= */ true);
  split64High = 0;
  split64Low = scratch.getUint32(0, /* littleEndian = */ true);
}


/**
 * Converts a floating-point number into 64-bit IEEE representation and stores
 * it in the temp values above.
 * @param {number|string} value to split. Accepts 'Infinity'/'-Infinity'/'NaN'
 *     for JSPB wire format compatibility.
 */
function splitFloat64(value) {
  const scratch = getScratchpad(/* numBytes= */ 8);
  //  See go/proto-encoding#cheat-sheet re: little endian.
  scratch.setFloat64(0, +value, /* littleEndian= */ true);
  split64Low = scratch.getUint32(0, /* littleEndian = */ true);
  split64High = scratch.getUint32(4, /* littleEndian = */ true);
}


/**
 * Converts an 8-byte array into two 32-bit numbers and stores them in the temp
 * values above.
 * @param {!Array<number>} bytes
 */
function splitBytes64(bytes) {
  const [a, b, c, d, e, f, g, h] = bytes;

  split64Low = (a + (b << 8) + (c << 16) + (d << 24)) >>> 0;
  split64High = (e + (f << 8) + (g << 16) + (h << 24)) >>> 0;
}


/**
 * Joins two 32-bit values into a 64-bit unsigned integer. Value will be
 * returned as a string if it is greater than 2^52 to avoid precision loss.
 * @param {number} bitsLow
 * @param {number} bitsHigh
 * @return {number}
 */
function joinUint64(bitsLow, bitsHigh) {
  const maybeUnsafeValue =
    bitsHigh * BinaryConstants.TWO_TO_32 + (bitsLow >>> 0);
  return Number.isSafeInteger(maybeUnsafeValue) ?
    maybeUnsafeValue : /** @type {number} */
    (/** @type {*} */ (joinUnsignedDecimalString(bitsLow, bitsHigh)));
}

/**
 * Joins two 32-bit values into a 64-bit signed integer. Value will be
 * returned as a string if it outside of the safe integer range.
 * @param {number} bitsLow
 * @param {number} bitsHigh
 * @return {number}
 */
function joinInt64(bitsLow, bitsHigh) {
  // If the high bit is set, do a manual two's complement conversion.
  const sign = (bitsHigh & 0x80000000);
  if (sign) {
    bitsLow = (~bitsLow + 1) >>> 0;
    bitsHigh = ~bitsHigh >>> 0;
    if (bitsLow == 0) {
      bitsHigh = (bitsHigh + 1) >>> 0;
    }
  }

  const result = joinUint64(bitsLow, bitsHigh);
  if (typeof result === 'number') {
    return sign ? -result : result;
  }

  return sign ? /** @type {number} */ (/** @type {*} */ ('-' + result)) :
    result;
}

/**
 * Converts 32-bit values from standard two's complement encoding to zig-zag
 * encoding.
 *
 * @param {number} value
 * @return {number}
 */
function toZigzag32(value) {
  return ((value << 1) ^ (value >> 31)) >>> 0;
}

/**
 * Converts split 64-bit values from standard two's complement encoding to
 * zig-zag encoding. Invokes the provided function to produce final result.
 *
 * @param {number} bitsLow
 * @param {number} bitsHigh
 * @param {function(number, number): T} convert Conversion function to produce
 *     the result value, takes parameters (lowBits, highBits).
 * @return {T}
 * @template T
 */
function toZigzag64(bitsLow, bitsHigh, convert) {
  // See
  // https://engdoc.corp.google.com/eng/howto/protocolbuffers/developerguide/encoding.shtml?cl=head#types
  // 64-bit math is: (n << 1) ^ (n >> 63)
  //
  // To do this in 32 bits, we can get a 32-bit sign-flipping mask from the
  // high word.
  // Then we can operate on each word individually, with the addition of the
  // "carry" to get the most significant bit from the low word into the high
  // word.
  const signFlipMask = bitsHigh >> 31;
  bitsHigh = (bitsHigh << 1 | bitsLow >>> 31) ^ signFlipMask;
  bitsLow = (bitsLow << 1) ^ signFlipMask;
  return convert(bitsLow, bitsHigh);
}


/**
 * Joins two 32-bit values into a 64-bit unsigned integer and applies zigzag
 * decoding. Precision will be lost if the result is greater than 2^52.
 * @param {number} bitsLow
 * @param {number} bitsHigh
 * @return {number}
 */
function joinZigzag64(bitsLow, bitsHigh) {
  return fromZigzag64(bitsLow, bitsHigh, joinInt64);
}

/**
 * Converts 32-bit value from zigzag encoding to standard two's
 * complement encoding.
 * @param {number} zigzag
 * @return {number}
 */
function fromZigzag32(zigzag) {
  const signFlipMask = -(zigzag & 1);
  return (zigzag >>> 1) ^ signFlipMask;
}

/**
 * Converts split 64-bit values from zigzag encoding to standard two's
 * complement encoding. Invokes the provided function to produce final result.
 *
 * @param {number} bitsLow
 * @param {number} bitsHigh
 * @param {function(number, number): T} convert Conversion function to produce
 *     the result value, takes parameters (lowBits, highBits).
 * @return {T}
 * @template T
 */
function fromZigzag64(bitsLow, bitsHigh, convert) {
  // 64 bit math is:
  //   signmask = (zigzag & 1) ? -1 : 0;
  //   twosComplement = (zigzag >> 1) ^ signmask;
  //
  // To work with 32 bit, we can operate on both but "carry" the lowest bit
  // from the high word by shifting it up 31 bits to be the most significant bit
  // of the low word.
  const signFlipMask = -(bitsLow & 1);
  bitsLow = ((bitsLow >>> 1) | (bitsHigh << 31)) ^ signFlipMask;
  bitsHigh = (bitsHigh >>> 1) ^ signFlipMask;
  return convert(bitsLow, bitsHigh);
}


/**
 * Joins two 32-bit values into a 32-bit IEEE floating point number and
 * converts it back into a Javascript number.
 * @param {number} bitsLow The low 32 bits of the binary number;
 * @param {number} bitsHigh The high 32 bits of the binary number.
 * @return {number}
 */
function joinFloat32(bitsLow, bitsHigh) {
  const sign = ((bitsLow >> 31) * 2 + 1);
  const exp = (bitsLow >>> 23) & 0xFF;
  const mant = bitsLow & 0x7FFFFF;

  if (exp == 0xFF) {
    if (mant) {
      return NaN;
    } else {
      return sign * Infinity;
    }
  }

  if (exp == 0) {
    // Denormal.
    return sign * Math.pow(2, -149) * mant;
  } else {
    return sign * Math.pow(2, exp - 150) * (mant + Math.pow(2, 23));
  }
}


/**
 * Joins two 32-bit values into a 64-bit IEEE floating point number and
 * converts it back into a Javascript number.
 * @param {number} bitsLow The low 32 bits of the binary number;
 * @param {number} bitsHigh The high 32 bits of the binary number.
 * @return {number}
 */
function joinFloat64(bitsLow, bitsHigh) {
  const sign = ((bitsHigh >> 31) * 2 + 1);
  const exp = (bitsHigh >>> 20) & 0x7FF;
  const mant = BinaryConstants.TWO_TO_32 * (bitsHigh & 0xFFFFF) + bitsLow;

  if (exp == 0x7FF) {
    if (mant) {
      return NaN;
    } else {
      return sign * Infinity;
    }
  }

  if (exp == 0) {
    // Denormal.
    return sign * Math.pow(2, -1074) * mant;
  } else {
    return sign * Math.pow(2, exp - 1075) * (mant + BinaryConstants.TWO_TO_52);
  }
}

/**
 * Losslessly converts a 64-bit unsigned integer in 32:32 split representation
 * into a decimal string.
 * @param {number} bitsLow The low 32 bits of the binary number;
 * @param {number} bitsHigh The high 32 bits of the binary number.
 * @return {string} The binary number represented as a string.
 */
function joinUnsignedDecimalString(bitsLow, bitsHigh) {
  // Must ensure the values are handled as unsigned, any bitwise operations
  // on the input arguments would have turned them into signed values (e.g.
  // zigzag decoding).
  bitsHigh = bitsHigh >>> 0;
  bitsLow = bitsLow >>> 0;
  // Skip the expensive conversion if the number is small enough to use the
  // built-in conversions.
  // Number.MAX_SAFE_INTEGER = 0x001FFFFF FFFFFFFF, thus any number with
  // bitsHigh <= 0x1FFFFF can be safely expressed with a double and retain
  // integer precision.
  // Proven by: Number.isSafeInteger(0x1FFFFF * 2**32 + 0xFFFFFFFF) == true.
  // Even when BigInt is supported, it's faster to avoid the conversion to
  // bigint and back.
  if (bitsHigh <= 0x1FFFFF) {
    return '' + (BinaryConstants.TWO_TO_32 * bitsHigh + bitsLow);
  } else if (isBigIntAvailable()) {
    return '' + (BigInt(bitsHigh) << BigInt(32) | BigInt(bitsLow));
  }
  return joinUnsignedDecimalStringFallback(bitsLow, bitsHigh);
}

/**
 * Losslessly converts a 64-bit unsigned integer in 32:32 split representation
 * into a decimal string without using BigInt.
 * @param {number} bitsLow The unsigned low 32 bits of the binary number;
 * @param {number} bitsHigh The unsigned high 32 bits of the binary number.
 * @return {string} The binary number represented as a string.
 * @package For Testing only.
 */
function joinUnsignedDecimalStringFallback(bitsLow, bitsHigh) {
  // What this code is doing is essentially converting the input number from
  // base-2 to base-1e7, which allows us to represent the 64-bit range with
  // only 3 (very large) digits. Those digits are then trivial to convert to
  // a base-10 string.

  // Split 32:32 representation into 16:24:24 representation so our
  // intermediate digits don't overflow.
  const low = bitsLow & LOW_24_BITS;
  const mid = ((bitsLow >>> 24) | (bitsHigh << 8)) & LOW_24_BITS;
  const high = (bitsHigh >> 16) & LOW_16_BITS;

  // Assemble our three base-1e7 digits, ignoring carries. The maximum
  // value in a digit at this step is representable as a 48-bit integer, which
  // can be stored in a 64-bit floating point number.

  // The magic numbers used here are -
  // 2^24 = 16777216 = (1,6777216) in base-1e7.
  // 2^48 = 281474976710656 = (2,8147497,6710656) in base-1e7.
  let digitA = low + (mid * 6777216) + (high * 6710656);
  let digitB = mid + (high * 8147497);
  let digitC = (high * 2);

  // Apply carries from A to B and from B to C.
  const base = 10000000;
  if (digitA >= base) {
    digitB += (digitA / base) >>> 0;
    digitA %= base;
  }

  if (digitB >= base) {
    digitC += (digitB / base) >>> 0;
    digitB %= base;
  }

  // If digitC is 0, then we should have returned in the trivial code path
  // at the top for non-safe integers. Given this, we can assume both digitB
  // and digitA need leading zeros.
  assert(digitC);
  return digitC + decimalFrom1e7WithLeadingZeros(digitB) +
    decimalFrom1e7WithLeadingZeros(digitA);
}

/**
 * @param {number} digit1e7 Number < 1e7
 * @return {string} Decimal representation of digit1e7 with leading zeros.
 */
function decimalFrom1e7WithLeadingZeros(digit1e7) {
  const partial = String(digit1e7);
  return '0000000'.slice(partial.length) + partial;
}

/**
 * Losslessly converts a 64-bit signed integer in 32:32 split representation
 * into a decimal string.
 * @param {number} bitsLow The low 32 bits of the binary number;
 * @param {number} bitsHigh The high 32 bits of the binary number.
 * @return {string} The binary number represented as a string.
 */
function joinSignedDecimalString(bitsLow, bitsHigh) {
  const negative = (bitsHigh & 0x80000000);
  if (negative) {
    if (isBigIntAvailable()) {
      return '' +
        ((BigInt(bitsHigh | 0) << BigInt(32)) | BigInt(bitsLow >>> 0));
    }
    return joinNegativeDecimalStringFallback(bitsLow, bitsHigh);
  } else {
    return joinUnsignedDecimalString(bitsLow, bitsHigh);
  }
}

/**
 * Losslessly converts a 64-bit signed integer in 32:32 split representation
 * into a number or decimal string, using a number when the value is between
 * [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER], or decimal string
 * otherwise.
 *
 * @param {number} bitsLow The low 32 bits of the binary number;
 * @param {number} bitsHigh The high 32 bits of the binary number.
 * @return {number|string} The number represented as a number or string.
 */
function joinSignedNumberOrDecimalString(bitsLow, bitsHigh) {
  const possiblyUnsafe = joinInt64(bitsLow, bitsHigh);
  if (Number.isSafeInteger(possiblyUnsafe)) {
    return possiblyUnsafe;
  }
  return joinSignedDecimalString(bitsLow, bitsHigh);
}

/**
 * Losslessly converts a 64-bit unsigned integer in 32:32 split representation
 * into a number or decimal string, using a number when the value is between
 * [0, Number.MAX_SAFE_INTEGER], or decimal string otherwise.
 *
 * @param {number} bitsLow The low 32 bits of the binary number;
 * @param {number} bitsHigh The high 32 bits of the binary number.
 * @return {number|string} The number represented as a number or string.
 */
function joinUnsignedNumberOrDecimalString(bitsLow, bitsHigh) {
  bitsHigh >>>= 0;
  const possiblyUnsafe = joinUint64(bitsLow, bitsHigh);
  if (Number.isSafeInteger(possiblyUnsafe)) {
    return possiblyUnsafe;
  }
  return joinUnsignedDecimalString(bitsLow, bitsHigh);
}

/**
 * Losslessly converts a 64-bit signed integer in 32:32 split representation
 * into a decimal string.
 * @param {number} bitsLow The low 32 bits of the binary number;
 * @param {number} bitsHigh The high 32 bits of the binary number.
 * @return {string} The binary number represented as a string.
 * @package For Testing only.
 */
function joinNegativeDecimalStringFallback(bitsLow, bitsHigh) {
  // Do a manual two's complement conversion before the decimal conversion.
  const [negLow, negHigh] = negate(bitsLow, bitsHigh);
  bitsLow = negLow;
  bitsHigh = negHigh;

  return '-' + joinUnsignedDecimalString(bitsLow, bitsHigh);
}

/**
 * Converts a signed or unsigned decimal string into two 32-bit halves, and
 * stores them in the temp variables listed above. Only the lower 64 bits of the
 * value are kept.
 * @param {string} value The decimal string to convert.
 */
function splitDecimalString(value) {
  assert(value.length > 0);

  // Strings that are shorter than MAX_SAFE_INTEGER are sure to be safe
  // to parse directly to a double for conversion with Int64.fromNumber.
  if (value.length < MAX_SAFE_INTEGER_DECIMAL_LENGTH) {
    splitInt64(Number(value));
    return;
  }

  if (isBigIntAvailable()) {
    const bigInt = BigInt(value);
    split64Low = Number(bigInt & BigInt(ALL_32_BITS)) >>> 0;
    split64High = Number((bigInt >> BigInt(32)) & BigInt(ALL_32_BITS));
  } else {
    splitDecimalStringFallback(value);
  }
}

/**
 * Converts a signed or unsigned decimal string into two 32-bit halves, and
 * stores them in the temp variables listed above. Only the lower 64 bits of the
 * value are kept.
 * @param {string} value The decimal string to convert.
 * @package For Testing only.
 */
function splitDecimalStringFallback(value) {
  assert(value.length > 0);
  // Check for minus sign.
  const firstDigitIndex = +(value[0] === '-');
  split64Low = 0;
  split64High = 0;
  const end = value.length;
  // Work 6 decimal digits at a time, acting like we're converting base 1e6
  // digits to binary. This is safe to do with floating point math because
  // Number.isSafeInteger(ALL_32_BITS * 1e6) == true.
  const base = 1e6;
  for (let sliceStart = 0 + firstDigitIndex,
    sliceEnd = (end - firstDigitIndex) % 6 + firstDigitIndex;
    sliceEnd <= end; sliceStart = sliceEnd, sliceEnd += 6) {
    const digit1e6 = Number(value.slice(sliceStart, sliceEnd));
    split64High *= base;
    split64Low = split64Low * base + digit1e6;
    // Carry bits from split64Low to
    if (split64Low >= BinaryConstants.TWO_TO_32) {
      split64High += Math.trunc(split64Low / BinaryConstants.TWO_TO_32);
      // Drop any bits higher than 64 as we accumulate
      split64High = split64High >>> 0;
      split64Low = split64Low >>> 0;
    }
  }

  if (firstDigitIndex /* != 0 */) {
    const [negLow, negHigh] = negate(split64Low, split64High);
    split64Low = negLow;
    split64High = negHigh;
  }
}

/**
 * @param {number} lowBits
 * @param {number} highBits
 * @return {!Array<number>} [low, high] words of the result.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators#Signed_32-bit_integers
 */
function negate(lowBits, highBits) {
  highBits = ~highBits;
  if (lowBits) {
    lowBits = ~lowBits + 1;
  } else {
    // If lowBits is 0, then bitwise-not is 0xFFFFFFFF,
    // adding 1 to that, results in 0x100000000, which leaves
    // the low bits 0x0 and simply adds one to the high bits.
    highBits += 1;
  }
  return [lowBits, highBits];
}


/**
 * Counts the number of contiguous varints in a buffer.
 * @param {!Uint8Array} buffer The buffer to scan.
 * @param {number} start The starting point in the buffer to scan.
 * @param {number} end The end point in the buffer to scan.
 * @return {number} The number of varints in the buffer.
 */
function countVarints(buffer, start, end) {
  // Count how many high bits of each byte were set in the buffer.
  let count = 0;
  for (let i = start; i < end; i++) {
    count += buffer[i] >> 7;
  }

  // The number of varints in the buffer equals the size of the buffer minus
  // the number of non-terminal bytes in the buffer (those with the high bit
  // set).
  return (end - start) - count;
}


/**
 * Counts the number of contiguous varint fields with the given field number in
 * the buffer.
 * @param {!Uint8Array} buffer The buffer to scan.
 * @param {number} start The starting point in the buffer to scan.
 * @param {number} end The end point in the buffer to scan.
 * @param {number} field The field number to count.
 * @return {number} The number of matching fields in the buffer.
 */
function countVarintFields(buffer, start, end, field) {
  let count = 0;
  let cursor = start;
  const tag = field * 8 + BinaryConstants.WireType.VARINT;

  if (tag < 128) {
    // Single-byte field tag, we can use a slightly quicker count.
    while (cursor < end) {
      // Skip the field tag, or exit if we find a non-matching tag.
      if (buffer[cursor++] != tag) return count;

      // Field tag matches, we've found a valid field.
      count++;

      // Skip the varint.
      while (1) {
        const x = buffer[cursor++];
        if ((x & 0x80) == 0) break;
      }
    }
  } else {
    while (cursor < end) {
      // Skip the field tag, or exit if we find a non-matching tag.
      let temp = tag;
      while (temp > 128) {
        if (buffer[cursor] != ((temp & 0x7F) | 0x80)) return count;
        cursor++;
        temp >>= 7;
      }
      if (buffer[cursor++] != temp) return count;

      // Field tag matches, we've found a valid field.
      count++;

      // Skip the varint.
      while (1) {
        const x = buffer[cursor++];
        if ((x & 0x80) == 0) break;
      }
    }
  }
  return count;
}


/**
 * Counts the number of contiguous fixed32 fields with the given tag in the
 * buffer.
 * @param {!Uint8Array} buffer The buffer to scan.
 * @param {number} start The starting point in the buffer to scan.
 * @param {number} end The end point in the buffer to scan.
 * @param {number} tag The tag value to count.
 * @param {number} stride The number of bytes to skip per field.
 * @return {number} The number of fields with a matching tag in the buffer.
 * @private
 */
function countFixedFields_(buffer, start, end, tag, stride) {
  let count = 0;
  let cursor = start;

  if (tag < 128) {
    // Single-byte field tag, we can use a slightly quicker count.
    while (cursor < end) {
      // Skip the field tag, or exit if we find a non-matching tag.
      if (buffer[cursor++] != tag) return count;

      // Field tag matches, we've found a valid field.
      count++;

      // Skip the value.
      cursor += stride;
    }
  } else {
    while (cursor < end) {
      // Skip the field tag, or exit if we find a non-matching tag.
      let temp = tag;
      while (temp > 128) {
        if (buffer[cursor++] != ((temp & 0x7F) | 0x80)) return count;
        temp >>= 7;
      }
      if (buffer[cursor++] != temp) return count;

      // Field tag matches, we've found a valid field.
      count++;

      // Skip the value.
      cursor += stride;
    }
  }
  return count;
}


/**
 * Counts the number of contiguous fixed32 fields with the given field number
 * in the buffer.
 * @param {!Uint8Array} buffer The buffer to scan.
 * @param {number} start The starting point in the buffer to scan.
 * @param {number} end The end point in the buffer to scan.
 * @param {number} field The field number to count.
 * @return {number} The number of matching fields in the buffer.
 */
function countFixed32Fields(buffer, start, end, field) {
  const tag = field * 8 + BinaryConstants.WireType.FIXED32;
  return countFixedFields_(buffer, start, end, tag, 4);
}


/**
 * Counts the number of contiguous fixed64 fields with the given field number
 * in the buffer.
 * @param {!Uint8Array} buffer The buffer to scan.
 * @param {number} start The starting point in the buffer to scan.
 * @param {number} end The end point in the buffer to scan.
 * @param {number} field The field number to count
 * @return {number} The number of matching fields in the buffer.
 */
function countFixed64Fields(buffer, start, end, field) {
  const tag = field * 8 + BinaryConstants.WireType.FIXED64;
  return countFixedFields_(buffer, start, end, tag, 8);
}


/**
 * Counts the number of contiguous delimited fields with the given field number
 * in the buffer.
 * @param {!Uint8Array} buffer The buffer to scan.
 * @param {number} start The starting point in the buffer to scan.
 * @param {number} end The end point in the buffer to scan.
 * @param {number} field The field number to count.
 * @return {number} The number of matching fields in the buffer.
 */
function countDelimitedFields(buffer, start, end, field) {
  let count = 0;
  let cursor = start;
  const tag = field * 8 + BinaryConstants.WireType.DELIMITED;

  while (cursor < end) {
    // Skip the field tag, or exit if we find a non-matching tag.
    let temp = tag;
    while (temp > 128) {
      if (buffer[cursor++] != ((temp & 0x7F) | 0x80)) return count;
      temp >>= 7;
    }
    if (buffer[cursor++] != temp) return count;

    // Field tag matches, we've found a valid field.
    count++;

    // Decode the length prefix.
    let length = 0;
    let shift = 1;
    while (1) {
      temp = buffer[cursor++];
      length += (temp & 0x7f) * shift;
      shift *= 128;
      if ((temp & 0x80) == 0) break;
    }

    // Advance the cursor past the blob.
    cursor += length;
  }
  return count;
}

/**
 * Converts any type defined in ByteSource into a Uint8Array.
 * @param {!ByteSource|!ByteString} data
 * @param {boolean=} copyByteString whether to make a copy of ByteString
 *     internal data
 * @return {!Uint8Array}
 * @suppress {invalidCasts}
 */
function byteSourceToUint8Array(data, copyByteString) {
  // Comparing a property is much faster than the instanceof test below, so
  // prefer this.
  if (data.constructor === Uint8Array) {
    return /** @type {!Uint8Array} */ (data);
  }

  if (data.constructor === ArrayBuffer) {
    data = /** @type {!ArrayBuffer} */ (data);
    return /** @type {!Uint8Array} */ (new Uint8Array(data));
  }

  if (data.constructor === Array) {
    data = /** @type {!Array<number>} */ (data);
    return /** @type {!Uint8Array} */ (new Uint8Array(data));
  }

  if (data.constructor === String) {
    data = /** @type {string} */ (data);
    return decodeStringToUint8Array(data);
  }

  if (data.constructor === ByteString) {
    data = /** @type {!ByteString} */ (data);
    if (!copyByteString) {
      return unsafeUint8ArrayFromByteString(data);
    }
    return data.asUint8Array();
  }

  if (data instanceof Uint8Array) {
    // Support types like nodejs Buffer (a subclass of Uint8Array).
    data = /** @type {!Uint8Array} */ (data);
    // Make a shallow copy to ensure jspb code only ever deals with Uint8Array
    // exactly to ensure monomorphism.
    return /** @type {!Uint8Array} */ (
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  }
  throw new Error(
    'Type not convertible to a Uint8Array, expected a Uint8Array, an ' +
    'ArrayBuffer, a base64 encoded string, or Array of numbers');
}

/** @return {number} */
function getSplit64Low() {
  return split64Low;
}
/** @return {number} */
function getSplit64High() {
  return split64High;
}

/**
 * Makes a wire tag
 * @return {number}
 */
function makeTag(
    /** number */ fieldNumber,
    /** !BinaryConstants.WireType */ wireType) {
  // N.B. can't use << 3 because that enforces 2s complement 32 bit math and we
  // want unsigned math. Consider that `(2**29 -1) << 3 === -8` but
  // `(2**29 -1) * 8 === 4294967288`
  return fieldNumber * 8 + wireType;
}

/** @const {number} */
const LOW_16_BITS = 0xFFFF;

/** @const {number} */
const LOW_24_BITS = 0xFFFFFF;

/** @const {number} */
const ALL_32_BITS = 0xFFFFFFFF;

/** @const {number} String(Number.MAX_SAFE_INTEGER).length */
const MAX_SAFE_INTEGER_DECIMAL_LENGTH = 16;

exports = {
  byteSourceToUint8Array,
  countDelimitedFields,
  countFixed32Fields,
  countFixed64Fields,
  countVarintFields,
  countVarints,
  fromZigzag32,
  fromZigzag64,
  getSplit64High,
  getSplit64Low,
  joinFloat32,
  joinFloat64,
  joinInt64,
  joinNegativeDecimalStringFallback,
  joinSignedDecimalString,
  joinSignedNumberOrDecimalString,
  joinUint64,
  joinUnsignedDecimalString,
  joinUnsignedDecimalStringFallback,
  joinUnsignedNumberOrDecimalString,
  joinZigzag64,
  makeTag,
  sliceUint8Array,
  splitDecimalString,
  splitDecimalStringFallback,
  splitFloat32,
  splitFloat64,
  splitInt64,
  splitUint64,
  splitZigzag64,
  toZigzag32,
  toZigzag64,
};
