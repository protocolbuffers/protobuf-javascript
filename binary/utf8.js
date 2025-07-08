/**
 * @fileoverview UTF8 encoding and decoding routines
 *
 */
goog.module('jspb.binary.utf8');
goog.module.declareLegacyNamespace();

const {assert, assertString} = goog.require('goog.asserts');


/**
 * Whether to use the browser based `TextEncoder` and `TextDecoder` APIs for
 * handling utf8.
 *
 * <p>If enabled and `goog.FEATURESET_YEAR >= 2020`, `TextEncoder` and
 * `TextDecoder` are used unconditionally without feature detection (and the
 * code crashes if they are not available); this is best for code size. If
 * enabled and `goog.FEATURESET_YEAR < 2020`, `TextEncoder` and `TextDecoder`
 * are feature-detected, used if available, and the JS implementation is used
 * if they're not. If disabled, the slower JS implementation is always used;
 * this is appropriate for non-Web environments that don't have `TextEncoder`
 * and `TextDecoder`.
 *
 * @define {boolean}
 */
const USE_TEXT_ENCODING = goog.define('jspb.binary.USE_TEXTENCODING', true);
const ASSUME_TEXT_ENCODING_AVAILABLE = goog.FEATURESET_YEAR >= 2020;

const /** number */ MIN_SURROGATE = 0xD800;
const /** number */ MIN_HIGH_SURROGATE = MIN_SURROGATE;
const /** number */ MAX_HIGH_SURROGATE = 0xDBFF;
const /** number */ MIN_LOW_SURROGATE = 0xDC00;
const /** number */ MAX_LOW_SURROGATE = 0xDFFF;
const /** number */ MAX_SURROGATE = MAX_LOW_SURROGATE;

/**
 * Returns whether the byte is not a valid continuation of the form
 * '10XXXXXX'.
 * @return {boolean}
 */
function isNotTrailingByte(/** number */ byte) {
  // 0xC0 is '11000000' in binary
  // 0x80 is '10000000' in binary
  return (byte & 0xC0) !== 0x80;
}


/**
 * Either throws an error or appends a replacement codepoint of invalid utf8
 */
function invalid(
    /** boolean */ parsingErrorsAreFatal, /** !Array<number> */ codeUnits) {
  if (parsingErrorsAreFatal) {
    throw new Error('Invalid UTF8');
  }
  codeUnits.push(0xFFFD);  // utf8 replacement character
}

/** @return {string} */
function codeUnitsToString(
    /** string? */ accum, /** !Array<number> */ utf16CodeUnits) {
  const suffix = String.fromCharCode.apply(null, utf16CodeUnits);
  return accum == null ? suffix : accum + suffix;
}

/**
 * Our handwritten UTF8 decoder.
 *
 * https://en.wikipedia.org/wiki/UTF-8#Encoding describes the bit layout
 *
 * https://en.wikipedia.org/wiki/UTF-8#Invalid_sequences_and_error_handling
 * describes important cases to check for which are namely:
 * - overlong encodings, meaning a value expressable in N bytes could have been
 * expressed in fewer bytes
 * - invalid bytes, meaning bytes that are generally out of range
 * - surrogate codepoints, utf8 never encodes directly a utf16 surrogate value
 * - underflow where there aren't enough bytes for the sequence we are parsing
 * - out of range codepoints.
 *
 * @return {string}
 */
