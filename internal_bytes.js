/**
 * @fileoverview Internal runtime functions related to bytes data.
 */
goog.module('jspb.internal_bytes');

const base64 = goog.require('goog.crypt.base64');
const userAgent = goog.require('goog.userAgent');
const {fail} = goog.require('goog.asserts');

/**
 * Does this JavaScript environment support Uint8Array typed arrays?
 *
 * NOTE: this really should be `typeof Uint8Array === 'function'` but in
 * go/cobalt browsers `typeof Uint8Array === 'object'` so we need a looser check
 * here.
 * We assume availability if featureset year is >=2018. Any number > 2012 would
 * probably suffice but those years aren't defined, so we pick the ealiest
 * defined year.
 *
 * @const {boolean}
 */
const SUPPORTS_UINT8ARRAY =
    goog.FEATURESET_YEAR >= 2018 || (typeof Uint8Array !== 'undefined');

/**
 * @define {boolean} Indicates that we should look for WEBSAFE encodings before
 *     using atob/btoa for base64 encoding. This incurs some walltime cost but
 *     is required for backcompat.
 */
const HANDLE_WEB_SAFE_ENCODINGS_WITH_ATOB_AND_BTOA =
    goog.define('jspb.HANDLE_WEB_SAFE_ENCODINGS_WITH_ATOB_AND_BTOA', true);

/**
 * @define {boolean} If set, use atob/btoa when available.
 *
 * More specifically, if enabled and 'goog.FEATURESET_YEAR >= 2018', sets
 * USE_ATOB_BTOA without feature detection. Using featureset years >= 2018
 * which is conservative but excluded IE and no one is picking numbers less that
 * that anyway. If disabled, the slower JS implementation is always used; this
 * is appropriate for non-Web environments where 'atob' and 'btoa' are not
 * available.
 */
const CAN_USE_ATOB_AND_BTOA = goog.define('jspb.USE_ATOB_AND_BTOA', true);

const /** boolean */ ASSUME_ATOB_AND_BTOA_AVAILABLE =
    goog.FEATURESET_YEAR >= 2018;

/**
 * Whether this application has native support for `atob` and `btoa`.
 *
 * IE has a broken implementation; and we would be able to fast-track WEBKIT
 * if it weren't for cobalt.
 *
 * @const {boolean}
 */
const USE_ATOB_BTOA = CAN_USE_ATOB_AND_BTOA &&
    (ASSUME_ATOB_AND_BTOA_AVAILABLE ||
     (!userAgent.IE && typeof btoa === 'function'));

/**
 * Maximum arg spread for String.fromCharCode.
 *
 * Chrome's maximum stack size is of the order of 100k so here we conservatively
 * set this to 10k.
 */
const UINT8ARRAY_MAX_SIZE_FOR_SPREAD = 10240;

/**
 * Encodes a Uint8Array as base64.
 *
 * Note that we can always use btoa/atob if we can use Uint8Array because
 * every browser that supports Uint8Array also supports them: see
 * https://caniuse.com/?search=Uint8Array and https://caniuse.com/atob-btoa
 *
 * @param {!Uint8Array} u8
 * @return {string}
 */
function encodeByteArray(u8) {
  if (!USE_ATOB_BTOA) {
    return base64.encodeByteArray(u8);
  }

  /** @type {string} */
  let binary = '';
  let offset = 0;
  const limit = u8.length - UINT8ARRAY_MAX_SIZE_FOR_SPREAD;
  while (offset < limit) {
    binary += String.fromCharCode.apply(
        null, u8.subarray(offset, offset += UINT8ARRAY_MAX_SIZE_FOR_SPREAD));
  }
  binary += String.fromCharCode.apply(null, offset ? u8.subarray(offset) : u8);
  return btoa(binary);
}

/**
 * Websafe padding characters for replacement.
 * @const {!RegExp}
 */
const WEBSAFE_BASE64_CHARS = /** @pureOrBreakMyCode */ (/[-_.]/g);

