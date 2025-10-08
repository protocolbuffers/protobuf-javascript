/**
 * @fileoverview This file contains utilities for encoding Javascript objects
 * into binary, wire-format protocol buffers (in the form of Uint8Arrays) that
 * a server can consume directly.
 *
 * jspb's BinaryWriter class defines methods for efficiently encoding
 * Javascript objects into binary, wire-format protocol buffers and supports
 * all the fundamental field types used in protocol buffers.
 *
 * Major caveat 1 - Users of this library _must_ keep their Javascript proto
 * parsing code in sync with the original .proto file - presumably you'll be
 * using the typed jspb code generator, but if you bypass that you'll need
 * to keep things in sync by hand.
 *
 * Major caveat 2 - Javascript is unable to accurately represent integers
 * larger than 2^53 due to its use of a double-precision floating point format
 * for all numbers. BinaryWriter does not make any special effort to preserve
 * precision for values above this limit - if you need to pass 64-bit integers
 * (hash codes, for example) between the client and server without precision
 * loss, do _not_ use this library.
 *
 * Major caveat 3 - This class uses typed arrays and must not be used on older
 * browsers that do not support them.
 *
 * @author aappleby@google.com (Austin Appleby)
 */

goog.module('jspb.binary.writer');
goog.module.declareLegacyNamespace();

const { Alphabet, encodeByteArray: encodeByteArraySlow } = goog.require('goog.crypt.base64');
const { AnyFieldType } = goog.requireType('jspb.binary.any_field_type');
const { BinaryEncoder } = goog.require('jspb.binary.encoder');
const { ByteSource } = goog.requireType('jspb.binary.bytesource');
const { ByteString } = goog.require('jspb.bytestring');
const { FieldType, TWO_TO_31, TWO_TO_32, TWO_TO_63, TWO_TO_64, WireType } = goog.require('jspb.BinaryConstants');
const { Int64, UInt64 } = goog.require('jspb.arith');
const { assert, fail } = goog.require('goog.asserts');
const { bufferFromSource } = goog.require('jspb.binary.internal_buffer');
const { encodeByteArray } = goog.require('jspb.internal_bytes');
const { encodeUtf8 } = goog.require('jspb.binary.utf8');
const { makeTag } = goog.require('jspb.utils');
const { unsafeByteStringFromUint8Array, unsafeUint8ArrayFromByteString } = goog.require('jspb.unsafe_bytestring');
/**
 * Whether to reject unpaired surrogates when encoding strings to utf8.
 *
 * <p>Currently set to `goog.DEBUG`, but can be disabled if needed.
 *
 * @define {boolean}
 */
const REJECT_UNPAIRED_SURROGATES =
  goog.define('jspb.binary.REJECT_UNPAIRED_SURROGATES', goog.DEBUG);

/**
 * BinaryWriter implements encoders for all the wire types specified in
 * https://developers.google.com/protocol-buffers/docs/encoding.
 */
class BinaryWriter {
  constructor() {
    /**
     * Blocks of serialized data that will be concatenated once all messages
     * have been written.
     * @private {!Array<!Uint8Array|!Array<number>>}
     */
    this.blocks_ = [];

    /**
     * Total number of bytes in the blocks_ array. Does _not_ include bytes in
     * the encoder below.
     * @private {number}
     */
    this.totalLength_ = 0;

    /**
     * Binary encoder holding pieces of a message that we're still serializing.
     * When we get to a stopping point (either the start of a new submessage, or
     * when we need to append a raw Uint8Array), the encoder's buffer will be
     * added to the block array above and the encoder will be reset.
     * @private @const {!BinaryEncoder}
     */
    this.encoder_ = new BinaryEncoder();
  }

  /** @private*/
  pushBlock(/** !Array<number>|!Uint8Array */ buffer) {
    // Repeated calls to appendUint8Arrays may produce empty arrays from the
    // encoder, avoid storing these in our list of blocks.
    if (buffer.length !== 0) {
      this.blocks_.push(buffer);
      this.totalLength_ += buffer.length;
    }
  }

  /**
   * Append a typed array of bytes onto the buffer.
   *
   * @param {!Uint8Array} arr The byte array to append.
   * @private
   */
  appendUint8Array_(arr) {
    this.pushBlock(this.encoder_.end());
    this.pushBlock(arr);
  }

  /**
   * Begins a new message by writing the field header and returning a bookmark
   * which we will use to patch in the message length to in endDelimited_ below.
   * @param {number} field
   * @return {!Array<number>}
   * @private
   */
  beginDelimited_(field) {
    this.writeFieldHeader_(field, WireType.DELIMITED);
    const bookmark = this.encoder_.end();
    this.pushBlock(bookmark);
    bookmark.push(
      this.totalLength_);  // store the current length in the bookmark
    return bookmark;
  }

  /**
   * Ends a message by encoding the _change_ in length of the buffer to the
   * parent block and adds the number of bytes needed to encode that length to
   * the total byte length.
   * @param {!Array<number>} bookmark
   * @private
   */
  endDelimited_(bookmark) {
    const oldLength = bookmark.pop();
    let messageLength = this.totalLength_ + this.encoder_.length() - oldLength;
    assert(messageLength >= 0);

    while (messageLength > 127) {
      bookmark.push((messageLength & 0x7f) | 0x80);
      messageLength = messageLength >>> 7;
      this.totalLength_++;
    }

    bookmark.push(messageLength);
    this.totalLength_++;
  }

  /**
   * Writes unknown fields to the output if there are any.
   */
  writeUnknownFields(/** !Array<!ByteString> */ unknownFields) {
    this.pushBlock(this.encoder_.end());
    for (let i = 0; i < unknownFields.length; i++) {
      // Unsafe access is ok here since arrays added to our output are always
      // copied before returning to the user.
      this.pushBlock(unsafeUint8ArrayFromByteString(unknownFields[i]));
    }
  }

  /**
   * Writes a pre-serialized message to the buffer.
   * @param {!Uint8Array} bytes The array of bytes to write.
   * @param {number} start The start of the range to write.
   * @param {number} end The end of the range to write.
   */
  writeSerializedMessage(bytes, start, end) {
    this.appendUint8Array_(bytes.subarray(start, end));
  }

  /**
   * Writes a pre-serialized message to the buffer if the message and endpoints
   * are non-null.
   * @param {?Uint8Array} bytes The array of bytes to write.
   * @param {?number} start The start of the range to write.
   * @param {?number} end The end of the range to write.
   */
  maybeWriteSerializedMessage(bytes, start, end) {
    if (bytes != null && start != null && end != null) {
      this.writeSerializedMessage(bytes, start, end);
    }
  }

  /**
   * Resets the writer, throwing away any accumulated buffers.
   */
  reset() {
    this.blocks_ = [];
    this.encoder_.end();
    this.totalLength_ = 0;
  }