function polyfillDecodeUtf8(
    /** !Uint8Array */ bytes, /** number */ offset, /** number */ length,
    /** boolean */ parsingErrorsAreFatal) {
  let cursor = offset;
  const end = cursor + length;
  const codeUnits = [];
  let result = null;

  // This is significantly slower than the TextDecoder implementation.
  // Ideas for improving performance:
  // 1. Reduce branching with non-shortcircuting operators, e.g.
  // https://stackoverflow.com/q/5652363
  // 2. improve isNotTrailingByte using xor?
  // 3. consider having a dedicate ascii loop (java impls do this)
  let c1, c2, c3, c4;
  while (cursor < end) {
    c1 = bytes[cursor++];
    if (c1 < 0x80) {  // Regular 7-bit ASCII.
      codeUnits.push(c1);
    } else if (c1 < 0xE0) {  // UTF-8 with two bytes.
      if (cursor >= end) {
        invalid(parsingErrorsAreFatal, codeUnits);
      } else {
        c2 = bytes[cursor++];
        // Make sure that c1 is a valid leading byte and c2 is a valid
        // trailing byte
        // 0xC2 is '11000010', if c1 is less than this then we have an overlong
        // encoding because there would only be 7 significant bits.
        if (c1 < 0xC2 || isNotTrailingByte(c2)) {
          cursor--;  // push c2 back since it isn't 'accepted'
          invalid(parsingErrorsAreFatal, codeUnits);
        } else {
          // The codeUnit is the lower 6 bits from c2 and the lower 5 bits from
          // c1
          const codeUnit = ((c1 & 0x1F) << 6) | (c2 & 0x3F);
          // Consistency check that the computed code is in range for a 2 byte
          // sequence.
          assert(codeUnit >= 0x80 && codeUnit <= 0x07FF);
          codeUnits.push(codeUnit);
        }
      }
    } else if (c1 < 0xF0) {  // UTF-8 with three bytes.
      if (cursor >= end - 1) {
        invalid(parsingErrorsAreFatal, codeUnits);
      } else {
        c2 = bytes[cursor++];
        if (isNotTrailingByte(c2) ||
            // These checks were taken from
            // java/com/google/protobuf/Utf8.java
            // overlong? 5 most significant bits must not all be zero
            (c1 === 0xE0 && c2 < 0xA0)
            // check for illegal surrogate codepoints
            || (c1 === 0xED && c2 >= 0xA0) ||
            // We delay reading c3 until now so than an error in c2 or c1 will
            // preserve c3 for the next loop iteration
            isNotTrailingByte(c3 = bytes[cursor++])) {
          cursor--;  // push back c2 or c3, depending on how far we made it
          invalid(parsingErrorsAreFatal, codeUnits);
        } else {
          // 4 bits from the first byte
          // 6 bits from each of the two lower bytes
          // == 16 bits total
          const codeUnit =
              ((c1 & 0xF) << 12) | ((c2 & 0x3F) << 6) | (c3 & 0x3F);
          // Consistency check, this is the valid range for a 3 byte character
          assert(codeUnit >= 0x800 && codeUnit <= 0xFFFF);
          // And that Utf16 surrogates are disallowed
          assert(codeUnit < MIN_SURROGATE || codeUnit > MAX_SURROGATE);
          codeUnits.push(codeUnit);
        }
      }
    } else if (c1 <= 0xF4) {  // UTF-8 with 4 bytes.
      // 0xF8 matches the bitpattern for utf8 with 4 bytes, but all leading
      // bytes > 0xF4 are either overlong encodings or exceed the valid range.
      if (cursor >= end - 2) {
        invalid(parsingErrorsAreFatal, codeUnits);
      } else {
        c2 = bytes[cursor++];
        if (isNotTrailingByte(c2) ||
            // This check was inspired by
            // java/com/google/protobuf/Utf8.java
            // Tricky optimized form of:
            //   valid 4-byte leading byte?
            // if (byte1 > (byte) 0xF4 ||
            //   overlong? 4 most significant bits must not all be zero
            //     byte1 == (byte) 0xF0 && byte2 < (byte) 0x90 ||
            //   codepoint larger than the highest code point (U+10FFFF)?
            //     byte1 == (byte) 0xF4 && byte2 > (byte) 0x8F)
            (((c1 << 28) + (c2 - 0x90)) >> 30) !== 0 ||
            // We delay reading c3 and c4 until now so than an error in c2 or c1
            // will preserve them for the next loop iteration.
            isNotTrailingByte(c3 = bytes[cursor++]) ||
            isNotTrailingByte(c4 = bytes[cursor++])) {
          cursor--;  // push back c2, c3 or c4 depending on how far we made it
          invalid(parsingErrorsAreFatal, codeUnits);
        } else {
          // Characters written on 4 bytes have 21 bits for a codepoint.
          // We can't fit that on 16bit characters, so we use surrogates.
          // 3 bits from the uppermost byte, 6 bits from each of the lower 3
          // bytes. This is 21 bits which is too big for a 16 bit utf16 code
          // unit so we use surrogates.
          let codepoint = ((c1 & 0x7) << 18) | ((c2 & 0x3F) << 12) |
              ((c3 & 0x3F) << 6) | (c4 & 0x3F);
          // Consistency check, this is the valid range for a 4 byte character.
          assert(codepoint >= 0x10000 && codepoint <= 0x10FFFF);
          // Surrogates formula from wikipedia.
          // 1. Subtract 0x10000 from codepoint
          codepoint -= 0x10000;
          // 2. Split this into the high 10-bit value and the low 10-bit value
          // 3. Add 0xD800 to the high value to form the high surrogate
          // 4. Add 0xDC00 to the low value to form the low surrogate:
          const low = (codepoint & 0x3FF) + MIN_LOW_SURROGATE;
          const high = ((codepoint >> 10) & 0x3FF) + MIN_HIGH_SURROGATE;
          codeUnits.push(high, low);
        }
      }
    } else {
      // initial byte is too large for utf8
      invalid(parsingErrorsAreFatal, codeUnits);
    }
    // Accumulate as we go to avoid exceeding the maximum stack size when
    // calling `apply`.
    if (codeUnits.length >= 8192) {
      result = codeUnitsToString(result, codeUnits);
      codeUnits.length = 0;
    }
  }
  // ensure we don't overflow or underflow
  assert(cursor === end, `expected ${cursor} === ${end}`);
  return codeUnitsToString(result, codeUnits);
}


