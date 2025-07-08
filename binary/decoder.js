/**
 * @fileoverview This file contains utilities for decoding primitive values
 * (signed and unsigned integers, varints, booleans, enums, hashes, strings,
 * and raw bytes) embedded in Uint8Arrays into their corresponding Javascript
 * types.
 *
 * Major caveat - Javascript is unable to accurately represent integers larger
 * than 2^53 due to its use of a double-precision floating point format or all
 * numbers. If you need to guarantee that 64-bit values survive with all bits
 * intact, you _must_ read them using one of the split methods, which return
 * numbers.
 *
 * @author aappleby@google.com (Austin Appleby)
 */

goog.module('jspb.binary.decoder');
goog.module.declareLegacyNamespace();

const asserts = goog.require('goog.asserts');
const errors = goog.require('jspb.binary.errors');
const utils = goog.require('jspb.utils');
const {BinaryReaderOptions} = goog.requireType('jspb.binary.reader');
const {Buffer, bufferFromSource} = goog.require('jspb.binary.internal_buffer');
const {ByteSource} = goog.require('jspb.binary.bytesource');
const {ByteString} = goog.require('jspb.bytestring');
const {decodeUtf8} = goog.require('jspb.binary.utf8');
const {unsafeByteStringFromUint8Array} = goog.require('jspb.unsafe_bytestring');


/**
 * The maximum number of bytes in a varint.
 *
 * Every byte in a varint provides 7 bits and the largest number requires 64
 * bits which implies it would take up to 10 bytes to provide all the bits.  `10
 * == Math.ceil(64/7)`
 */
const /** number */ MAX_VARINT_SIZE = 10;

class BinaryDecoder {
  /**
   * BinaryDecoder implements the decoders for all the wire types specified in
   * https://developers.google.com/protocol-buffers/docs/encoding.
   *
   * @param {?ByteSource|!ByteString=} bytes The bytes we're reading from.
   * @param {number=} start The optional offset to start reading at.
   * @param {number=} length The optional length of the block to read -
   *     we'll throw an assertion if we go off the end of the block.
   * @param {!BinaryReaderOptions=} options options for this decoder.
   */
  constructor(bytes, start, length, options) {
    /**
     * Typed byte-wise view of the source buffer.
     * @private {?Uint8Array}
     */
    this.bytes_ = null;

    /**
     * Typed byte-wise view of the source buffer, if the data is immutable.
     * @private {?Buffer}
     */
    this.buffer_ = null;

    /** @private {boolean} */
    this.bytesAreImmutable_ = false;

    if (ASSUME_DATAVIEW_IS_FAST) {
      /**
       * DataView of the source buffer.
       * @private {?DataView}
       */
      this.dataView_ = null;
    }

    /**
     * Start point of the block to read.
     * @private {number}
     */
    this.start_ = 0;

    /**
     * End point of the block to read, this is exclusive.
     * @private {number}
     */
    this.end_ = 0;

    /**
     * Current read location in bytes_.
     * @private {number}
     */
    this.cursor_ = 0;

    /**
     * Set to true if this decoder should use subarray instead of slice.
     * @private {boolean}
     */
    this.aliasBytesFields;

    /**
     * Whether we should treat newly deserialized data as being immutable.
     *
     * @private {boolean}
     */
    this.treatNewDataAsImmutable;

    this.init(bytes, start, length, options);
  }

  /**
   * @param {?ByteSource|!ByteString=} bytes The bytes we're reading from.
   * @param {number=} start The optional offset to start reading at.
   * @param {number=} length The optional length of the block to read -
   *     we'll throw an assertion if we go off the end of the block.
   * @param {!BinaryReaderOptions=} options options for this decoder.
   * @private
   */
  init(
    bytes, start, length,
    { aliasBytesFields = false, treatNewDataAsImmutable = false } = {}) {
    this.aliasBytesFields = aliasBytesFields;
    this.treatNewDataAsImmutable = treatNewDataAsImmutable;
    if (bytes) {
      this.setBlock(bytes, start, length);
    }
  }