  /**
   * Converts the encoded data into a Uint8Array.
   * @return {!Uint8Array}
   */
  getResultBuffer() {
    // flush the encoder to avoid a special case below.
    this.pushBlock(this.encoder_.end());
    const resultLength = this.totalLength_;
    // NOTE: some of the Uint8Arrays stored in blocks_ are backing stores for
    // ByteString objects and so we should be careful not to leak references to
    // them from here.  i.o.w. don't add an optimization that directly returns
    // references to things in blocks.
    const flat = new Uint8Array(resultLength);
    const blocks = this.blocks_;
    const blockCount = blocks.length;
    let offset = 0;

    for (let i = 0; i < blockCount; i++) {
      const block = blocks[i];
      flat.set(block, offset);
      offset += block.length;
    }

    // Post condition: `flattened` must have had every byte written.
    assert(offset == flat.length);

    // Replace our block list with the flattened block, which lets GC reclaim
    // the temp blocks sooner.
    this.blocks_ = [flat];

    return flat;
  }

  /**
   * Converts the encoded data into a ByteString.
   * @return {!ByteString}
   */
  getResultBufferAsByteString() {
    // Note that this is safe because we never leak or mutate the Uint8Array
    // returned by getResultBuffer even though it's stored in `blocks_`.
    return unsafeByteStringFromUint8Array(this.getResultBuffer());
  }

  /**
   * Converts the encoded data into a base64-encoded string.
   * @param {!Alphabet=} alphabet Which flavor of base64 to
   *     use.
   * @return {string}
   */
  getResultBase64String(alphabet) {
    if (alphabet === undefined) {
      return encodeByteArray(this.getResultBuffer());
    } else {
      return encodeByteArraySlow(this.getResultBuffer(), alphabet);
    }
  }

  /**
   * Encodes a (field number, wire type) tuple into a wire-format field header
   * and stores it in the buffer as a varint.
   * @param {number} field The field number.
   * @param {!WireType} wireType The wire-type of the field, as specified in the
   *     protocol buffer documentation.
   * @private
   */
  writeFieldHeader_(field, wireType) {
    assert(field >= 1 && field == Math.floor(field));
    this.encoder_.writeUnsignedVarint32(makeTag(field, wireType));
  }

  // TODO(b/221101646): Maybe update AnyFieldType to include ByteString.
  /**
   * Writes a field of any valid scalar type to the binary stream.
   * @param {!FieldType} fieldType
   * @param {number} field
   * @param {!AnyFieldType|!ByteString} value
   */
  writeAny(fieldType, field, value) {
    switch (fieldType) {
      case FieldType.DOUBLE:
        this.writeDouble(field, /** @type {number} */(value));
        return;
      case FieldType.FLOAT:
        this.writeFloat(field, /** @type {number} */(value));
        return;
      case FieldType.INT64:
        this.writeInt64(field, /** @type {number} */(value));
        return;
      case FieldType.UINT64:
        this.writeUint64(field, /** @type {number} */(value));
        return;
      case FieldType.INT32:
        this.writeInt32(field, /** @type {number} */(value));
        return;
      case FieldType.FIXED64:
        this.writeFixed64(field, /** @type {number} */(value));
        return;
      case FieldType.FIXED32:
        this.writeFixed32(field, /** @type {number} */(value));
        return;
      case FieldType.BOOL:
        this.writeBool(field, /** @type {boolean} */(value));
        return;
      case FieldType.STRING:
        this.writeString(field, /** @type {string} */(value));
        return;
      case FieldType.GROUP:
        fail('Group field type not supported in writeAny()');
        return;
      case FieldType.MESSAGE:
        fail('Message field type not supported in writeAny()');
        return;
      case FieldType.BYTES:
        this.writeBytes(field, /** @type {?ByteSource|?ByteString} */(value));
        return;
      case FieldType.UINT32:
        this.writeUint32(field, /** @type {number} */(value));
        return;
      case FieldType.ENUM:
        this.writeEnum(field, /** @type {number} */(value));
        return;
      case FieldType.SFIXED32:
        this.writeSfixed32(field, /** @type {number} */(value));
        return;
      case FieldType.SFIXED64:
        this.writeSfixed64(field, /** @type {number} */(value));
        return;
      case FieldType.SINT32:
        this.writeSint32(field, /** @type {number} */(value));
        return;
      case FieldType.SINT64:
        this.writeSint64(field, /** @type {number} */(value));
        return;
      default:
        fail('Invalid field type in writeAny()');
        return;
    }
  }

  /**
   * Writes a varint field to the buffer without range checking.
   * @param {number} field The field number.
   * @param {number|null|undefined} value The value to write.
   * @private
   */
  writeUnsignedVarint32_(field, value) {
    if (value == null) return;
    this.writeFieldHeader_(field, WireType.VARINT);
    this.encoder_.writeUnsignedVarint32(value);
  }

  /**
   * Writes a varint field to the buffer without range checking.
   * @param {number} field The field number.
   * @param {number|null|undefined} value The value to write.
   * @private
   */
  writeSignedVarint32_(field, value) {
    if (value == null) return;
    assertSignedInteger(field, value);
    this.writeFieldHeader_(field, WireType.VARINT);
    this.encoder_.writeSignedVarint32(value);
  }

  /**
   * Writes a varint field to the buffer without range checking.
   * @param {number} field The field number.
   * @param {number|string|!bigint|null|undefined} value The value to write.
   * @private
   */
  writeUnsignedVarint64_(field, value) {
    if (value == null) return;
    this.writeFieldHeader_(field, WireType.VARINT);
    switch (typeof value) {
      case 'number':
        this.encoder_.writeUnsignedVarint64(value);
        break;

      case 'bigint': {
        const num = UInt64.fromBigInt(/** @type {bigint} */(value));
        this.encoder_.writeSplitVarint64(num.lo, num.hi);
        break;
      }

      default: {
        const num = UInt64.fromString(/** @type {string} */(value));
        this.encoder_.writeSplitVarint64(num.lo, num.hi);
        break;
      }
    }
  }

  /**
   * Writes a varint field to the buffer without range checking.
   * @param {number} field The field number.
   * @param {number|string?|!bigint|null|undefined} value The value to write.
   * @private
   */
  writeSignedVarint64_(field, value) {
    if (value == null) return;
    this.writeFieldHeader_(field, WireType.VARINT);
    switch (typeof value) {
      case 'number':
        this.encoder_.writeSignedVarint64(value);
        break;

      case 'bigint': {
        const num = Int64.fromBigInt(/** @type {bigint} */(value));
        this.encoder_.writeSplitVarint64(num.lo, num.hi);
        break;
      }

      default: {
        const num = Int64.fromString(/** @type {string} */(value));
        this.encoder_.writeSplitVarint64(num.lo, num.hi);
        break;
      }
    }
  }

