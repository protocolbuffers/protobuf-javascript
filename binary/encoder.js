/**
 * @fileoverview BinaryEncode defines methods for encoding Javascript values
 * into arrays of bytes compatible with the Protocol Buffer wire format.
 *
 * @author aappleby@google.com (Austin Appleby)
 */

goog.module('jspb.binary.encoder');
goog.module.declareLegacyNamespace();

const BinaryConstants = goog.require('jspb.BinaryConstants');
const asserts = goog.require('goog.asserts');
const utils = goog.require('jspb.utils');

// The maximum number of bytes to push onto `buffer_` at a time, limited to
// prevent stack overflow errors.
const MAX_PUSH = 8192;
/**
 * BinaryEncoder implements encoders for all the wire types specified in
 * https://developers.google.com/protocol-buffers/docs/encoding.
 */
class BinaryEncoder {
  constructor() {
    /** @private {!Array<number>} */
    this.buffer_ = [];
  }

  /**
   * @return {number}
   */
  length() {
    return this.buffer_.length;
  }

  /**
   * @return {!Array<number>}
   */
  end() {
    const buffer = this.buffer_;
    this.buffer_ = [];
    return buffer;
  }

  /**
   * Encodes a 64-bit integer in 32:32 split representation into its wire-format
   * varint representation and stores it in the buffer.
   * @param {number} lowBits The low 32 bits of the int.
   * @param {number} highBits The high 32 bits of the int.
   */
  writeSplitVarint64(lowBits, highBits) {
    asserts.assert(lowBits == Math.floor(lowBits));
    asserts.assert(highBits == Math.floor(highBits));
    asserts.assert((lowBits >= 0) && (lowBits < BinaryConstants.TWO_TO_32));
    asserts.assert((highBits >= 0) && (highBits < BinaryConstants.TWO_TO_32));

    // Break the binary representation into chunks of 7 bits, set the 8th bit
    // in each chunk if it's not the final chunk, and append to the result.
    while (highBits > 0 || lowBits > 127) {
      this.buffer_.push((lowBits & 0x7f) | 0x80);
      lowBits = ((lowBits >>> 7) | (highBits << 25)) >>> 0;
      highBits = highBits >>> 7;
    }
    this.buffer_.push(lowBits);
  }

  /**
   * Encodes a 64-bit integer in 32:32 split representation into its wire-format
   * fixed representation and stores it in the buffer.
   * @param {number} lowBits The low 32 bits of the int.
   * @param {number} highBits The high 32 bits of the int.
   */
  writeSplitFixed64(lowBits, highBits) {
    asserts.assert(lowBits == Math.floor(lowBits));
    asserts.assert(highBits == Math.floor(highBits));
    asserts.assert((lowBits >= 0) && (lowBits < BinaryConstants.TWO_TO_32));
    asserts.assert((highBits >= 0) && (highBits < BinaryConstants.TWO_TO_32));
    this.writeUint32(lowBits);
    this.writeUint32(highBits);
  }

  /**
   * Encodes a 64-bit integer in 32:32 split representation into its wire-format
   * a zigzag varint representation and stores it in the buffer.
   * @param {number} lowBits The low 32 bits of the int.
   * @param {number} highBits The high 32 bits of the int.
   */
  writeSplitZigzagVarint64(lowBits, highBits) {
    utils.toZigzag64(lowBits, highBits, (lo, hi) => {
      this.writeSplitVarint64(lo >>> 0, hi >>> 0);
    });
  }

  /**
   * Encodes a 32-bit unsigned integer into its wire-format varint
   * representation and stores it in the buffer.
   * @param {number} value The integer to convert.
   */
  writeUnsignedVarint32(value) {
    asserts.assert(value == Math.floor(value));
    asserts.assert((value >= 0) && (value < BinaryConstants.TWO_TO_32));

    while (value > 127) {
      this.buffer_.push((value & 0x7f) | 0x80);
      value = value >>> 7;
    }

    this.buffer_.push(value);
  }

  /**
   * Encodes a 32-bit signed integer into its wire-format varint representation
   * and stores it in the buffer.
   * @param {number} value The integer to convert.
   */
  writeSignedVarint32(value) {
    asserts.assert(value == Math.floor(value));
    asserts.assert(
        (value >= -BinaryConstants.TWO_TO_31) &&
        (value < BinaryConstants.TWO_TO_31));

    // Use the unsigned version if the value is not negative.
    if (value >= 0) {
      this.writeUnsignedVarint32(value);
      return;
    }

    // Write nine bytes with a _signed_ right shift so we preserve the sign bit.
    for (let i = 0; i < 9; i++) {
      this.buffer_.push((value & 0x7f) | 0x80);
      value = value >> 7;
    }

    // The above loop writes out 63 bits, so the last byte is always the sign
    // bit which is always set for negative numbers.
    this.buffer_.push(1);
  }