  /**
   * Pops an instance off the instance cache, or creates one if the cache is
   * empty.
   * @param {?ByteSource|!ByteString=} bytes The bytes we're reading from.
   * @param {number=} start The optional offset to start reading at.
   * @param {number=} length The optional length of the block to read -
   *     we'll throw an assertion if we go off the end of the block.
   * @param {!BinaryReaderOptions=} options options for this decoder.
   * @return {!BinaryDecoder}
   * @export
   */
  static alloc(bytes, start, length, options) {
    if (BinaryDecoder.instanceCache_.length) {
      const newDecoder = BinaryDecoder.instanceCache_.pop();
      newDecoder.init(bytes, start, length, options);
      return newDecoder;
    } else {
      return new BinaryDecoder(bytes, start, length, options);
    }
  }

  /**
   * Puts this instance back in the instance cache.
   * @export
   */
  free() {
    this.clear();
    if (BinaryDecoder.instanceCache_.length < 100) {
      BinaryDecoder.instanceCache_.push(this);
    }
  }

  /**
   * Clears the decoder.
   * @export
   */
  clear() {
    this.bytes_ = null;
    this.buffer_ = null;
    this.bytesAreImmutable_ = false;
    if (ASSUME_DATAVIEW_IS_FAST) {
      this.dataView_ = null;
    }
    this.start_ = 0;
    this.end_ = 0;
    this.cursor_ = 0;
    this.aliasBytesFields = false;
  }

  /**
   * @export
   * @return {boolean}
   */
  dataIsImmutable() {
    return this.bytesAreImmutable_;
  }

  /**
   * Returns the raw buffer.
   *
   * Throws if the internal buffer is immutable
   *
   * @export
   * @return {?Uint8Array} The raw buffer.
   */
  getBuffer() {
    if (this.bytesAreImmutable_) {
      throw goog.DEBUG ?
          new Error(
              'cannot access the buffer of decoders over immutable data.') :
          new Error();
    }
    return this.bytes_;
  }

  /**
   * Returns the raw buffer.
   *
   * Throws if the internal buffer is mutable
   *
   * @export
   * @return {?ByteString} The buffer.
   */
  getBufferAsByteString() {
    if (this.buffer_ == null) return null;
    if (!this.bytesAreImmutable_) {
      throw goog.DEBUG ?
          new Error(
              'cannot access the buffer of decoders over immutable data.') :
          new Error();
    }
    return this.buffer_.getBufferAsByteStringIfImmutable();
  }

  /**
   * Changes the block of bytes we're decoding.
   * @param {!ByteSource|!ByteString} data The bytes we're reading from.
   * @param {number=} start The optional offset to start reading at.
   * @param {number=} length The optional length of the block to read -
   *     we'll throw an assertion if we go off the end of the block.
   *
   * @export
   */
  setBlock(data, start, length) {
    const unpackedData = bufferFromSource(data, this.treatNewDataAsImmutable);
    this.buffer_ = unpackedData;
    this.bytes_ = unpackedData.buffer;
    this.bytesAreImmutable_ = unpackedData.isImmutable;
    if (ASSUME_DATAVIEW_IS_FAST) this.dataView_ = null;
    this.start_ = start || 0;
    this.end_ =
        (length !== undefined) ? this.start_ + length : this.bytes_.length;
    this.cursor_ = this.start_;
  }

  /**
   * @export
   * @return {number}
   */
  getEnd() {
    return this.end_;
  }


  /**
   * @param {number} end
   * @export
   */
  setEnd(end) {
    this.end_ = end;
  }

  /**
   * Moves the read cursor back to the start of the block.
   * @export
   */
  reset() {
    this.cursor_ = this.start_;
  }


  /**
   * Returns the internal read cursor.
   * @export
   * @return {number} The internal read cursor.
   */
  getCursor() {
    return this.cursor_;
  }

  /**
   * Returns the internal read cursor.
   * @param {number} cursor The new cursor.
   * @export
   */
  setCursor(cursor) {
    this.cursor_ = cursor;
  }


  /**
   * Advances the stream cursor by the given number of bytes.
   * @param {number} count The number of bytes to advance by.
   * @export
   */
  advance(count) {
    const newCursor = this.cursor_ + count;
    this.setCursorAndCheck(newCursor);
  }

  /**
   * Returns true if this decoder is at the end of the block.
   * @return {boolean}
   * @export
   */
  atEnd() {
    return this.cursor_ == this.end_;
  }


  /**
   * Returns true if this decoder is at the end of the block.
   * @return {boolean}
   * @export
   */
  pastEnd() {
    return this.cursor_ > this.end_;
  }