  /**
   * Writes a zigzag varint field to the buffer without range checking.
   * @param {number} field The field number.
   * @param {number|null|undefined} value The value to write.
   * @private
   */
  writeZigzagVarint32_(field, value) {
    if (value == null) return;
    this.writeFieldHeader_(field, WireType.VARINT);
    this.encoder_.writeZigzagVarint32(value);
  }

  /**
   * Writes a zigzag varint field to the buffer without range checking.
   * @param {number} field The field number.
   * @param {number|string|!bigint|null|undefined} value The value to write.
   * @private
   */
  writeZigzagVarint64_(field, value) {
    if (value == null) return;
    this.writeFieldHeader_(field, WireType.VARINT);
    switch (typeof value) {
      case 'number':
        this.encoder_.writeZigzagVarint64(/** @type {number} */(value));
        break;

      default:
        this.encoder_.writeZigzagVarint64String(/** @type {string} */(value));
        break;
    }
  }

  /**
   * Writes an int32 field to the buffer. Numbers outside the range [-2^31,2^31)
   * will be truncated.
   * @param {number} field The field number.
   * @param {number|null|undefined} value The value to write.
   */
  writeInt32(field, value) {
    if (value == null) return;
    assertThat(field, value, (value >= -TWO_TO_31) && (value < TWO_TO_31));
    this.writeSignedVarint32_(field, value);
  }

  /**
   * Writes an int64 field to the buffer. Numbers outside the range [-2^63,2^63)
   * will be truncated.
   * @param {number} field The field number.
   * @param {number|string|!bigint|null|undefined} value The value to write.
   */
  writeInt64(field, value) {
    if (value == null) return;
    assertSignedInt64(field, value);
    this.writeSignedVarint64_(field, value);
  }

  /**
   * Writes a int64 field (with value as a string) to the buffer.
   * @param {number} field The field number.
   * @param {string|null|undefined} value The value to write.
   * @deprecated Use writeInt64()
   */
  writeInt64String(field, value) {
    this.writeInt64(field, value);
  }

  /**
   * Writes a uint32 field to the buffer. Numbers outside the range [0,2^32)
   * will be truncated.
   * @param {number} field The field number.
   * @param {number|null|undefined} value The value to write.
   */
  writeUint32(field, value) {
    if (value == null) return;
    assertThat(field, value, (value >= 0) && (value < TWO_TO_32));
    this.writeUnsignedVarint32_(field, value);
  }


  /**
   * Writes a uint64 field to the buffer. Numbers outside the range [0,2^64)
   * will be truncated.
   * @param {number} field The field number.
   * @param {number|string|!bigint|null|undefined} value The value to write.
   */
  writeUint64(field, value) {
    if (value == null) return;
    assertUnsignedInt64(field, value);
    this.writeUnsignedVarint64_(field, value);
  }

  /**
   * Writes a uint64 field (with value as a string) to the buffer.
   * @param {number} field The field number.
   * @param {string|null|undefined} value The value to write.
   * @deprecated Use writeUint64()
   */
  writeUint64String(field, value) {
    this.writeUint64(field, value);
  }

  /**
   * Writes an sint32 field to the buffer. Numbers outside the range
   * [-2^31,2^31) will be truncated.
   * @param {number} field The field number.
   * @param {number|null|undefined} value The value to write.
   */
  writeSint32(field, value) {
    if (value == null) return;
    assertThat(field, value, (value >= -TWO_TO_31) && (value < TWO_TO_31));
    this.writeZigzagVarint32_(field, value);
  }

  /**
   * Writes an sint64 field to the buffer. Numbers outside the range
   * [-2^63,2^63) will be truncated.
   * @param {number} field The field number.
   * @param {number|string|!bigint|null|undefined} value The value to write.
   */
  writeSint64(field, value) {
    if (value == null) return;
    assertSignedInt64(field, value);
    this.writeZigzagVarint64_(field, value);
  }

  /**
   * Writes an sint64 field to the buffer. Numbers outside the range
   * [-2^63,2^63) will be truncated.
   * @param {number} field The field number.
   * @param {string|null|undefined} value The decimal string to write.
   * @deprecated Use writeSint64();
   */
  writeSint64String(field, value) {
    this.writeSint64(field, value);
  }

  /**
   * Writes a fixed32 field to the buffer. Numbers outside the range [0,2^32)
   * will be truncated.
   * @param {number} field The field number.
   * @param {number|null|undefined} value The value to write.
   */
  writeFixed32(field, value) {
    if (value == null) return;
    assertThat(field, value, (value >= 0) && (value < TWO_TO_32));
    this.writeFieldHeader_(field, WireType.FIXED32);
    this.encoder_.writeUint32(value);
  }

  /**
   * Writes a fixed64 field to the buffer. Numbers outside the range [0,2^64)
   * will be truncated.
   * @param {number} field The field number.
   * @param {number|string|!bigint|null|undefined} value The value to write.
   */
  writeFixed64(field, value) {
    if (value == null) return;
    assertUnsignedInt64(field, value);
    this.writeFieldHeader_(field, WireType.FIXED64);
    switch (typeof value) {
      case 'number':
        this.encoder_.writeUint64(value);
        break;
      case 'bigint': {
        const num = UInt64.fromBigInt(/** @type {bigint} */(value));
        this.encoder_.writeSplitFixed64(num.lo, num.hi);
        break;
      }
      default: {
        const num = UInt64.fromString(/** @type {string} */(value));
        this.encoder_.writeSplitFixed64(num.lo, num.hi);
        break;
      }
    }
  }

  /**
   * Writes a fixed64 field (with value as a string) to the buffer.
   * @param {number} field The field number.
   * @param {string|null|undefined} value The value to write.
   * @deprecated Use writeFixed64().
   */
  writeFixed64String(field, value) {
    this.writeFixed64(field, value);
  }

  /**
   * Writes a sfixed32 field to the buffer. Numbers outside the range
   * [-2^31,2^31) will be truncated.
   * @param {number} field The field number.
   * @param {number|null|undefined} value The value to write.
   */
  writeSfixed32(field, value) {
    if (value == null) return;
    assertThat(field, value, (value >= -TWO_TO_31) && (value < TWO_TO_31));
    this.writeFieldHeader_(field, WireType.FIXED32);
    this.encoder_.writeInt32(value);
  }

  /**
   * Writes a sfixed64 field to the buffer. Numbers outside the range
   * [-2^63,2^63) will be truncated.
   * @param {number} field The field number.
   * @param {number|string|!bigint|null|undefined} value The value to write.
   */
  writeSfixed64(field, value) {
    if (value == null) return;
    assertSignedInt64(field, value);
    this.writeFieldHeader_(field, WireType.FIXED64);
    switch (typeof value) {
      case 'number':
        this.encoder_.writeInt64(value);
        break;
      case 'bigint':
        const int64Big = Int64.fromBigInt(/** @type {bigint} */(value));
        this.encoder_.writeSplitFixed64(int64Big.lo, int64Big.hi);
        break;
      default:
        const int64Str = Int64.fromString(/** @type {string} */(value));
        this.encoder_.writeSplitFixed64(int64Str.lo, int64Str.hi);
        break;
    }
  }