  /**
   * Encodes a 64-bit unsigned integer into its wire-format varint
   * representation and stores it in the buffer. Integers that are not
   * representable in 64 bits will be truncated.
   * @param {number} value The integer to convert.
   */
  writeUnsignedVarint64(value) {
    asserts.assert(value == Math.floor(value));
    asserts.assert((value >= 0) && (value < BinaryConstants.TWO_TO_64));
    utils.splitInt64(value);
    this.writeSplitVarint64(utils.getSplit64Low(), utils.getSplit64High());
  }

  /**
   * Encodes a 64-bit signed integer into its wire-format varint representation
   * and stores it in the buffer. Integers that are not representable in 64 bits
   * will be truncated.
   * @param {number} value The integer to convert.
   */
  writeSignedVarint64(value) {
    asserts.assert(value == Math.floor(value));
    asserts.assert(
        (value >= -BinaryConstants.TWO_TO_63) &&
        (value < BinaryConstants.TWO_TO_63));
    utils.splitInt64(value);
    this.writeSplitVarint64(utils.getSplit64Low(), utils.getSplit64High());
  }

  /**
   * Encodes a JavaScript integer into its wire-format, zigzag-encoded varint
   * representation and stores it in the buffer.
   * @param {number} value The integer to convert.
   */
  writeZigzagVarint32(value) {
    asserts.assert(value == Math.floor(value));
    asserts.assert(
        (value >= -BinaryConstants.TWO_TO_31) &&
        (value < BinaryConstants.TWO_TO_31));
    this.writeUnsignedVarint32(utils.toZigzag32(value));
  }

  /**
   * Encodes a JavaScript integer into its wire-format, zigzag-encoded varint
   * representation and stores it in the buffer. Integers not representable in
   * 64 bits will be truncated.
   * @param {number} value The integer to convert.
   */
  writeZigzagVarint64(value) {
    asserts.assert(value == Math.floor(value));
    asserts.assert(
        (value >= -BinaryConstants.TWO_TO_63) &&
        (value < BinaryConstants.TWO_TO_63));
    utils.splitZigzag64(value);
    this.writeSplitVarint64(utils.getSplit64Low(), utils.getSplit64High());
  }

  /**
   * Encodes a BigInt into its wire-format, zigzag-encoded varint
   * representation and stores it in the buffer.
   * @param {bigint} value The BigInt to convert.
   */
  writeZigzagVarint64BigInt(value) {
    this.writeZigzagVarint64String(value.toString());
  }
  
  /**
   * Encodes a JavaScript decimal string into its wire-format, zigzag-encoded
   * varint representation and stores it in the buffer. Integers not
   * representable in 64 bits will be truncated.
   * @param {string} value The integer to convert.
   */
  writeZigzagVarint64String(value) {
    utils.splitDecimalString(value);
    utils.toZigzag64(
        utils.getSplit64Low(), utils.getSplit64High(), (lo, hi) => {
          this.writeSplitVarint64(lo >>> 0, hi >>> 0);
        });
  }

  /**
   * Writes an 8-bit unsigned integer to the buffer. Numbers outside the range
   * [0,2^8) will be truncated.
   * @param {number} value The value to write.
   */
  writeUint8(value) {
    asserts.assert(value == Math.floor(value));
    asserts.assert((value >= 0) && (value < 256));
    this.buffer_.push((value >>> 0) & 0xFF);
  }

  /**
   * Writes a 16-bit unsigned integer to the buffer. Numbers outside the
   * range [0,2^16) will be truncated.
   * @param {number} value The value to write.
   */
  writeUint16(value) {
    asserts.assert(value == Math.floor(value));
    asserts.assert((value >= 0) && (value < 65536));
    this.buffer_.push((value >>> 0) & 0xFF);
    this.buffer_.push((value >>> 8) & 0xFF);
  }

  /**
   * Writes a 32-bit unsigned integer to the buffer. Numbers outside the
   * range [0,2^32) will be truncated.
   * @param {number} value The value to write.
   */
  writeUint32(value) {
    asserts.assert(value == Math.floor(value));
    asserts.assert((value >= 0) && (value < BinaryConstants.TWO_TO_32));
    this.buffer_.push((value >>> 0) & 0xFF);
    this.buffer_.push((value >>> 8) & 0xFF);
    this.buffer_.push((value >>> 16) & 0xFF);
    this.buffer_.push((value >>> 24) & 0xFF);
  }

  /**
   * Writes a 64-bit unsigned integer to the buffer. Numbers outside the
   * range [0,2^64) will be truncated.
   * @param {number} value The value to write.
   */
  writeUint64(value) {
    asserts.assert(value == Math.floor(value));
    asserts.assert((value >= 0) && (value < BinaryConstants.TWO_TO_64));
    utils.splitUint64(value);
    this.writeUint32(utils.getSplit64Low());
    this.writeUint32(utils.getSplit64High());
  }