  /**
   * Reads an unsigned varint from the binary stream and invokes the conversion
   * function with the value in two signed 32 bit integers to produce the
   * result. Since this does not convert the value to a number, no precision is
   * lost.
   *
   * It's possible for an unsigned varint to be incorrectly encoded - more than
   * 64 bits' worth of data could be present. If this happens, this method will
   * throw an error.
   *
   * Decoding varints requires doing some funny base-128 math - for more
   * details on the format, see
   * https://developers.google.com/protocol-buffers/docs/encoding
   *
   * @param {!BinaryDecoder} decoder
   * @param {function(number, number): T} convert Conversion function to produce
   *     the result value, takes parameters (lowBits, highBits).
   * @return {T}
   * @export
   * @template T
   */
  static readSplitVarint64(decoder, convert) {
    let temp = 0;
    let lowBits = 0;
    let highBits = 0;
    let shift = 0;
    const bytes = decoder.bytes_;
    let cursor = decoder.cursor_;

    // Read the first five bytes of the varint, stopping at the terminator if we
    // see it.
    do {
      temp = bytes[cursor++];
      lowBits |= (temp & 0x7F) << shift;
      shift += 7;
    } while (shift < 32 && temp & 0x80);

    if (shift > 32) {
      // The fifth byte was read, which straddles the low and high dwords,
      // Save its contribution to the high dword.
      highBits |= (temp & 0x7F) >> 4;
    }

    // Read the sixth through tenth byte.
    for (shift = 3; shift < 32 && temp & 0x80; shift += 7) {
      temp = bytes[cursor++];
      highBits |= (temp & 0x7F) << shift;
    }

    decoder.setCursorAndCheck(cursor);

    if (temp < 128) {
      return convert(lowBits >>> 0, highBits >>> 0);
    }

    // If we did not see the terminator, the encoding was invalid.
    throw errors.invalidVarintError();
  }

  /**
   * Reads a signed zigzag encoded varint from the binary stream and invokes
   * the conversion function with the value in two signed 32 bit integers to
   * produce the result. Since this does not convert the value to a number, no
   * precision is lost.
   *
   * It's possible for an unsigned varint to be incorrectly encoded - more than
   * 64 bits' worth of data could be present. If this happens, this method will
   * throw an error.
   *
   * Zigzag encoding is a modification of varint encoding that reduces the
   * storage overhead for small negative integers - for more details on the
   * format, see https://developers.google.com/protocol-buffers/docs/encoding
   *
   * @param {!BinaryDecoder} decoder
   * @param {function(number, number): T} convert Conversion function to produce
   *     the result value, takes parameters (lowBits, highBits).
   * @return {T}
   * @export
   * @template T
   */
  static readSplitZigzagVarint64(decoder, convert) {
    return BinaryDecoder.readSplitVarint64(
        decoder, (low, high) => utils.fromZigzag64(low, high, convert));
  }

  /**
   * Reads a 64-bit fixed-width value from the stream and invokes the conversion
   * function with the value in two signed 32 bit integers to produce the
   * result. Since this does not convert the value to a number, no precision is
   * lost.
   *
   * @param {!BinaryDecoder} decoder
   * @param {function(number, number): T} convert Conversion function to produce
   *     the result value, takes parameters (lowBits, highBits).
   * @return {T}
   * @export
   * @template T
   */
  static readSplitFixed64(decoder, convert) {
    const bytes = decoder.bytes_;
    const cursor = decoder.cursor_;
    decoder.advance(8);
    let lowBits = 0;
    let highBits = 0;
    for (let i = cursor + 7; i >= cursor; i--) {
      lowBits = (lowBits << 8) | bytes[i];
      highBits = (highBits << 8) | bytes[i + 4];
    }
    return convert(lowBits, highBits);
  }

  /**
   * Skips over a varint in the block without decoding it.
   * @export
   */
  skipVarint() {
    // readBool does only trivial decoding, delegate to it.
    BinaryDecoder.readBool(this);
  }

  /**
   * Asserts that our cursor is in bounds.
   *
   * @private
   * @param {number} cursor
   * @return {void}
   */
  setCursorAndCheck(cursor) {
    this.cursor_ = cursor;
    if (cursor > this.end_) {
      throw errors.readTooFarError(this.end_, cursor);
    }
  }

