/**
 * @fileoverview ByteString class for encapsulating bytes fields.
 */

goog.module('jspb.bytestring');
goog.module.declareLegacyNamespace();

const { I_AM_INTERNAL, dataAsU8, encodeByteArray, uint8ArrayEquals } = goog.require('jspb.internal_bytes');
const {assert, assertExists, assertInstanceof, assertNumber, assertString} = goog.require('goog.asserts');
const {decodeUtf8, encodeUtf8} = goog.require('jspb.binary.utf8');

/**
 * Encapsulation of a bytes field.
 *
 * Use the factory methods below to construct a ByteString.
 *
 * @final
 * @struct
 */
class ByteString {

  /**
   * Constructs a ByteString instance from a base64 string, per RFC 4648 section
   * 4.
   * @return {!ByteString}
   */
  static fromBase64(/** string */ value) {
    assertString(value);
    return value ? new ByteString(value, I_AM_INTERNAL) : ByteString.empty();
  }

  /**
   * Constructs a ByteString from a Uint8Array or Array of numbers.
   *
   * Makes a copy of the parameter.
   *
   * When passed an array of numbers, values will be truncated to be integers
   * and then their value mod 2^8 will be preserved.
   *
   * See https://tc39.es/ecma262/multipage/abstract-operations.html#sec-touint8
   *
   * @return {!ByteString}
   */
  static fromUint8Array(/** !Uint8Array|!Array<number> */ value) {
    assert(value instanceof Uint8Array || Array.isArray(value));
    return value.length ? new ByteString(new Uint8Array(value), I_AM_INTERNAL) :
                          ByteString.empty();
  }

  /**
   * Encodes `text` into a sequence of UTF-8 bytes and returns the result as a
   * `ByteString`.
   * @return {!ByteString}
   */
  static fromStringUtf8(/** string */ text) {
    assertString(text);
    return text.length ?
        new ByteString(
            encodeUtf8(text, /* rejectUnpairedSurrogates=*/ true),
            I_AM_INTERNAL) :
        ByteString.empty();
  }

  /**
   * Constructs a ByteString from a Blob.
   *
   * It is async because Blob does not provide sync access to its data.
   *
   * BROWSER COMPATIBILITY WARNING:
   * This method uses Blob.arrayBuffer() to access Blob's content and therefore
   * is compatible with browsers supporting this API, which is any release 2021
   * and later. See http://go/mdn/API/Blob/arrayBuffer for the full
   * compatibility list.
   * @return {!Promise<!ByteString>}
   */
  static async fromBlob(/** !Blob */ blob) {
    assertInstanceof(blob, Blob);
    if (blob.size === 0) return ByteString.empty();
    const data = await blob.arrayBuffer();
    return new ByteString(new Uint8Array(data), I_AM_INTERNAL);
  }

  /**
   * Returns the empty ByteString.
   * @return {!ByteString}
   */
  static empty() {
    return emptyByteString ||
        (emptyByteString = new ByteString(null, I_AM_INTERNAL));
  }

  /**
   * Returns this ByteString as a base64 encoded string, per RFC 4648 section 4.
   * @return {string}
   */
  asBase64() {
    const value = this.value_;
    if (value == null) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    return this.value_ = encodeByteArray(value);
  }

  /**
   * Returns this ByteString as a Uint8Array. This makes a copy and returns a
   * new Uint8Array.
   * @return {!Uint8Array}
   */
  asUint8Array() {
    return new Uint8Array(this.internalBytesUnsafe(I_AM_INTERNAL) || 0);
  }

  /**
   * Returns true if the ByteString is empty.
   * @return {boolean}
   */
  isEmpty() {
    return this.value_ == null;
  }

  /**
   * Returns the size of the byte string in bytes.
   *
   * If you are only interested in whether or not the ByteString is empty, call
   * `isEmpty` which is always faster.
   *
   * @return {number}
   */
  sizeBytes() {
    const bytes = this.internalBytesUnsafe(I_AM_INTERNAL);
    return bytes ? bytes.length : 0;
  }

