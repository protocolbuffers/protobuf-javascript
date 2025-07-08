/**
 * @fileoverview Internal utilities for working with buffers.
 * @package
 *
 * DO NOT USE THIS OUTSIDE OF THIS PACKAGE.
 */
goog.module('jspb.binary.internal_buffer');

const {ByteSource} = goog.require('jspb.binary.bytesource');
const {ByteString} = goog.require('jspb.bytestring');
const {decodeByteArray} = goog.require('jspb.internal_bytes');
const {unsafeByteStringFromUint8Array, unsafeUint8ArrayFromByteString} = goog.require('jspb.unsafe_bytestring');


class Buffer {
  constructor(/** !Uint8Array */ buffer, /** boolean */ isImmutable,
              /** !ByteString= */ maybeByteString) {
    /** @const {!Uint8Array}*/
    this.buffer = buffer;

    /** @private {!ByteString|undefined} */
    this.bufferAsByteStringInternal = maybeByteString;
    if (maybeByteString && !isImmutable) {
      throw goog.DEBUG ?
          new Error('Buffer must be immutable if a ByteString is provided.') :
          new Error();
    }

    /**
     * Whether our input must be immutable and we cannot allow callers to
     * mutate it.
     *
     * @const {boolean}
     */
    this.isImmutable = isImmutable;
  }

  /** @return {?ByteString} */
  getBufferAsByteStringIfImmutable() {
    if (!this.isImmutable) {
      throw goog.DEBUG ?
          new Error('Cannot get ByteString from mutable buffer.') :
          new Error();
    }
    if (this.buffer == null) return null;
    return this.bufferAsByteStringInternal ??=
               unsafeByteStringFromUint8Array(this.buffer);
  }
}

/**
 * Converts any type defined in ByteSource into a Uint8Array.
 * @param {!ByteSource|!ByteString} data
 * @param {boolean} treatNewDataAsImmutable Whether to treat new data as
 *     immutable.
 * @return {!Buffer} a tuple of the data and
 *     whether or not this is an immutable reference
 */
function bufferFromSource(data, treatNewDataAsImmutable) {
  if (typeof data === 'string') {
    return new Buffer(decodeByteArray(data), treatNewDataAsImmutable);
  } else if (Array.isArray(data)) {
    return new Buffer(new Uint8Array(data), treatNewDataAsImmutable);
  } else if (data.constructor === Uint8Array) {
    const u8 = /** @type {!Uint8Array}*/ (data);
    return new Buffer(u8, /* isImmutable= */ false);
  } else if (data.constructor === ArrayBuffer) {
    const u8 = new Uint8Array(/** @type {!ArrayBuffer} */ (data));
    return new Buffer(u8, /* isImmutable= */ false);
  } else if (data.constructor === ByteString) {
    const byteString = /** @type {!ByteString} */ (data);
    const u8 = unsafeUint8ArrayFromByteString(byteString);
    return new Buffer(u8, /* isImmutable= */ true, byteString);
  } else if (data instanceof Uint8Array) {
    // If this is a node subclass, wrap a new Uint8Array around the buffer to
    // ensure jspb code only ever deals with Uint8Array exactly to ensure
    // monomorphism.
    const u8 = (data.constructor === Uint8Array) ?
        data :
        new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    return new Buffer(u8, /* isImmutable= */ false);
  } else {
    throw goog.DEBUG ?
        new Error(
            'Type not convertible to a Uint8Array, expected a Uint8Array, an ' +
            'ArrayBuffer, a base64 encoded string, a ByteString or an Array of ' +
            'numbers') :
        new Error();
  }
}


exports = {
  Buffer,
  bufferFromSource,
};