  /**
   * Reads a 32-bit varint from the binary stream.
   *
   * This function is called vastly more frequently than any other in
   * BinaryDecoder, so it has been unrolled and tweaked for performance.
   *
   * Decoding varints requires doing some funny base-128 math - for more
   * details on the format, see
   * https://developers.google.com/protocol-buffers/docs/encoding
   *
   * @param {!BinaryDecoder} decoder
   * @return {number} The decoded unsigned 32-bit varint.
   * @export
   */
  static readSignedVarint32(decoder) {
    const bytes = decoder.bytes_;
    let cursor = decoder.cursor_;

    let temp = bytes[cursor++];
    let x = (temp & 0x7F);

    if (temp & 0x80) {
      temp = bytes[cursor++];
      x |= (temp & 0x7F) << 7;

      if (temp & 0x80) {
        temp = bytes[cursor++];
        x |= (temp & 0x7F) << 14;

        if (temp & 0x80) {
          temp = bytes[cursor++];
          x |= (temp & 0x7F) << 21;

          if (temp & 0x80) {
            temp = bytes[cursor++];
            // We're reading the high bits of an unsigned varint. The byte we
            // just read also contains bits 33 through 35, which we're going to
            // discard.
            x |= temp << 28;

            if (temp & 0x80) {
              // If we get here, we need to truncate coming bytes. However we
              // need to make sure cursor place is correct.
              if (bytes[cursor++] & 0x80 && bytes[cursor++] & 0x80 &&
                  bytes[cursor++] & 0x80 && bytes[cursor++] & 0x80 &&
                  bytes[cursor++] & 0x80) {
                // If we get here, the varint is too long.
                throw errors.invalidVarintError();
              }
            }
          }
        }
      }
    }

    decoder.setCursorAndCheck(cursor);
    return x;
  }

  /**
   * Reads an unsigned 32-bit varint from the binary stream.
   *
   * @param {!BinaryDecoder} decoder
   * @return {number} The decoded signed 32-bit varint.
   * @export
   */
  static readUnsignedVarint32(decoder) {
    return BinaryDecoder.readSignedVarint32(decoder) >>> 0;
  }

  /**
   * Peeks into the binary stream. If the value is an unsigned varint matching
   * `expected`, returns the initial cursor position and advances the cursor
   * past the varint. If the value is different, or the stream ends, returns
   * -1.
   *
   * Designed for peeking to see the field header tag for the next field.
   *
   * Will only match minimal encodings, will only read up to 35 bits (5 7-bit
   * bytes), and will not match over-long encodings even if they are short.
   *
   * A) These methods are optional optimizations, if they're conservative in
   * matching, nothing should break, we'll just see another repeated field the
   * normal way if the tag is encoded strangely.
   *
   * B) We don't want to reuse the "normal" read method, because it will throw
   * on invalid formats and reading past the end, which we don't want to fail.
   *
   * C) If we somehow start to expect a difference in varint encoding,  this
   * decoder method likely needs to be aware of what information is encoded in
   * that deviation anyway.
   *
   * @param {number} expected
   * @return {number}
   * @export
   */
  readUnsignedVarint32IfEqualTo(expected) {
    asserts.assert(expected === expected >>> 0);
    const initialCursor = this.cursor_;
    let cursor = initialCursor;
    const end = this.end_;
    const bytes = this.bytes_;
    while (cursor < end) {
      if (expected > 0x7F) {
        const expectedByte = 0x80 | (expected & 0x7F);
        if (bytes[cursor++] !== expectedByte) {
          return -1;
        }
        expected >>>= 7;
      } else {
        // Last byte of the expected value.
        if (bytes[cursor++] === expected) {
          this.cursor_ = cursor;
          return initialCursor;
        } else {
          return -1;
        }
      }
    }
    return -1;
  }


  /**
   * Reads a signed, zigzag-encoded 32-bit varint from the binary stream.
   *
   * Zigzag encoding is a modification of varint encoding that reduces the
   * storage overhead for small negative integers - for more details on the
   * format, see https://developers.google.com/protocol-buffers/docs/encoding
   *
   * @param {!BinaryDecoder} decoder
   * @return {number} The decoded signed, zigzag-encoded 32-bit varint.
   * @export
   */
  static readZigzagVarint32(decoder) {
    return utils.fromZigzag32(BinaryDecoder.readUnsignedVarint32(decoder));
  }