  /**
   * Returns the numeric value of the _unsigned_ byte at the given index.
   * @return {number}
   */
  unsignedByteAt(/** number */ index) {
    assertNumber(index);
    assert(index >= 0, 'index %s should be non-negative', index);
    const bytes = this.internalBytesUnsafe(I_AM_INTERNAL);
    assert(
        index < bytes.length, 'index %s must be less than %s', index,
        bytes.length);
    return bytes[index];
  }

  /**
   * Returns the numeric value of the byte at the given index as a _signed_ byte
   * value in the range [-128,127]
   * @return {number}
   */
  signedByteAt(/** number */ index) {
    const unsignedByte = this.unsignedByteAt(index);
    // Bit operators are 'signed 32 bit' operators by default.
    // First left shift so the sign-bit if it exists is in the 32 bit signed
    // location
    // Then, right shift back into the lower 8 bits to recover the now signed
    // value.
    return (unsignedByte << 24) >> 24;
  }

  /**
   * Returns a string by decoding the bytes as UTF-8.
   * @param {{parsingErrorsAreFatal:boolean}=} opts an options bag.  The
   *     `parsingErrorsAreFatal` option controls if invalid utf8 bytes should be
   *     a runtime error (if `true`) or if they should be replaced with the
   *     replacement character `\ufffd` (if `false`), the default is to throw.
   * @return {string}
   */
  asStringUtf8({parsingErrorsAreFatal = true} = {}) {
    const bytes = this.internalBytesUnsafe(I_AM_INTERNAL);
    return bytes ? decodeUtf8(bytes, 0, bytes.length, parsingErrorsAreFatal) :
                   '';
  }

  /**
   * Returns the field as a Blob. This is a copy of the internal data.
   *
   * @param {?BlobPropertyBag=} options An object which may specify Blob
   *     properties.
   * @return {!Blob}
   */
  asBlob(options) {
    const bytes = this.internalBytesUnsafe(I_AM_INTERNAL);
    return bytes ? new Blob([bytes], options) : new Blob([], options);
  }

  /**
   * Internal only for access to the bytes in a zero copy fashion.
   *
   * See `unsafe_bytestring.js` for how to access this API.
   * @param {*} areYouInternal
   * @return {?Uint8Array}
   * @package
   */
  internalBytesUnsafe(areYouInternal) {
    checkAllowedCaller(areYouInternal);
    const u8 = dataAsU8(this.value_);
    return (u8 == null) ? u8 : (this.value_ = u8);
  }

  /**
   * Internal only for access to the internals state of the bytestring, in a
   * zero copy fashion.
   *
   * See `unsafe_bytestring.js` for how to access this API.
   * @param {*} areYouInternal
   * @return {string|!Uint8Array}
   * @package
   */
  internalUnwrap(areYouInternal) {
    checkAllowedCaller(areYouInternal);
    return this.value_ || '';
  }

  /**
   * INTERNAL USE ONLY: Clients should use the factory functions above.
   * @param {!Uint8Array|string|null} value Base64 string or Uint8Array. If
   *     null, this is an empty array.
   * @param {*} areYouInternal
   * @package
   */
  constructor(value, areYouInternal) {
    checkAllowedCaller(areYouInternal);

    /**
     * This value is either a Uint8Array or a string, or else `null` for an
     * empty byte string.
     *
     * @private {!Uint8Array|string|null}
     */
    this.value_ = value;

    if (value != null && value.length === 0) {
      throw new Error('ByteString should be constructed with non-empty values');
    }
  }
}


/** @type {!ByteString|undefined} */
let emptyByteString;

/**
 * @param {*} areYouInternal
 */
function checkAllowedCaller(areYouInternal) {
  if (areYouInternal !== I_AM_INTERNAL) {
    throw new Error('illegal external caller');
  }
}

exports = {ByteString};