  /**
   * Writes an 8-bit integer to the buffer. Numbers outside the range
   * [-2^7,2^7) will be truncated.
   * @param {number} value The value to write.
   */
  writeInt8(value) {
    asserts.assert(value == Math.floor(value));
    asserts.assert((value >= -128) && (value < 128));
    this.buffer_.push((value >>> 0) & 0xFF);
  }

  /**
   * Writes a 16-bit integer to the buffer. Numbers outside the range
   * [-2^15,2^15) will be truncated.
   * @param {number} value The value to write.
   */
  writeInt16(value) {
    asserts.assert(value == Math.floor(value));
    asserts.assert((value >= -32768) && (value < 32768));
    this.buffer_.push((value >>> 0) & 0xFF);
    this.buffer_.push((value >>> 8) & 0xFF);
  }

  /**
   * Writes a 32-bit integer to the buffer. Numbers outside the range
   * [-2^31,2^31) will be truncated.
   * @param {number} value The value to write.
   */
  writeInt32(value) {
    asserts.assert(value == Math.floor(value));
    asserts.assert(
        (value >= -BinaryConstants.TWO_TO_31) &&
        (value < BinaryConstants.TWO_TO_31));
    this.buffer_.push((value >>> 0) & 0xFF);
    this.buffer_.push((value >>> 8) & 0xFF);
    this.buffer_.push((value >>> 16) & 0xFF);
    this.buffer_.push((value >>> 24) & 0xFF);
  }

  /**
   * Writes a 64-bit integer to the buffer. Numbers outside the range
   * [-2^63,2^63) will be truncated.
   * @param {number} value The value to write.
   */
  writeInt64(value) {
    asserts.assert(value == Math.floor(value));
    asserts.assert(
        (value >= -BinaryConstants.TWO_TO_63) &&
        (value < BinaryConstants.TWO_TO_63));
    utils.splitInt64(value);
    this.writeSplitFixed64(utils.getSplit64Low(), utils.getSplit64High());
  }

  /**
   * Writes a single-precision floating point value to the buffer. Numbers
   * requiring more than 32 bits of precision will be truncated.
   * @param {number|string} value The value to write, accepts
   *     'Infinity'/'-Infinity'/'NaN' for JSPB wire format compatibility.
   */
  writeFloat(value) {
    asserts.assert(
        // Explicitly using == to accept strings
        (value == Infinity || value == -Infinity || isNaN(value) ||
         (typeof value === 'number' &&
          (value >= -BinaryConstants.FLOAT32_MAX) &&
          (value <= BinaryConstants.FLOAT32_MAX))));
    utils.splitFloat32(value);
    this.writeUint32(utils.getSplit64Low());
  }

  /**
   * Writes a double-precision floating point value to the buffer. As this is
   * the native format used by JavaScript, no precision will be lost.
   * @param {number|string} value The value to write, accepts
   *     'Infinity'/'-Infinity'/'NaN' for JSPB wire format compatibility.
   */
  writeDouble(value) {
    asserts.assert(
        typeof value === 'number' || value === 'Infinity' ||
        value === '-Infinity' || value === 'NaN');
    utils.splitFloat64(value);
    this.writeUint32(utils.getSplit64Low());
    this.writeUint32(utils.getSplit64High());
  }

  /**
   * Writes a boolean value to the buffer as a varint. We allow numbers as input
   * because the JSPB code generator uses 0/1 instead of true/false to save
   * space in the string representation of the proto.
   * @param {boolean|number} value The value to write.
   */
  writeBool(value) {
    asserts.assert(typeof value === 'boolean' || typeof value === 'number');
    this.buffer_.push(value ? 1 : 0);
  }

  /**
   * Writes an enum value to the buffer as a varint.
   * @param {number} value The value to write.
   */
  writeEnum(value) {
    asserts.assert(value == Math.floor(value));
    asserts.assert(
        (value >= -BinaryConstants.TWO_TO_31) &&
        (value < BinaryConstants.TWO_TO_31));
    this.writeSignedVarint32(value);
  }

  /**
   * Writes a byte array to our buffer.
   * @param {!Uint8Array} bytes The array of bytes to write.
   */
  writeBytes(bytes) {
    // avoid a stackoverflow on large arrays.
    while (bytes.length > MAX_PUSH) {
      Array.prototype.push.apply(this.buffer_, bytes.subarray(0, MAX_PUSH));
      bytes = bytes.subarray(MAX_PUSH);
    }
    Array.prototype.push.apply(this.buffer_, bytes);
  }
}

exports = {BinaryEncoder};