  /**
   * Reads an unsigned 64-bit varint from the binary stream. Note that since
   * Javascript represents all numbers as double-precision floats, there will be
   * precision lost if the absolute value of the varint is larger than 2^53.
   *
   * @param {!BinaryDecoder} decoder
   * @return {number} The decoded unsigned varint. Precision will be lost if the
   *     integer exceeds 2^53.
   * @export
   */
  static readUnsignedVarint64(decoder) {
    return BinaryDecoder.readSplitVarint64(decoder, utils.joinUint64);
  }

  /**
   * Reads an unsigned 64-bit varint from the binary stream and returns the
   * value as a decimal string.
   *
   * @param {!BinaryDecoder} decoder
   * @return {string} The decoded unsigned varint as a decimal string.
   * @export
   */
  static readUnsignedVarint64String(decoder) {
    return BinaryDecoder.readSplitVarint64(
        decoder, utils.joinUnsignedDecimalString);
  }

  /**
   * Reads a signed 64-bit varint from the binary stream. Note that since
   * Javascript represents all numbers as double-precision floats, there will be
   * precision lost if the absolute value of the varint is larger than 2^53.
   *
   * @param {!BinaryDecoder} decoder
   * @return {number} The decoded signed varint. Precision will be lost if the
   *     integer exceeds 2^53.
   * @export
   */
  static readSignedVarint64(decoder) {
    return BinaryDecoder.readSplitVarint64(decoder, utils.joinInt64);
  }

  /**
   * Reads an signed 64-bit varint from the binary stream and returns the value
   * as a decimal string.
   *
   * @param {!BinaryDecoder} decoder
   * @return {string} The decoded signed varint as a decimal string.
   * @export
   */
  static readSignedVarint64String(decoder) {
    return BinaryDecoder.readSplitVarint64(
        decoder, utils.joinSignedDecimalString);
  }

  /**
   * Reads a signed, zigzag-encoded 64-bit varint from the binary stream. Note
   * that since Javascript represents all numbers as double-precision floats,
   * there will be precision lost if the absolute value of the varint is larger
   * than 2^53.
   *
   * Zigzag encoding is a modification of varint encoding that reduces the
   * storage overhead for small negative integers - for more details on the
   * format, see https://developers.google.com/protocol-buffers/docs/encoding
   *
   * @param {!BinaryDecoder} decoder
   * @return {number} The decoded zigzag varint. Precision will be lost if the
   *     integer exceeds 2^53.
   * @export
   */
  static readZigzagVarint64(decoder) {
    return BinaryDecoder.readSplitVarint64(decoder, utils.joinZigzag64);
  }


  /**
   * Reads a signed, zigzag-encoded 64-bit varint from the binary stream and
   * returns its value as a string.
   *
   * Zigzag encoding is a modification of varint encoding that reduces the
   * storage overhead for small negative integers - for more details on the
   * format, see https://developers.google.com/protocol-buffers/docs/encoding
   *
   * @param {!BinaryDecoder} decoder
   * @return {string} The decoded signed, zigzag-encoded 64-bit varint as a
   * string.
   * @export
   */
  static readZigzagVarint64String(decoder) {
    return BinaryDecoder.readSplitZigzagVarint64(
        decoder, utils.joinSignedDecimalString);
  }

  /**
   * Reads a raw unsigned 8-bit integer from the binary stream.
   *
   * @param {!BinaryDecoder} decoder
   * @return {number} The unsigned 8-bit integer read from the binary stream.
   * @export
   */
  static readUint8(decoder) {
    const a = decoder.bytes_[decoder.cursor_ + 0];
    decoder.advance(1);
    return a;
  }


  /**
   * Reads a raw unsigned 16-bit integer from the binary stream.
   *
   * @param {!BinaryDecoder} decoder
   * @return {number} The unsigned 16-bit integer read from the binary stream.
   * @export
   */
  static readUint16(decoder) {
    const a = decoder.bytes_[decoder.cursor_ + 0];
    const b = decoder.bytes_[decoder.cursor_ + 1];
    decoder.advance(2);
    return (a << 0) | (b << 8);
  }


  /**
   * Reads a raw unsigned 32-bit integer from the binary stream.
   *
   * @param {!BinaryDecoder} decoder
   * @return {number} The unsigned 32-bit integer read from the binary stream.
   * @export
   */
  static readUint32(decoder) {
    const bytes = decoder.bytes_;
    const cursor = decoder.cursor_;
    const a = bytes[cursor + 0];
    const b = bytes[cursor + 1];
    const c = bytes[cursor + 2];
    const d = bytes[cursor + 3];
    decoder.advance(4);
    return ((a << 0) | (b << 8) | (c << 16) | (d << 24)) >>> 0;
  }