/** @type {boolean|undefined} */
let isFatalTextDecoderCachableAfterThrowing_ =
    // chrome version >= 2020 are not subject to https://crbug.com/910292
    goog.FEATURESET_YEAR >= 2020 ? true : undefined;

/** @return {boolean} */
function isFatalTextDecoderCachableAfterThrowing(/** !TextDecoder */ decoder) {
  // Test if the decoder is subject to https://crbug.com/910292
  // chrome versions with this bug cause one failed decode to cause all later
  // decodes to throw.
  if (isFatalTextDecoderCachableAfterThrowing_ === undefined) {
    // In theory we shouldn't need to generate an error here since this function
    // is only called in the context of a failed decode.  However, the buggy
    // chrome versions are not 'consistent' in corrupting their internal state
    // since it depends on where in the decode stream the error occurs.  This
    // error however does consistently trigger the bug based on manual testing.
    try {
      // A lonely continuation byte
      decoder.decode(new Uint8Array([0x80]));
    } catch (e) {
      // expected
    }
    try {
      // 'a' in hex
      decoder.decode(new Uint8Array([0x61]));
      isFatalTextDecoderCachableAfterThrowing_ = true;
    } catch (e) {
      // This decode should not throw, if it does it means our chrome version
      // is buggy and we need to flush our cached decoder when failures occur
      isFatalTextDecoderCachableAfterThrowing_ = false;
    }
  }
  return isFatalTextDecoderCachableAfterThrowing_;
}

/** @type {!TextDecoder|undefined} */
let fatalDecoderInstance;

/** @return {!TextDecoder}*/
function getFatalDecoderInstance() {
  let instance = fatalDecoderInstance;
  if (!instance) {
    instance = fatalDecoderInstance = new TextDecoder('utf-8', {fatal: true});
  }
  return instance;
}

/** @type {!TextDecoder|undefined} */
let nonFatalDecoderInstance;

/** @return {!TextDecoder}*/
function getNonFatalDecoderInstance() {
  let instance = nonFatalDecoderInstance;
  if (!instance) {
    instance = nonFatalDecoderInstance =
        new TextDecoder('utf-8', {fatal: false});
  }
  return instance;
}

/**
 * A `subarray` implementation that avoids calling `subarray` if it isn't needed
 *
 * `subarray` tends to be surprisingly slow.
 * @return {!Uint8Array}
 */
function subarray(
    /** !Uint8Array*/ bytes, /** number */ offset, /** number */ end) {
  return offset === 0 && end === bytes.length ? bytes :
                                                bytes.subarray(offset, end);
}

/**
 * @return {string}
 */
function textDecoderDecodeUtf8(
    /** !Uint8Array*/ bytes, /** number */ offset, /** number */ length,
    /** boolean*/ parsingErrorsAreFatal) {
  const /** !TextDecoder */ decoder = parsingErrorsAreFatal ?
      getFatalDecoderInstance() :
      getNonFatalDecoderInstance();

  bytes = subarray(bytes, offset, offset + length);
  try {
    return decoder.decode(bytes);
  } catch (e) {
    if (parsingErrorsAreFatal &&
        !isFatalTextDecoderCachableAfterThrowing(decoder)) {
      fatalDecoderInstance = undefined;
    }
    throw e;
  }
}

/** @const {boolean} */
const useTextDecoderDecode = USE_TEXT_ENCODING &&
    (ASSUME_TEXT_ENCODING_AVAILABLE || typeof TextDecoder !== 'undefined');

/**
 * A utf8 decoding routine either based upon TextDecoder if available or using
 * our polyfill implementation
 * @return {string}
 */
function decodeUtf8(
    /** !Uint8Array*/ bytes, /** number */ offset, /** number */ length,
    /** boolean*/ parsingErrorsAreFatal) {
  return useTextDecoderDecode ?
      textDecoderDecodeUtf8(bytes, offset, length, parsingErrorsAreFatal) :
      polyfillDecodeUtf8(bytes, offset, length, parsingErrorsAreFatal);
}