/** @const {!Object<string,string>} */
const websafeReplacer =
    /** @pureOrBreakMyCode */ ({'-': '+', '_': '/', '.': '='});

/**
 * Replaces websafe characters with default alphabet characters.
 * @param {string} char
 * @return {string}
 */
function replaceWebsafe(char) {
  return websafeReplacer[char] || '';
}

/**
 * Replaces websafe characters in a string with default alphabet characters.
 * @param {string} str
 * @return {string}
 */
function replaceWebsafeString(str) {
  if (WEBSAFE_BASE64_CHARS.test(str)) {
    return str.replace(WEBSAFE_BASE64_CHARS, replaceWebsafe);
  }
  return str;
}

/**
 * Decodes base64 into a Uint8Array.
 *
 * Note that we can always use btoa/atob if we can use Uint8Array because
 * every browser that supports Uint8Array also supports them: see
 * https://caniuse.com/?search=Uint8Array and https://caniuse.com/atob-btoa
 *
 * @param {string} b64
 * @return {!Uint8Array}
 */
function decodeByteArray(b64) {
  // Without our flag, fall back to Closure's implementation.
  if (!USE_ATOB_BTOA) {
    return base64.decodeStringToUint8Array(b64);
  }

  // If this encoding used the websafe alphabet, we must convert it for atob
  // to work. This is rare so we condition any replace operation on a regex
  // match. One also presumes this will happen exclusively for URL mappings
  // so they should also be relatively short.
  //
  // Note that atob natively handles missing padding so we do not need to
  // handle that here.
  let encoded = b64;
  if (HANDLE_WEB_SAFE_ENCODINGS_WITH_ATOB_AND_BTOA) {
    encoded = replaceWebsafeString(encoded);
  }

  // Convert b64 to binary string.
  let /** string|undefined */ binary;
  if (goog.DEBUG) {
    try {
      binary = atob(encoded);
    } catch (e) {
      throw new Error(`invalid encoding '${b64}': ${e}`);
    }
  } else /* if (!goog.DEBUG) */ {
    binary = atob(encoded);
  }

  // Convert back from binary string to Uint8Array.
  const u8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    u8[i] = binary.charCodeAt(i);
  }
  return u8;
}


/**
 * Coerce data of a 'bytes' field to a Uint8Array byte buffer.
 * Note that Uint8Array is not supported on IE versions before 10 nor on Opera
 * Mini. @see http://caniuse.com/Uint8Array
 * @param {string|!Uint8Array|null} value
 * @return {?Uint8Array} The field's coerced value.
 */
function dataAsU8(value) {
  if (value == null || isU8(value)) {
    return /** @type {?Uint8Array} */ (value);
  }
  if (typeof value === 'string') {
    return decodeByteArray(value);
  }
  fail('Cannot coerce to Uint8Array: ' + goog.typeOf(value));
  return null;
}

/**
 * Returns whether the given value is a Uint8Array.
 * @param {*} value
 * @return {boolean}
 */
function isU8(value) {
  return SUPPORTS_UINT8ARRAY && value != null && value instanceof Uint8Array;
}

/** @return {boolean} */
function uint8ArrayEquals(/** !Uint8Array */ a, /** !Uint8Array */ b) {
  // Compare byte-by-byte.
  //
  // Note that we do not technically need to length-check since out-of-range
  // subscripts will simply yield `undefined`; but that may result in some
  // deoptimization.
  const aLength = a.length;
  if (aLength !== b.length) {
    return false;
  }
  for (let i = 0; i < aLength; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

/**
 * A token to check that internal only bytestring functions are only called by
 * internal functions.
 * @const
 */
const I_AM_INTERNAL = {};

exports = {
  I_AM_INTERNAL,
  SUPPORTS_UINT8ARRAY,
  encodeByteArray,
  decodeByteArray,
  dataAsU8,
  isU8,
  replaceWebsafeString,
  uint8ArrayEquals,
  USE_ATOB_BTOA,  // exported for tests.
};
