/** @fileoverview Utilities for testing binary protobuf code. */
goog.module('jspb.binary.test_utils');
goog.module.declareLegacyNamespace();


const {BinaryReader} = goog.require('jspb.binary.reader');
const {assertNumber} = goog.require('goog.asserts');

/**
 * Converts a Uint8Array into a string of hex with two characters per byte.
 * @param {!Uint8Array} u8array
 * @return {string}
 */
function toHexString(u8array) {
  return Array
      .from(
          u8array, (b) => (assertNumber(b) < 0x10 ? '0' : '') + b.toString(16))
      .join('');
}
exports.toHexString = toHexString;

/**
 * Splits an encoded protocol buffer message into separate hex strings for each
 * field number.
 *
 * Allows comparison of serialized protos without regard to field number
 * ordering, which is not guaranteed to be stable.
 * See https://developers.google.com/protocol-buffers/docs/encoding#order
 *
 * Contains all bytes relevant to the field, including the header with field
 * number and type. Repeated fields are one long string including all headers.
 *
 * @param {!Uint8Array} u8array
 * @return {!Object<number, string>}
 */
function toHexFields(u8array) {
  const /** !Object<number, string> */ fields = {};
  const reader = new BinaryReader(u8array);
  let startCursor = 0;
  while (reader.nextField()) {
    const fieldNumber = reader.getFieldNumber();
    const existingString = fields[fieldNumber] || '';
    reader.skipField();
    const endCursor = reader.getCursor();
    fields[fieldNumber] =
        existingString + toHexString(u8array.subarray(startCursor, endCursor));
    startCursor = endCursor;
  }
  return fields;
}
exports.toHexFields = toHexFields;