/** @type {!TextEncoder|undefined} */
let textEncoderInstance;

/** @return {!Uint8Array} */
function textEncoderEncode(
    /** string */ s, /** boolean */ rejectUnpairedSurrogates) {
  if (rejectUnpairedSurrogates) {
    checkWellFormed(s);
  }
  return (textEncoderInstance ||= new TextEncoder()).encode(s);
}

// No externs on isWellFormed until the JSCompiler implements a polyfill.
const /** string */ IS_WELL_FORMED = 'isWellFormed';

// isWellFormed landed in major browsers in early 2023 so it will only be
// definitely available in 2024 See
// http://go/mdn/JavaScript/Reference/Global_Objects/String/isWellFormed
const /** boolean */ HAS_WELL_FORMED_METHOD = goog.FEATURESET_YEAR > 2023 ||
    typeof String.prototype[IS_WELL_FORMED] === 'function';

function checkWellFormed(/** string */ text) {
  if (HAS_WELL_FORMED_METHOD ?
          // Externs don't contain the definition of this function yet.
          // http://go/mdn/JavaScript/Reference/Global_Objects/String/isWellFormed
          !(/** @type {?} */ (text)[IS_WELL_FORMED]()) :
          /(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])/
              .test(text)) {
    throw new Error('Found an unpaired surrogate');
  }
}


/** @return {!Uint8Array} */
function polyfillEncode(
    /** string */ s, /** boolean */ rejectUnpairedSurrogates) {
  let bi = 0;
  // The worse case is that every character requires 3 output bytes, so we
  // allocate for this.  This assumes that the buffer will be short lived.
  // Callers can always `slice` if needed
  const buffer = new Uint8Array(3 * s.length);
  for (let ci = 0; ci < s.length; ci++) {
    let c = s.charCodeAt(ci);
    if (c < 0x80) {
      buffer[bi++] = c;
    } else if (c < 0x800) {
      buffer[bi++] = (c >> 6) | 0xC0;
      buffer[bi++] = (c & 63) | 0x80;
    } else {
      assert(c < 65536);
      // Look for surrogates
      // First check if it is surrogate range
      if (c >= MIN_SURROGATE && c <= MAX_SURROGATE) {
        // is it a high surrogate?
        if (c <= MAX_HIGH_SURROGATE && ci < s.length) {
          const c2 = s.charCodeAt(++ci);
          if (c2 >= MIN_LOW_SURROGATE && c2 <= MAX_LOW_SURROGATE) {
            // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
            const codePoint =
                (c - MIN_SURROGATE) * 0x400 + c2 - MIN_LOW_SURROGATE + 0x10000;
            buffer[bi++] = (codePoint >> 18) | 0xF0;
            buffer[bi++] = ((codePoint >> 12) & 63) | 0x80;
            buffer[bi++] = ((codePoint >> 6) & 63) | 0x80;
            buffer[bi++] = (codePoint & 63) | 0x80;
            continue;
          } else {
            // else c2 not in low surrogate range, treat c as a lone surrogate
            // and back up ci so we process c2 on the next loop as an
            // independent character
            ci--;
          }
        }  // else c not a high surrogate
        if (rejectUnpairedSurrogates) {
          throw new Error('Found an unpaired surrogate');
        }
        c = 0xFFFD;  // Error! Unpaired surrogate
      }
      buffer[bi++] = (c >> 12) | 0xE0;
      buffer[bi++] = ((c >> 6) & 63) | 0x80;
      buffer[bi++] = (c & 63) | 0x80;
    }
  }
  return subarray(buffer, 0, bi);
}

/** @const {boolean} */
const useTextEncoderEncode = USE_TEXT_ENCODING &&
    (ASSUME_TEXT_ENCODING_AVAILABLE || typeof TextEncoder !== 'undefined');

/**
 * A utf8 encoding routine either based upon TextEncoder if available or using
 * our polyfill implementation
 * @return {!Uint8Array}
 */
function encodeUtf8(
    /**string*/ string, /** boolean=*/ rejectUnpairedSurrogates = false) {
  assertString(string);
  return useTextEncoderEncode ?
      textEncoderEncode(string, rejectUnpairedSurrogates) :
      polyfillEncode(string, rejectUnpairedSurrogates);
}


exports = {
  decodeUtf8,
  encodeUtf8,
  checkWellFormed,
  // The following are exposed directly for testing/benchmarking purposes only.
  textDecoderDecodeUtf8,
  polyfillDecodeUtf8,
  textEncoderEncode,
  polyfillEncode,
};