  /**
   * Writes a sfixed64 string field to the buffer. Numbers outside the range
   * [-2^63,2^63) will be truncated.
   * @param {number} field The field number.
   * @param {string|null|undefined} value The value to write.
   * @deprecated Use writeSfixed64().
   */
  writeSfixed64String(field, value) {
    this.writeSfixed64(field, value);
  }

  /**
   * Writes a single-precision floating point field to the buffer. Numbers
   * requiring more than 32 bits of precision will be truncated.
   * @param {number} field The field number.
   * @param {number?|string|null|undefined} value The value to write, accepts
   *     'Infinity'/'-Infinity'/'NaN' for JSPB wire format compatibility.
   */
  writeFloat(field, value) {
    if (value == null) return;
    this.writeFieldHeader_(field, WireType.FIXED32);
    this.encoder_.writeFloat(value);
  }

  /**
   * Writes a double-precision floating point field to the buffer. As this is
   * the native format used by JavaScript, no precision will be lost.
   * @param {number} field The field number.
   * @param {number?|string|null|undefined} value The value to write, accepts
   *     'Infinity'/'-Infinity'/'NaN' for JSPB wire format compatibility.
   */
  writeDouble(field, value) {
    if (value == null) return;
    this.writeFieldHeader_(field, WireType.FIXED64);
    this.encoder_.writeDouble(value);
  }

  /**
   * Writes a boolean field to the buffer. We allow numbers as input
   * because the JSPB code generator uses 0/1 instead of true/false to save
   * space in the string representation of the proto.
   * @param {number} field The field number.
   * @param {boolean?|number|null|undefined} value The value to write.
   */
  writeBool(field, value) {
    if (value == null) return;
    assertThat(
      field, value, typeof value === 'boolean' || typeof value === 'number');
    this.writeFieldHeader_(field, WireType.VARINT);
    this.encoder_.writeBool(value);
  }

  /**
   * Writes an enum field to the buffer.
   * @param {number} field The field number.
   * @param {number|null|undefined} value The value to write.
   */
  writeEnum(field, value) {
    if (value == null) return;
    // Converting since value might be object typed integer here.
    const intValue = /** number */ parseInt(value, 10);
    assertSignedInteger(field, intValue);
    this.writeFieldHeader_(field, WireType.VARINT);
    this.encoder_.writeSignedVarint32(intValue);
  }

  /**
   * Writes a string field to the buffer.
   * @param {number} field The field number.
   * @param {string|null|undefined} value The string to write.
   */
  writeString(field, value) {
    if (value == null) return;
    this.writeUint8Array(
      field,
      encodeUtf8(
        value, /** rejectUnpairedSurrogates=*/ REJECT_UNPAIRED_SURROGATES));
  }

  /**
   * Writes an arbitrary byte field to the buffer. Note - to match the behavior
   * of the C++ implementation, empty byte arrays _are_ serialized.
   * @param {number} field The field number.
   * @param {?ByteSource|?ByteString|undefined} value The array of bytes to
   *     write.
   */
  writeBytes(field, value) {
    if (value == null) return;
    this.writeUint8Array(
      field,
      bufferFromSource(value, /* treatNewDataAsImmutable= */ true).buffer);
  }

  /**
   * @param {number} field The field number.
   * @param {!Uint8Array} value The array of bytes to write.
   * @private
   */
  writeUint8Array(field, value) {
    this.writeFieldHeader_(field, WireType.DELIMITED);
    this.encoder_.writeUnsignedVarint32(value.length);
    this.appendUint8Array_(value);
  }

  /**
   * Writes a message to the buffer.
   * @param {number} field The field number.
   * @param {?MessageType|undefined} value The message to write.
   * @param {function(MessageTypeNonNull, !BinaryWriter)} writerCallback
   *     Will be invoked with the value to write and the writer to write it
   * with.
   * @template MessageType
   * Use go/closure-ttl to declare a non-nullable version of MessageType.
   * Replace the null in blah|null with none.  This is necessary because the
   * compiler will infer MessageType to be nullable if the value parameter is
   * nullable.
   * @template MessageTypeNonNull :=
   *     cond(isUnknown(MessageType), unknown(),
   *       mapunion(MessageType, (X) =>
   *         cond(eq(X, 'undefined'), none(), cond(eq(X, 'null'), none(), X))))
   * =:
   */
  writeMessage(field, value, writerCallback) {
    if (value == null) return;
    const bookmark = this.beginDelimited_(field);
    writerCallback(value, this);
    this.endDelimited_(bookmark);
  }

  /**
   * Writes a message set extension to the buffer.
   * @param {number} field The field number for the extension.
   * @param {?MessageType|undefined} value The extension message object to
   *     write. Note that message set can only have extensions with type of
   *     optional message.
   * @param {function(!MessageTypeNonNull, !BinaryWriter)} writerCallback
   *     Will be invoked with the value to write and the writer to write it
   * with.
   * @template MessageType
   * Use go/closure-ttl to declare a non-nullable version of MessageType.
   * Replace the null in blah|null with none.  This is necessary because the
   * compiler will infer MessageType to be nullable if the value parameter is
   * nullable.
   * @template MessageTypeNonNull :=
   *     cond(isUnknown(MessageType), unknown(),
   *       mapunion(MessageType, (X) =>
   *         cond(eq(X, 'undefined'), none(), cond(eq(X, 'null'), none(), X))))
   * =:
   */
  writeMessageSet(field, value, writerCallback) {
    if (value == null) return;
    // The wire format for a message set is defined by
    // google3/net/proto/message_set.proto
    this.writeFieldHeader_(1, WireType.START_GROUP);
    this.writeFieldHeader_(2, WireType.VARINT);
    this.encoder_.writeSignedVarint32(field);
    const bookmark = this.beginDelimited_(3);
    writerCallback(value, this);
    this.endDelimited_(bookmark);
    this.writeFieldHeader_(1, WireType.END_GROUP);
  }

  /**
   * Writes a group message to the buffer.
   *
   * @param {number} field The field number.
   * @param {?MessageType|undefined} value The message to write, wrapped with
   *     START_GROUP / END_GROUP tags. Will be a no-op if 'value' is null.
   * @param {function(MessageTypeNonNull, !BinaryWriter)} writerCallback
   *     Will be invoked with the value to write and the writer to write it
   * with.
   * @template MessageType
   * Use go/closure-ttl to declare a non-nullable version of MessageType.
   * Replace the null in blah|null with none.  This is necessary because the
   * compiler will infer MessageType to be nullable if the value parameter is
   * nullable.
   * @template MessageTypeNonNull :=
   *     cond(isUnknown(MessageType), unknown(),
   *       mapunion(MessageType, (X) =>
   *         cond(eq(X, 'undefined'), none(), cond(eq(X, 'null'), none(), X))))
   * =:
   */
  writeGroup(field, value, writerCallback) {
    if (value == null) return;
    this.writeFieldHeader_(field, WireType.START_GROUP);
    writerCallback(value, this);
    this.writeFieldHeader_(field, WireType.END_GROUP);
  }

