/**
 * @fileoverview Provides unsafe routines for constructing and manipulating
 * ByteString objects.
 *
 * These can be used to construct a `ByteString` from a `Uint8Array` without a
 * copy or to access a `Uint8Array` from a `ByteString` without a copy.
 *
 * These operations are unsafe because the contract on `ByteString` is that it
 * is immutable and these functions can be used to violate that contract.
 *
 * If the `Uint8Array` objects returned from or passed to these functions are
 * mutated the results will be unpredictable.
 *
 * - These mutations may or may not be reflected in later reads of the
 * ByteString
 * - equality operations may not be consistent
 * - Other protos parsed from these ByteString objects may themselves contain
 * ByteString objects that contain mutable data.
 *
 * Because it is very unpredictable when or how these mutations might affect
 * behavior far away in an application, access to these APIs is restricted.   If
 * you find yourself wanting to use these APIs please reach out to
 * web-protos-dev@
 *
 */

goog.module('jspb.unsafe_bytestring');

const {ByteString} = goog.require('jspb.bytestring');
const {I_AM_INTERNAL} = goog.require('jspb.internal_bytes');
const {assertInstanceof} = goog.require('goog.asserts');

/**
 * Constructs a ByteString from the Uint8Array without a copy.
 *
 * @return {!ByteString}
 */
function unsafeByteStringFromUint8Array(/** !Uint8Array*/ array) {
  assertInstanceof(array, Uint8Array);
  return array.length == 0 ? ByteString.empty() :
                             new ByteString(array, I_AM_INTERNAL);
}

/**
 * Returns the Uint8Array from the ByteString without a defensive copy.
 *
 * Mutating the returned Uint8Array (if any) can lead to unpredictable behavior.
 *
 * @return {!Uint8Array}
 */
function unsafeUint8ArrayFromByteString(/** !ByteString*/ bytestring) {
  assertInstanceof(bytestring, ByteString);
  return bytestring.internalBytesUnsafe(I_AM_INTERNAL) || new Uint8Array(0);
}

/**
 * Returns the Uint8Array or base64 string from the bytestring with no copies.
 *
 * Mutating the returned Uint8Array (if any) can lead to unpredictable behavior
 * @return {!Uint8Array|string}
 */
function unsafeUnwrapByteString(/** !ByteString*/ bytestring) {
  assertInstanceof(bytestring, ByteString);
  return bytestring.internalUnwrap(I_AM_INTERNAL);
}

exports = {
  unsafeByteStringFromUint8Array,
  unsafeUint8ArrayFromByteString,
  unsafeUnwrapByteString,
};