  /**
   * Reads a raw unsigned 64-bit integer from the binary stream. Note that since
   * Javascript represents all numbers as double-precision floats, there will be
   * precision lost if the absolute value of the integer is larger than 2^53.
   *
   * @param {!BinaryDecoder} decoder
   * @return {number} The unsigned 64-bit integer read from the binary stream.
   *     Precision will be lost if the integer exceeds 2^53.
   * @export
   */
  static readUint64(decoder) {
    const bitsLow = BinaryDecoder.readUint32(decoder);
    const bitsHigh = BinaryDecoder.readUint32(decoder);
    return utils.joinUint64(bitsLow, bitsHigh);
  }

  /**
   * Reads a raw unsigned 64-bit integer from the binary stream.
   *
   * @param {!BinaryDecoder} decoder
   * @return {string} The unsigned 64-bit integer read from the binary stream.
   * @export
   */
  static readUint64String(decoder) {
    const bitsLow = BinaryDecoder.readUint32(decoder);
    const bitsHigh = BinaryDecoder.readUint32(decoder);
    return utils.joinUnsignedDecimalString(bitsLow, bitsHigh);
  }

  /**
   * Reads a raw signed 8-bit integer from the binary stream.
   *
   * @param {!BinaryDecoder} decoder
   * @return {number} The signed 8-bit integer read from the binary stream.
   * @export
   */
  static readInt8(decoder) {
    const a = decoder.bytes_[decoder.cursor_ + 0];
    decoder.advance(1);
    return (a << 24) >> 24;
  }


  /**
   * Reads a raw signed 16-bit integer from the binary stream.
   *
   * @param {!BinaryDecoder} decoder
   * @return {number} The signed 16-bit integer read from the binary stream.
   * @export
   */
  static readInt16(decoder) {
    const a = decoder.bytes_[decoder.cursor_ + 0];
    const b = decoder.bytes_[decoder.cursor_ + 1];
    decoder.advance(2);
    return (((a << 0) | (b << 8)) << 16) >> 16;
  }


  /**
   * Reads a raw signed 32-bit integer from the binary stream.
   *
   * @param {!BinaryDecoder} decoder
   * @return {number} The signed 32-bit integer read from the binary stream.
   * @export
   */
  static readInt32(decoder) {
    const bytes = decoder.bytes_;
    const cursor = decoder.cursor_;
    const a = bytes[cursor + 0];
    const b = bytes[cursor + 1];
    const c = bytes[cursor + 2];
    const d = bytes[cursor + 3];
    decoder.advance(4);
    return (a << 0) | (b << 8) | (c << 16) | (d << 24);
  }

  /**
   * Reads a raw signed 64-bit integer from the binary stream. Note that since
   * Javascript represents all numbers as double-precision floats, there will be
   * precision lost if the absolute value of the integer is larger than 2^53.
   *
   * @param {!BinaryDecoder} decoder
   * @return {number} The signed 64-bit integer read from the binary stream.
   *     Precision will be lost if the integer exceeds 2^53.
   * @export
   */
  static readInt64(decoder) {
    const bitsLow = BinaryDecoder.readUint32(decoder);
    const bitsHigh = BinaryDecoder.readUint32(decoder);
    return utils.joinInt64(bitsLow, bitsHigh);
  }

  /**
   * Reads a raw signed 64-bit integer from the binary stream and returns it as
   * a string.
   *
   * @param {!BinaryDecoder} decoder
   * @return {string} The signed 64-bit integer read from the binary stream.
   *     Precision will be lost if the integer exceeds 2^53.
   * @export
   */
  static readInt64String(decoder) {
    const bitsLow = BinaryDecoder.readUint32(decoder);
    const bitsHigh = BinaryDecoder.readUint32(decoder);
    return utils.joinSignedDecimalString(bitsLow, bitsHigh);
  }

  /**
   * Reads a 32-bit floating-point number from the binary stream, using the
   * temporary buffer to realign the data.
   *
   * @param {!BinaryDecoder} decoder
   * @return {number} The float read from the binary stream.
   * @export
   */
  static readFloat(decoder) {
    const bitsLow = BinaryDecoder.readUint32(decoder);
    const bitsHigh = 0;
    return utils.joinFloat32(bitsLow, bitsHigh);
  }