  /**
   * Writes a 64-bit field to the buffer as a fixed64.
   * @param {number} field The field number.
   * @param {number} lowBits The low 32 bits.
   * @param {number} highBits The high 32 bits.
   */
  writeSplitFixed64(field, lowBits, highBits) {
    this.writeFieldHeader_(field, WireType.FIXED64);
    this.encoder_.writeSplitFixed64(lowBits, highBits);
  }

  /**
   * Writes a 64-bit field to the buffer as a varint.
   * @param {number} field The field number.
   * @param {number} lowBits The low 32 bits.
   * @param {number} highBits The high 32 bits.
   */
  writeSplitVarint64(field, lowBits, highBits) {
    this.writeFieldHeader_(field, WireType.VARINT);
    this.encoder_.writeSplitVarint64(lowBits, highBits);
  }

  /**
   * Writes a 64-bit field to the buffer as a zigzag encoded varint.
   * @param {number} field The field number.
   * @param {number} lowBits The low 32 bits.
   * @param {number} highBits The high 32 bits.
   */
  writeSplitZigzagVarint64(field, lowBits, highBits) {
    this.writeFieldHeader_(field, WireType.VARINT);
    this.encoder_.writeSplitZigzagVarint64(lowBits >>> 0, highBits >>> 0);
  }

  /**
   * Writes an array of numbers to the buffer as a repeated 32-bit int field.
   * @param {number} field The field number.
   * @param {?Array<number>|undefined} value The array of ints to write.
   */
  writeRepeatedInt32(field, value) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeSignedVarint32_(field, value[i]);
    }
  }


  /**
   * Writes an array of numbers to the buffer as a repeated 64-bit int field.
   * @param {number} field The field number.
   * @param {?Array<number|string|!bigint>|undefined} value The array of ints
   *     to write.
   */
  writeRepeatedInt64(field, value) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeSignedVarint64_(field, value[i]);
    }
  }

  /**
   * Writes an array of 64-bit values to the buffer as a fixed64.
   * @param {number} field The field number.
   * @param {?Array<T>|undefined} value The value.
   * @param {function(T): number} lo Function to get low bits.
   * @param {function(T): number} hi Function to get high bits.
   * @template T
   */
  writeRepeatedSplitFixed64(field, value, lo, hi) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeSplitFixed64(field, lo(value[i]), hi(value[i]));
    }
  }

  /**
   * Writes an array of 64-bit values to the buffer as a varint.
   * @param {number} field The field number.
   * @param {?Array<T>|undefined} value The value.
   * @param {function(T): number} lo Function to get low bits.
   * @param {function(T): number} hi Function to get high bits.
   * @template T
   */
  writeRepeatedSplitVarint64(field, value, lo, hi) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeSplitVarint64(field, lo(value[i]), hi(value[i]));
    }
  }

  /**
   * Writes an array of 64-bit values to the buffer as a zigzag varint.
   * @param {number} field The field number.
   * @param {?Array<T>|undefined} value The value.
   * @param {function(T): number} lo Function to get low bits.
   * @param {function(T): number} hi Function to get high bits.
   * @template T
   */
  writeRepeatedSplitZigzagVarint64(field, value, lo, hi) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeSplitZigzagVarint64(field, lo(value[i]), hi(value[i]));
    }
  }

  /**
   * Writes an array of numbers formatted as strings to the buffer as a repeated
   * 64-bit int field.
   * @param {number} field The field number.
   * @param {?Array<string>|undefined} value The array of ints to write.
   * @deprecated use writeRepeatedInt64().
   */
  writeRepeatedInt64String(field, value) {
    this.writeRepeatedInt64(field, value);
  }

  /**
   * Writes an array numbers to the buffer as a repeated unsigned 32-bit int
   *     field.
   * @param {number} field The field number.
   * @param {?Array<number>|undefined} value The array of ints to write.
   */
  writeRepeatedUint32(field, value) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeUnsignedVarint32_(field, value[i]);
    }
  }

  /**
   * Writes an array numbers or decimal strings to the buffer as a repeated
   * unsigned 64-bit int field.
   * @param {number} field The field number.
   * @param {?Array<number|string|!bigint>|undefined} value The array of ints
   *     to write.
   */
  writeRepeatedUint64(field, value) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeUnsignedVarint64_(field, value[i]);
    }
  }

  /**
   * Writes an array of numbers formatted as strings to the buffer as a repeated
   * unsigned 64-bit int field.
   * @param {number} field The field number.
   * @param {?Array<string>|undefined} value The array of ints to write.
   * @deprecated Use writeRepeatedUint64().
   */
  writeRepeatedUint64String(field, value) {
    this.writeRepeatedUint64(field, value);
  }

  /**
   * Writes an array numbers to the buffer as a repeated signed 32-bit int
   * field.
   * @param {number} field The field number.
   * @param {?Array<number>|undefined} value The array of ints to write.
   */
  writeRepeatedSint32(field, value) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeZigzagVarint32_(field, value[i]);
    }
  }

  /**
   * Writes an array numbers or decimal strings to the buffer as a repeated
   * signed 64-bit int field.
   * @param {number} field The field number.
   * @param {?Array<number|string|!bigint>|undefined} value The array of ints
   *     to write.
   */
  writeRepeatedSint64(field, value) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeZigzagVarint64_(field, value[i]);
    }
  }

  /**
   * Writes an array numbers to the buffer as a repeated signed 64-bit int
   * field.
   * @param {number} field The field number.
   * @param {?Array<string>|undefined} value The array of ints to write.
   * @deprecated Use writeRepeatedSint64().
   */
  writeRepeatedSint64String(field, value) {
    this.writeRepeatedSint64(field, value);
  }

  /**
   * Writes an array of numbers to the buffer as a repeated fixed32 field. This
   * works for both signed and unsigned fixed32s.
   * @param {number} field The field number.
   * @param {?Array<number>|undefined} value The array of ints to write.
   */
  writeRepeatedFixed32(field, value) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeFixed32(field, value[i]);
    }
  }

  /**
   * Writes an array of numbers or decimal strings to the buffer as a repeated
   * fixed64 field. This works for both signed and unsigned fixed64s.
   * @param {number} field The field number.
   * @param {?Array<number|string|!bigint>|undefined} value The array of ints
   *     to write.
   */
  writeRepeatedFixed64(field, value) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeFixed64(field, value[i]);
    }
  }

  /**
   * Writes an array of numbers to the buffer as a repeated fixed64 field. This
   * works for both signed and unsigned fixed64s.
   * @param {number} field The field number.
   * @param {?Array<string>|undefined} value The array of decimal strings to
   *     write.
   * @deprecated Use writeRepeatedFixed64().
   */
  writeRepeatedFixed64String(field, value) {
    this.writeRepeatedFixed64(field, value);
  }

  /**
   * Writes an array of numbers to the buffer as a repeated sfixed32 field.
   * @param {number} field The field number.
   * @param {?Array<number>|undefined} value The array of ints to write.
   */
  writeRepeatedSfixed32(field, value) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeSfixed32(field, value[i]);
    }
  }

  /**
   * Writes an array of numbers or decimal strings to the buffer as a repeated
   * sfixed64 field.
   * @param {number} field The field number.
   * @param {?Array<number|string>|undefined} value The array of ints to write.
   */
  writeRepeatedSfixed64(field, value) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeSfixed64(field, value[i]);
    }
  }

  /**
   * Writes an array of decimal strings to the buffer as a repeated sfixed64
   * field.
   * @param {number} field The field number.
   * @param {?Array<string>|undefined} value The array of decimal strings to
   *     write.
   * @deprecated Use writeRepeatedSfixed64().
   */
  writeRepeatedSfixed64String(field, value) {
    this.writeRepeatedSfixed64(field, value);
  }

  /**
   * Writes an array of numbers to the buffer as a repeated float field.
   * @param {number} field The field number.
   * @param {?Array<number|string>|undefined} value The array of floats to
   *     write, accepts 'Infinity'/'-Infinity'/'NaN' for JSPB wire format
   *     compatibility.
   */
  writeRepeatedFloat(field, value) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeFloat(field, value[i]);
    }
  }

  /**
   * Writes an array of numbers to the buffer as a repeated double field.
   * @param {number} field The field number.
   * @param {?Array<number|string>|undefined} value The array of doubles to
   *     write, accepts 'Infinity'/'-Infinity'/'NaN' for JSPB wire format
   *     compatibility.
   */
  writeRepeatedDouble(field, value) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeDouble(field, value[i]);
    }
  }

  /**
   * Writes an array of booleans to the buffer as a repeated bool field.
   * @param {number} field The field number.
   * @param {?Array<boolean|number>|undefined} value The array of booleans to
   *     write.
   */
  writeRepeatedBool(field, value) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeBool(field, value[i]);
    }
  }

  /**
   * Writes an array of enums to the buffer as a repeated enum field.
   * @param {number} field The field number.
   * @param {?Array<number>|undefined} value The array of ints to write.
   */
  writeRepeatedEnum(field, value) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeEnum(field, value[i]);
    }
  }

  /**
   * Writes an array of strings to the buffer as a repeated string field.
   * @param {number} field The field number.
   * @param {?Array<string>|undefined} value The array of strings to write.
   */
  writeRepeatedString(field, value) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeString(field, value[i]);
    }
  }

  /**
   * Writes an array of arbitrary byte fields to the buffer.
   * @param {number} field The field number.
   * @param {?Array<!ByteSource|!ByteString>|undefined} value The arrays of
   *     arrays of bytes to write.
   */
  writeRepeatedBytes(field, value) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeBytes(field, value[i]);
    }
  }

  /**
   * Writes an array of messages to the buffer.
   * @template MessageType
   * @param {number} field The field number.
   * @param {?Array<MessageType>|undefined} value The array of messages to
   *    write.
   * @param {function(MessageType, !BinaryWriter)} writerCallback
   *     Will be invoked with the value to write and the writer to write it
   * with.
   */
  writeRepeatedMessage(field, value, writerCallback) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      const bookmark = this.beginDelimited_(field);
      writerCallback(value[i], this);
      this.endDelimited_(bookmark);
    }
  }

  /**
   * Writes an array of group messages to the buffer.
   * @template MessageType
   * @param {number} field The field number.
   * @param {?Array<MessageType>|undefined} value The array of messages to
   *    write.
   * @param {function(MessageType, !BinaryWriter)} writerCallback
   *     Will be invoked with the value to write and the writer to write it
   * with.
   */
  writeRepeatedGroup(field, value, writerCallback) {
    if (value == null) return;
    for (let i = 0; i < value.length; i++) {
      this.writeFieldHeader_(field, WireType.START_GROUP);
      writerCallback(value[i], this);
      this.writeFieldHeader_(field, WireType.END_GROUP);
    }
  }

  /**
   * Writes an array of numbers to the buffer as a packed 32-bit int field.
   * @param {number} field The field number.
   * @param {?Array<number>|undefined} value The array of ints to write.
   */
  writePackedInt32(field, value) {
    if (value == null || !value.length) return;
    const bookmark = this.beginDelimited_(field);
    for (let i = 0; i < value.length; i++) {
      assertSignedInteger(field, value[i]);
      this.encoder_.writeSignedVarint32(value[i]);
    }
    this.endDelimited_(bookmark);
  }

  /**
   * Writes an array of numbers represented as strings to the buffer as a packed
   * 32-bit int field.
   * @param {number} field
   * @param {?Array<string>|undefined} value
   */
  writePackedInt32String(field, value) {
    if (value == null || !value.length) return;
    const bookmark = this.beginDelimited_(field);
    for (let i = 0; i < value.length; i++) {
      const intValue = parseInt(value[i], 10);
      assertSignedInteger(field, intValue);
      this.encoder_.writeSignedVarint32(intValue);
    }
    this.endDelimited_(bookmark);
  }

  /**
   * Writes an array of numbers or decimal strings to the buffer as a packed
   * 64-bit int field.
   * @param {number} field The field number.
   * @param {?Array<number|string|!bigint>|undefined} value The array of ints
   *     to write.
   */
  writePackedInt64(field, value) {
    if (value == null || !value.length) return;
    const bookmark = this.beginDelimited_(field);
    for (let i = 0; i < value.length; i++) {
      const v = value[i];
      switch (typeof v) {
        case 'number':
          this.encoder_.writeSignedVarint64(v);
          break;

        case 'bigint': {
          const num = Int64.fromBigInt(/** @type {bigint} */(v));
          this.encoder_.writeSplitVarint64(num.lo, num.hi);
          break;
        }

        default: {
          const num = Int64.fromString(/** @type {string} */(v));
          this.encoder_.writeSplitVarint64(num.lo, num.hi);
          break;
        }
      }
    }
    this.endDelimited_(bookmark);
  }

  /**
   * Writes an array of 64-bit values to the buffer as a fixed64.
   * @param {number} field The field number.
   * @param {?Array<T>|undefined} value The value.
   * @param {function(T): number} lo Function to get low bits.
   * @param {function(T): number} hi Function to get high bits.
   * @template T
   */
  writePackedSplitFixed64(field, value, lo, hi) {
    if (value == null) return;
    const bookmark = this.beginDelimited_(field);
    for (let i = 0; i < value.length; i++) {
      this.encoder_.writeSplitFixed64(lo(value[i]), hi(value[i]));
    }
    this.endDelimited_(bookmark);
  }

  /**
   * Writes an array of 64-bit values to the buffer as a varint.
   * @param {number} field The field number.
   * @param {?Array<T>|undefined} value The value.
   * @param {function(T): number} lo Function to get low bits.
   * @param {function(T): number} hi Function to get high bits.
   * @template T
   */
  writePackedSplitVarint64(field, value, lo, hi) {
    if (value == null) return;
    const bookmark = this.beginDelimited_(field);
    for (let i = 0; i < value.length; i++) {
      this.encoder_.writeSplitVarint64(lo(value[i]), hi(value[i]));
    }
    this.endDelimited_(bookmark);
  }

  /**
   * Writes an array of 64-bit values to the buffer as a zigzag varint.
   * @param {number} field The field number.
   * @param {?Array<T>|undefined} value The value.
   * @param {function(T): number} lo Function to get low bits.
   * @param {function(T): number} hi Function to get high bits.
   * @template T
   */
  writePackedSplitZigzagVarint64(field, value, lo, hi) {
    if (value == null) return;
    const bookmark = this.beginDelimited_(field);
    const encoder = this.encoder_;
    for (let i = 0; i < value.length; i++) {
      encoder.writeSplitZigzagVarint64(lo(value[i]), hi(value[i]));
    }
    this.endDelimited_(bookmark);
  }

  /**
   * Writes an array of numbers represented as strings to the buffer as a packed
   * 64-bit int field.
   * @param {number} field
   * @param {?Array<string>|undefined} value
   * @deprecated Use writePackedInt64().
   */
  writePackedInt64String(field, value) {
    this.writePackedInt64(field, value);
  }

  /**
   * Writes an array numbers to the buffer as a packed unsigned 32-bit int
   * field.
   * @param {number} field The field number.
   * @param {?Array<number>|undefined} value The array of ints to write.
   */
  writePackedUint32(field, value) {
    if (value == null || !value.length) return;
    const bookmark = this.beginDelimited_(field);
    for (let i = 0; i < value.length; i++) {
      this.encoder_.writeUnsignedVarint32(value[i]);
    }
    this.endDelimited_(bookmark);
  }

  /**
   * Writes an array numbers or decimal strings to the buffer as a packed
   * unsigned 64-bit int field.
   * @param {number} field The field number.
   * @param {?Array<number|string|!bigint>|undefined} value The array of ints
   *     to write.
   */
  writePackedUint64(field, value) {
    if (value == null || !value.length) return;
    const bookmark = this.beginDelimited_(field);
    for (let i = 0; i < value.length; i++) {
      const v = value[i];
      switch (typeof v) {
        case 'number':
          this.encoder_.writeUnsignedVarint64(v);
          break;

        case 'bigint':
          const n = Number(v);
          if (Number.isSafeInteger(n)) {
            this.encoder_.writeUnsignedVarint64(n);
          } else {
            const num = UInt64.fromBigInt(/** @type {bigint} */(v));
            this.encoder_.writeSplitVarint64(num.lo, num.hi);
          }
          break;

        default:
          const num = UInt64.fromString(/** @type {string} */(v));
          this.encoder_.writeSplitVarint64(num.lo, num.hi);
          break;
      }
    }
    this.endDelimited_(bookmark);
  }

  /**
   * Writes an array of numbers represented as strings to the buffer as a packed
   * unsigned 64-bit int field.
   * @param {number} field
   * @param {?Array<string>|undefined} value
   * @deprecated Use writePackedUint64()
   */
  writePackedUint64String(field, value) {
    this.writePackedUint64(field, value);
  }

  /**
   * Writes an array numbers to the buffer as a packed signed 32-bit int field.
   * @param {number} field The field number.
   * @param {?Array<number>|undefined} value The array of ints to write.
   */
  writePackedSint32(field, value) {
    if (value == null || !value.length) return;
    const bookmark = this.beginDelimited_(field);
    for (let i = 0; i < value.length; i++) {
      this.encoder_.writeZigzagVarint32(value[i]);
    }
    this.endDelimited_(bookmark);
  }

  /**
   * Writes an array of numbers or decimal strings to the buffer as a packed
   * signed 64-bit int field.
   * @param {number} field The field number.
   * @param {?Array<number|string|!bigint>|undefined} value The array of ints
   *     to write.
   */
  writePackedSint64(field, value) {
    if (value == null || !value.length) return;
    const bookmark = this.beginDelimited_(field);
    for (let i = 0; i < value.length; i++) {
      const v = value[i];
      switch (typeof v) {
        case 'number':
          this.encoder_.writeZigzagVarint64(v);
          break;

        default:
          this.encoder_.writeZigzagVarint64String(/** @type {string} */(v));
          break;
      }
    }
    this.endDelimited_(bookmark);
  }

  /**
   * Writes an array of decimal strings to the buffer as a packed signed 64-bit
   * int field.
   * @param {number} field The field number.
   * @param {?Array<string>|undefined} value The array of decimal strings to
   *     write.
   * @deprecated Use writePackedSint64().
   */
  writePackedSint64String(field, value) {
    this.writePackedSint64(field, value);
  }

  /**
   * Writes an array of numbers to the buffer as a packed fixed32 field.
   * @param {number} field The field number.
   * @param {?Array<number>|undefined} value The array of ints to write.
   */
  writePackedFixed32(field, value) {
    if (value == null || !value.length) return;
    this.writeFieldHeader_(field, WireType.DELIMITED);
    this.encoder_.writeUnsignedVarint32(value.length * 4);
    for (let i = 0; i < value.length; i++) {
      this.encoder_.writeUint32(value[i]);
    }
  }

  /**
   * Writes an array of numbers or decimal strings to the buffer as a packed
   * fixed64 field.
   * @param {number} field The field number.
   * @param {?Array<number|string|!bigint>|undefined} value The array of ints
   *     to write.
   */
  writePackedFixed64(field, value) {
    if (value == null || !value.length) return;
    this.writeFieldHeader_(field, WireType.DELIMITED);
    this.encoder_.writeUnsignedVarint32(value.length * 8);
    for (let i = 0; i < value.length; i++) {
      const v = value[i];
      switch (typeof v) {
        case 'number':
          this.encoder_.writeUint64(/** @type {number} */(v));
          break;

        case 'bigint':
          const fromBigint = UInt64.fromBigInt(/** @type {bigint} */(v));
          this.encoder_.writeSplitFixed64(fromBigint.lo, fromBigint.hi);
          break;


        default:
          const fromString = UInt64.fromString(/** @type {string} */(v));
          this.encoder_.writeSplitFixed64(fromString.lo, fromString.hi);
          break;
      }
    }
  }

  /**
   * Writes an array of numbers represented as strings to the buffer as a packed
   * fixed64 field.
   * @param {number} field The field number.
   * @param {?Array<string>|undefined} value The array of strings to write.
   * @deprecated Use writePackedFixed64().
   */
  writePackedFixed64String(field, value) {
    this.writePackedFixed64(field, value);
  }

  /**
   * Writes an array of numbers to the buffer as a packed sfixed32 field.
   * @param {number} field The field number.
   * @param {?Array<number>|undefined} value The array of ints to write.
   */
  writePackedSfixed32(field, value) {
    if (value == null || !value.length) return;
    this.writeFieldHeader_(field, WireType.DELIMITED);
    this.encoder_.writeUnsignedVarint32(value.length * 4);
    for (let i = 0; i < value.length; i++) {
      this.encoder_.writeInt32(value[i]);
    }
  }

  /**
   * Writes an array of numbers or decimal strings to the buffer as a packed
   * sfixed64 field.
   * @param {number} field The field number.
   * @param {?Array<number|string|!bigint>|undefined} value The array of ints
   *     to write.
   */
  writePackedSfixed64(field, value) {
    if (value == null || !value.length) return;
    this.writeFieldHeader_(field, WireType.DELIMITED);
    this.encoder_.writeUnsignedVarint32(value.length * 8);
    for (let i = 0; i < value.length; i++) {
      const v = value[i];
      switch (typeof v) {
        case 'number':
          this.encoder_.writeInt64(v);
          break;

        case 'bigint': {
          const num = Int64.fromBigInt(/** @type {bigint} */(v));
          this.encoder_.writeSplitFixed64(num.lo, num.hi);
          break;
        }

        default: {
          const num = Int64.fromString(/** @type {string} */(v));
          this.encoder_.writeSplitFixed64(num.lo, num.hi);
          break;
        }
      }
    }
  }

  /**
   * Writes an array of numbers or decimal strings to the buffer as a packed
   * sfixed64 field.
   * @param {number} field The field number.
   * @param {?Array<number|string>|undefined} value The array of ints to write.
   * @deprecated Use writePackedSfixed64()
   */
  writePackedSfixed64String(field, value) {
    this.writePackedSfixed64(field, value);
  }

  /**
   * Writes an array of numbers to the buffer as a packed float field.
   * @param {number} field The field number.
   * @param {?Array<number|string>|undefined} value The array of floats to
   *     write, accepts 'Infinity'/'-Infinity'/'NaN' for JSPB wire format
   *     compatibility.
   */
  writePackedFloat(field, value) {
    if (value == null || !value.length) return;
    this.writeFieldHeader_(field, WireType.DELIMITED);
    this.encoder_.writeUnsignedVarint32(value.length * 4);
    for (let i = 0; i < value.length; i++) {
      this.encoder_.writeFloat(value[i]);
    }
  }

  /**
   * Writes an array of numbers to the buffer as a packed double field.
   * @param {number} field The field number.
   * @param {?Array<number|string>|undefined} value The array of doulbe to
   *     write, accepts 'Infinity'/'-Infinity'/'NaN' for JSPB wire format
   *     compatibility.
   */
  writePackedDouble(field, value) {
    if (value == null || !value.length) return;
    this.writeFieldHeader_(field, WireType.DELIMITED);
    this.encoder_.writeUnsignedVarint32(value.length * 8);
    for (let i = 0; i < value.length; i++) {
      this.encoder_.writeDouble(value[i]);
    }
  }

  /**
   * Writes an array of booleans to the buffer as a packed bool field.
   * @param {number} field The field number.
   * @param {?Array<boolean|number>|undefined} value The array of booleans to
   *     write.
   */
  writePackedBool(field, value) {
    if (value == null || !value.length) return;
    this.writeFieldHeader_(field, WireType.DELIMITED);
    this.encoder_.writeUnsignedVarint32(value.length);
    for (let i = 0; i < value.length; i++) {
      this.encoder_.writeBool(value[i]);
    }
  }

  /**
   * Writes an array of enums to the buffer as a packed enum field.
   * @param {number} field The field number.
   * @param {?Array<number>|undefined} value The array of ints to write.
   */
  writePackedEnum(field, value) {
    if (value == null || !value.length) return;
    const bookmark = this.beginDelimited_(field);
    for (let i = 0; i < value.length; i++) {
      this.encoder_.writeEnum(value[i]);
    }
    this.endDelimited_(bookmark);
  }
}