  /**
   * Reads a 64-bit floating-point number from the binary stream, using the
   * temporary buffer to realign the data.
   *
   * @param {!BinaryDecoder} decoder
   * @return {number} The double read from the binary stream.
   * @export
   */
  static readDouble(decoder) {
    if (ASSUME_DATAVIEW_IS_FAST) {
      const result = decoder.getDataView().getFloat64(
          decoder.cursor_, true /* little endian */);
      decoder.advance(8);
      return result;
    } else {
      const bitsLow = BinaryDecoder.readUint32(decoder);
      const bitsHigh = BinaryDecoder.readUint32(decoder);
      return utils.joinFloat64(bitsLow, bitsHigh);
    }
  }

  /**
   * Reads an array of 64-bit floating-point numbers from the binary stream.
   *
   * @param {number} len The number of doubles to read.
   * @param {!Array<number>} dst Where to append the result to.
   * @export
   */
  readDoubleArrayInto(len, dst) {
    const cursor = this.cursor_;
    const byteLength = 8 * len;
    if (cursor + byteLength > this.end_) {
      throw errors.readTooFarError(byteLength, this.end_ - cursor);
    }

    const bytes = this.bytes_;
    const bufferStart = cursor + bytes.byteOffset;

    if (ASSUME_DATAVIEW_IS_FAST) {
      // We create a subview that we'll traverse in its entirety, so that our
      // "end of loop" condition matches the bounds check that the JIT will
      // insert, in the hopes that the JIT only needs to run one of those checks
      // instead of both. This seems to help benchmarks.
      this.cursor_ += byteLength;
      const subView = new DataView(bytes.buffer, bufferStart, byteLength);
      let i = 0;
      while (true) {
        let next_i = i + 8;
        if (next_i > subView.byteLength) {
          break;
        }
        dst.push(subView.getFloat64(i, /*littleEndian=*/ true));
        i = next_i;
      }
    } else if (OPTIMIZE_LITTLE_ENDIAN_MACHINES && isLittleEndian()) {
      // We can use Float64Array to directly interpret the bytes as float64
      // values, since this is a little endian machine. However, Float64Array
      // will reject non-multiple-of-8 byte offsets, so we create a copy of the
      // underlying ArrayBuffer.
      this.cursor_ += byteLength;
      const doubleArray = new Float64Array(
          bytes.buffer.slice(bufferStart, bufferStart + byteLength));
      for (let i = 0; i < doubleArray.length; i++) {
        dst.push(doubleArray[i]);
      }
    } else {
      for (let i = 0; i < len; i++) {
        dst.push(BinaryDecoder.readDouble(
            this,
            ));
      }
    }
  }

  /**
   * Reads a boolean value from the binary stream.
   * @param {!BinaryDecoder} decoder
   * @return {boolean} The boolean read from the binary stream.
   * @export
   */
  static readBool(decoder) {
    let varintBits = 0;
    let cursor = decoder.cursor_;
    const invalidCursor = cursor + MAX_VARINT_SIZE;
    const bytes = decoder.bytes_;
    while (cursor < invalidCursor) {
      // scan for the first byte where the uppermost bit is 0 which signals the
      // end of the varint
      const byte = bytes[cursor++];
      varintBits |= byte;
      if ((byte & 0x80) === 0) {
        decoder.setCursorAndCheck(cursor);
        // Varints store their 'values' in the lower 7 bits, so if we
        // accumulated any non-zero bits then the varint is non-zero and the
        // bool is true.
        return !!(varintBits & 0x7f);
      }
    }
    throw errors.invalidVarintError();
  }

  /**
   * Reads an enum value from the binary stream, which are always encoded as
   * signed varints.
   * @param {!BinaryDecoder} decoder
   * @return {number} The enum value read from the binary stream.
   * @export
   */
  static readEnum(decoder) {
    return BinaryDecoder.readSignedVarint32(decoder);
  }

  /**
   * @return {number} original cursor.
   * @private
   */
  checkReadLengthAndAdvance(/** number */ length) {
    if (length < 0) {
      throw errors.negativeByteLengthError(length);
    }
    const cursor = this.cursor_;
    const newCursor = cursor + length;
    if (newCursor > this.end_) {
      throw errors.readTooFarError(length, this.end_ - cursor);
    }
    this.cursor_ = newCursor;
    return cursor;
  }

  /**
   * Reads and parses a UTF-8 encoded unicode string from the stream.
   * The code is inspired by maps.vectortown.parse.StreamedDataViewReader.
   * Supports codepoints from U+0000 up to U+10FFFF.
   * (http://en.wikipedia.org/wiki/UTF-8).
   * @param {number} length The length of the string to read.
   * @param {boolean} parsingErrorsAreFatal Whether to throw when invalid utf8
   *     is found.
   * @return {string} The decoded string.
   * @export
   */
  readString(length, parsingErrorsAreFatal) {
    const cursor = this.checkReadLengthAndAdvance(length);
    const result = decodeUtf8(
        asserts.assert(this.bytes_), cursor, length, parsingErrorsAreFatal);
    return result;
  }


  /**
   * Reads a block of raw bytes from the binary stream.
   *
   * @param {number} length The number of bytes to read.
   * @return {!Uint8Array} The decoded block of bytes.
   * @export
   */
  readBytes(length) {
    const cursor = this.checkReadLengthAndAdvance(length);
    // Take care not to return mutable references to immutable data.
    const result = this.aliasBytesFields && !this.bytesAreImmutable_ ?
        this.bytes_.subarray(cursor, cursor + length) :
        utils.sliceUint8Array(
            asserts.assert(this.bytes_), cursor, cursor + length);
    return result;
  }

  /**
   * Reads a block of raw bytes from the binary stream as a ByteString
   *
   * @param {number} length The number of bytes to read.
   * @return {!ByteString} The decoded block of bytes.
   * @export
   */
  readByteString(length) {
    if (length == 0) {
      // Special case because slice is relatively slow, even on empty slices.
      return ByteString.empty();
    }
    const cursor = this.checkReadLengthAndAdvance(length);
    // We can return a view if the source is also immutable
    const result = this.aliasBytesFields && this.bytesAreImmutable_ ?
        this.bytes_.subarray(cursor, cursor + length) :
        utils.sliceUint8Array(
            asserts.assert(this.bytes_), cursor, cursor + length);
    // no need to checkCursor, we already checked above
    // This unsafe call is actually safe because we either have sliced the array
    // above, or we know the source of the 'subarray' view is immutable and so
    // we can reference it from an immutable ByteString
    return unsafeByteStringFromUint8Array(result);
  }

  /**
   * @return {!DataView}
   * @private
   */
  getDataView() {
    let dataView = this.dataView_;
    if (!dataView) {
      const bytes = this.bytes_;
      dataView = this.dataView_ =
          new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    }
    return dataView;
  }

  /**
   * Visible for testing.
   * @export
   * @package
   */
  static resetInstanceCache() {
    BinaryDecoder.instanceCache_ = [];
  }

  /**
   * Visible for testing.
   * @return {!Array<!BinaryDecoder>}
   * @export
   * @package
   */
  static getInstanceCache() {
    return BinaryDecoder.instanceCache_;
  }
}


/**
 * Global pool of BinaryDecoder instances.
 * @private {!Array<!BinaryDecoder>}
 */
BinaryDecoder.instanceCache_ = [];

/**
 * Is this machine little endian?
 * @return {boolean}
 */
function isLittleEndian() {
  if (isLittleEndianCache === undefined) {
    // Do a trial memory load.
    isLittleEndianCache =
        new Uint16Array(new Uint8Array([1, 2]).buffer)[0] == (1 + 256 * 2);
  }
  return asserts.assertBoolean(isLittleEndianCache);
}

/** Global cache of the isLittleEndian check. */
let isLittleEndianCache = undefined;

/**
 * @define {boolean}
 * Whether DataView is known to be present and has a fast implementation.
 * Chrome's implementation was slow until late 2018:
 * https://v8.dev/blog/dataview. Unsure of the performance on other browsers.
 */
const ASSUME_DATAVIEW_IS_FAST = goog.define(
    'jspb.BinaryDecoder.ASSUME_DATAVIEW_IS_FAST', goog.FEATURESET_YEAR >= 2019);

/**
 * @define {boolean} If true, on little endian machines we'll enable the fast
 *   path for float64 decoding.
 *
 *   Only exists for testing.
 */
const OPTIMIZE_LITTLE_ENDIAN_MACHINES =
    goog.define('jspb.BinaryDecoder.OPTIMIZE_LITTLE_ENDIAN_MACHINES', true);


exports = {
  BinaryDecoder,
};