/**
 * Asserts that the value is signed 32-bit integer.
 * @param {number} field
 * @param {?} value
 */
function assertSignedInteger(field, value) {
  assertThat(field, value, value === Math.floor(value));
  assertThat(field, value, value >= -TWO_TO_31 && value < TWO_TO_31);
}

/**
 * Asserts that the value is an unsigned 64-bit integer.
 * NOTE: does not yet validate the range of decimal strings, such a change
 * would need to be tested before becoming more strict.
 * @param {number} field
 * @param {*} value
 */
function assertSignedInt64(field, value) {
  const typeofValue = typeof value;
  switch (typeofValue) {
    case 'string': {
      const valueStr = /** @type {string} */ (value);
      assertThat(field, valueStr, Int64.fromString(valueStr));
      break;
    }

    case 'number': {
      const valueNum = /** @type {number} */ (value);
      assertThat(
        field, valueNum, valueNum >= -TWO_TO_63 && valueNum < TWO_TO_63);
      break;
    }

    default: {
      const valueBig = /** @type {bigint} */ (value);
      assertThat(
        field, valueBig,
        valueBig >= BigInt(-TWO_TO_63) && valueBig < BigInt(TWO_TO_63));
      break;
    }
  }
}

/**
 * Asserts that the value is signed 64-bit integer.
 * NOTE: does not yet validate the range of decimal strings, such a change
 * would need to be tested before becoming more strict.
 * @param {number} field
 * @param {*} value
 */
function assertUnsignedInt64(field, value) {
  const typeofValue = typeof value;
  switch (typeofValue) {
    case 'string': {
      const valueStr = /** @type {string} */ (value);
      assertThat(field, valueStr, UInt64.fromString(valueStr));
      break;
    }

    case 'number': {
      const valueNum = /** @type {number} */ (value);
      assertThat(field, valueNum, valueNum >= 0 && valueNum < TWO_TO_64);
      break;
    }

    default: {
      const valueBig = /** @type {bigint} */ (value);
      assertThat(
        field, valueBig,
        valueBig >= BigInt(0) && valueBig < BigInt(TWO_TO_64));
      break;
    }
  }
}

/**
 * Asserts the condition.
 * @param {number} field
 * @param {?} value
 * @param {?} condition
 */
function assertThat(field, value, condition) {
  // Manual assertion here instead of asserts.assert(...) call for perf
  // reasons, to avoid unnecessary string concatenations.
  if (!condition) {
    fail(`for [${value}] at [${field}]`);
  }
}


exports = { BinaryWriter };
