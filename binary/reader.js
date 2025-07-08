/**
 * @fileoverview This file contains utilities for converting binary,
 * wire-format protocol buffers into Javascript data structures.
 *
 * jspb's BinaryReader class wraps the BinaryDecoder class to add methods
 * that understand the protocol buffer syntax and can do the type checking and
 * bookkeeping necessary to parse trees of nested messages.
 *
 * Major caveat - Users of this library _must_ keep their Javascript proto
 * parsing code in sync with the original .proto file - presumably you'll be
 * using the typed jspb code generator, but if you bypass that you'll need
 * to keep things in sync by hand.
 *
 * @author aappleby@google.com (Austin Appleby)
 */

goog.module('jspb.binary.reader');
goog.module.declareLegacyNamespace();

const BinaryConstants = goog.require('jspb.BinaryConstants');
const asserts = goog.require('goog.asserts');
const errors = goog.require('jspb.binary.errors');
const utils = goog.require('jspb.utils');
const { BinaryDecoder } = goog.require('jspb.binary.decoder');
const { ByteSource } = goog.require('jspb.binary.bytesource');
const { ByteString } = goog.requireType('jspb.bytestring');

/**
 * Whether to enforce that string fields are valid utf8.
 *
 * <p>Currently set to `ALWAYS`, can be set to `DEPRECATED_PROTO3_ONLY` to only
 * enforce utf8 for proto3 string fields, for proto2 string fields it will use
 * replacement characters when encoding errors are found.
 *
 * <p>TODO: Remove the flag, simplify BinaryReader to remove
 * readStringRequireUtf8 and related support in the code generator et. al.
 *
 * @define {string}
 */
const ENFORCE_UTF8 = goog.define('jspb.binary.ENFORCE_UTF8', 'ALWAYS');

// Constrain the set of values to only these two.
asserts.assert(
  ENFORCE_UTF8 === 'DEPRECATED_PROTO3_ONLY' || ENFORCE_UTF8 === 'ALWAYS');

const /** boolean */ UTF8_PARSING_ERRORS_ARE_FATAL = ENFORCE_UTF8 === 'ALWAYS';

/**
 * Describes options for BinaryReaders.
 *
 * @record
 */
class BinaryReaderOptions {
  constructor() {
    /**
     * Whether to ignore unknown fields found when parsing.
     *
     * Normally, if unknown tag numbers are encountered when parsing a message,
     * the tag and value are stored in the message instance and then written
     * back out when the message is serialized.  This allows applications to
     * preserve data in messages that have new field definitions which they
     * don't yet know about.  However, this behavior can have performance
     * implications.  This property disables this behavior during parsing.
     *
     * @type {boolean|undefined}
     */
    this.discardUnknownFields;

    /**
     * When set to `true` bytes fields will be views into the original buffer
     * instead of being copies.
     *
     * This allows teams to reduce copies at the cost of pinning the original
     * `ByteSource` in memory.
     *
     * How this works ultimate depends on how `bytes` fields are parsed.
     *
     * If `bytes` fields are read as `Uint8Array` via the `readBytes` method (as
     * is done by jsproto and immutablejs): `readBytes` will return views onto
     * the original buffer as `Uint8Array` objects. Additionally, because
     * Uint8Array objects are mutable this may allow unexpected mutations of the
     * `ByteSource` or for mutations of the bytesource to affect later read
     * operations. If the source is a ByteString, this option is ignored in
     * order to preserve the immutability semantics of ByteStrings.
     *
     * If the `bytes` are read as `ByteString` via the `readByteString` method,
     * then this option is only effective if the
     * source is also a `ByteString`, otherwise copies need to be made to
     * preserve the immutability of the produced `ByteString` objects.
     *
     * The default is `false`
     * @type {boolean|undefined}
     */
    this.aliasBytesFields;

    /**
     * Whether we should treat newly deserialized data as being immutable.
     *
     * With this option, we treat newly deserialized data (e.g. from a
     * base64-encoded string) as being immutable, so that it can be safely
     * aliased in a ByteString. If you set this option, you then cannot alias
     * into a Uint8Array, as its underlying ArrayBuffer could be unwrapped.
     *
     * @type {boolean|undefined}
     */
    this.treatNewDataAsImmutable;
  }
}

/*
 * Handling Errors
 *
 * There are two classes of errors that should be considered below.
 *
 * Simple consistency checks: use `goog.asserts`
 *
 * These are cases related to function invariants.  For example, in order to
 * call `readString` the current field must have WireType.DELIMITED. Since we
 * also control all the callsites it is reasonable to rely on our own tests to
 * catch mistakes.
 *
 * Data based conditions: use `jspb.binary.invalid_encoding_errors`
 *
 * These are conditions where the _data_ is wrong in some way. For example, a
 * varint is overlong, a delimited field overflows/underflows.  These cases
 * cannot be eliminated by better testing since they depend on the structure of
 * data supplied to the parsing routines, so `goog.asserts` are not a good
 * approach
 */

/**
 * BinaryReader implements the decoders for all the wire types specified in
 * https://developers.google.com/protocol-buffers/docs/encoding.
 *
 * @struct
 * @final
 */
class BinaryReader {
  /**
   * @param {?ByteSource|!ByteString=} bytes The bytes we're reading from.
   * @param {number=} start The optional offset to start reading at.
   * @param {number=} length The optional length of the block to read -
   *     we'll throw an assertion if we go off the end of the block.
   * @param {!BinaryReaderOptions=} options Options for this BinaryReader.
   */
  constructor(bytes, start, length, options) {
    /**
     * Current options for this reader
     * @private {boolean}
     */
    this.discardUnknownFields;
    /**
     * Wire-format decoder.
     * @const {!BinaryDecoder}
     */
    this.decoder_ = BinaryDecoder.alloc(bytes, start, length, options);

    /**
     * Cursor immediately before the field tag.
     * @private {number}
     */
    this.fieldCursor_ = this.decoder_.getCursor();

    /**
     * Field number of the next field in the buffer, filled in by nextField().
     * @private {number}
     */
    this.nextField_ = BinaryConstants.INVALID_FIELD_NUMBER;

    /**
     * The combined wire-type and field number of the next field in the buffer,
     * filled in by nextField().
     * @private {number}
     */
    this.nextTag_ = BinaryConstants.INVALID_TAG;

    /**
     * Wire type of the next proto field in the buffer, filled in by
     * nextField().
     * @private {!BinaryConstants.WireType}
     */
    this.nextWireType_ = BinaryConstants.WireType.INVALID;
    this.setOptions(options);
  }

  /**
   * @param {!BinaryReaderOptions=} options options for this decoder.
   * @private
   */
  setOptions({ discardUnknownFields = false } = {}) {
    this.discardUnknownFields = discardUnknownFields;
  }


  /**
   * Pops an instance off the instance cache, or creates one if the cache is
   * empty.
   * @param {?ByteSource|!ByteString=} bytes The bytes we're reading from.
   * @param {number=} start The optional offset to start reading at.
   * @param {number=} length The optional length of the block to read -
   *     we'll throw an assertion if we go off the end of the block.
   * @param {!BinaryReaderOptions=} options
   * @return {!BinaryReader}
   * @suppress {visibility} accesses private properties of decoder
   */
  static alloc(bytes, start, length, options) {
    if (BinaryReader.instanceCache_.length) {
      const newReader = BinaryReader.instanceCache_.pop();
      newReader.setOptions(options);
      newReader.decoder_.init(bytes, start, length, options);
      return newReader;
    } else {
      return new BinaryReader(bytes, start, length, options);
    }
  }



  /**
   * Puts this instance back in the instance cache.
   */
  free() {
    this.decoder_.clear();
    this.nextTag_ = BinaryConstants.INVALID_TAG;
    this.nextField_ = BinaryConstants.INVALID_FIELD_NUMBER;
    this.nextWireType_ = BinaryConstants.WireType.INVALID;

    if (BinaryReader.instanceCache_.length < 100) {
      BinaryReader.instanceCache_.push(this);
    }
  }


  /**
   * Returns the cursor immediately before the current field's tag.
   * @return {number} The internal read cursor.
   */
  getFieldCursor() {
    return this.fieldCursor_;
  }


  /**
   * Returns the internal read cursor.
   * @return {number} The internal read cursor.
   */
  getCursor() {
    return this.decoder_.getCursor();
  }

  /** @return {boolean} */
  dataIsImmutable() {
    return this.decoder_.dataIsImmutable();
  }

  /**
   * Returns the raw buffer.
   *
   * Throws if the internal buffer is immutable.
   *
   * @return {?Uint8Array} The raw buffer.
   */
  getBuffer() {
    return this.decoder_.getBuffer();
  }

  /**
   * Returns the raw buffer as a byte string.
   *
   * Throws if the internal buffer is mutable.
   *
   * @return {?ByteString} The raw buffer.
   */
  getBufferAsByteString() {
    return this.decoder_.getBufferAsByteString();
  }

  /**
   * @return {number}  The combined wire type and field number of the next field
   *     in the buffer, or INVALID_TAG if there is no next field. This is an
   *     unsigned 32-bit integer value with the lower three bits the wire type
   *     and the upper 29 bits the field number.
   */
  getTag() {
    return this.nextTag_;
  }

  /**
   * @return {number} The field number of the next field in the buffer, or
   *     INVALID_FIELD_NUMBER if there is no next field.
   */
  getFieldNumber() {
    return this.nextField_;
  }


  /**
   * @return {!BinaryConstants.WireType} The wire type of the next field
   *     in the stream, or WireType.INVALID if there is no next field.
   */
  getWireType() {
    return this.nextWireType_;
  }


  /**
   * @return {boolean} Whether the current wire type is an end-group tag. Used
   *     as
   * an exit condition in decoder loops in generated code.
   */
  isEndGroup() {
    return this.nextWireType_ == BinaryConstants.WireType.END_GROUP;
  }

  /**
   * @return {boolean} Whether the current wire type is a delimited field. Used
   *     to
   * conditionally parse packed repeated fields.
   */
  isDelimited() {
    return this.nextWireType_ == BinaryConstants.WireType.DELIMITED;
  }


  /**
   * Rewinds the stream cursor to the beginning of the buffer and resets all
   * internal state.
   * @package
   */
  reset() {
    this.decoder_.reset();
    this.fieldCursor_ = this.decoder_.getCursor();
    this.nextTag_ = BinaryConstants.INVALID_TAG;
    this.nextField_ = BinaryConstants.INVALID_FIELD_NUMBER;
    this.nextWireType_ = BinaryConstants.WireType.INVALID;
  }


  /**
   * Advances the stream cursor by the given number of bytes.
   * @param {number} count The number of bytes to advance by.
   */
  advance(count) {
    this.decoder_.advance(count);
  }


  /**
   * Reads the next field header in the stream if there is one, returns true if
   * we saw a valid field header or false if we've read the whole stream.
   * Throws an error if we encountered a deprecated START_GROUP/END_GROUP field.
   * @return {boolean} True if the stream contains more fields.
   */
  nextField() {
    // If we're at the end of the block, there are no more fields.
    if (this.decoder_.atEnd()) {
      return false;
    }
    this.assertPriorFieldWasRead();
    // No need to check cursor position here, as that is readUnsignedVarint32s
    // responsibility.

    // Otherwise just read the header of the next field.
    this.fieldCursor_ = this.decoder_.getCursor();
    const header = BinaryDecoder.readUnsignedVarint32(this.decoder_);

    const nextField = parseFieldNumber(header);
    const nextWireType = parseWireType(header);

    // If the wire type isn't one of the valid ones, something's broken.
    if (!BinaryConstants.isValidWireType(nextWireType)) {
      throw errors.invalidWireTypeError(nextWireType, this.fieldCursor_);
    }

    // Zero is not a valid field number and we should never see a negative as
    // we've already shifted right unsigned.
    if (nextField < 1) {
      throw errors.invalidFieldNumberError(nextField, this.fieldCursor_);
    }

    this.nextTag_ = header;
    this.nextField_ = nextField;
    this.nextWireType_ = nextWireType;

    return true;
  }

  /**
   * If the stream contains a following field with the specified tag (field
   * number and wire type), reads its field header and makes the reader ready to
   * read its value. If the stream does not contain another field, or its tag is
   * different, does not change the state of the stream.
   *
   * TIP: methods like `readMessage` may destroy the reader state for the tag,
   * so call `getTag()` outside a loop, before calling reader methods to pass
   * into this method.
   *
   * @param {number} tag The field tag to look for.
   * @return {boolean} Whether another instance of the current tag is read.
   */
  nextFieldIfTagEqualTo(tag) {
    this.assertPriorFieldWasRead();
    asserts.assert(
      BinaryConstants.isValidWireType(parseWireType(tag)) &&
      parseFieldNumber(tag) > 0,
      'Must pass a valid tag.');

    const fieldCursorOrNegative =
      this.decoder_.readUnsignedVarint32IfEqualTo(tag);
    const matched = fieldCursorOrNegative >= 0;
    if (matched) {
      this.fieldCursor_ = fieldCursorOrNegative;

      this.nextTag_ = tag;
      this.nextField_ = parseFieldNumber(tag);
      this.nextWireType_ = parseWireType(tag);
    }
    return matched;
  }

  /**
   * Helper to ensure that the prior field was correctly read by advancing the
   * cursor.
   * @private
   */
  assertPriorFieldWasRead() {
    if (asserts.ENABLE_ASSERTS &&
      this.nextTag_ !== BinaryConstants.INVALID_TAG) {
      // If we aren't at the first field, make sure that the previous caller of
      // nextField actually read the field (by calling an appropriate `read*` or
      // `skip*` method).
      // To do this we go back and redo the work to move cursor to where it was
      // at the end of the last nextField() call and just ensure that we have
      // advanced beyond that
      const currentCursor = this.decoder_.getCursor();
      this.decoder_.setCursor(this.fieldCursor_);
      BinaryDecoder.readUnsignedVarint32(this.decoder_);
      if (this.nextWireType_ === BinaryConstants.WireType.END_GROUP ||
        this.nextWireType_ === BinaryConstants.WireType.START_GROUP) {
        // This case should be impossible, as every read* skip* method would
        // likely throw.  Direct mutation of the cursor could do it.
        asserts.assert(
          currentCursor === this.decoder_.getCursor(),
          'Expected to not advance the cursor.  Group tags do not have values.');
      } else {
        asserts.assert(
          currentCursor > this.decoder_.getCursor(),
          'Expected to read the field, did you forget to call a read or skip method?');
      }
      this.decoder_.setCursor(currentCursor);
    }
  }


  /**
   * Skips over the next varint field in the binary stream.
   */
  skipVarintField() {
    // This case should be impossible but jsproto calls this method without
    // first checking wiretype
    if (this.nextWireType_ != BinaryConstants.WireType.VARINT) {
      asserts.fail('Invalid wire type for skipVarintField');
      this.skipField();
      return;
    }

    this.decoder_.skipVarint();
  }


  /**
   * Skips over the next delimited field in the binary stream.
   * @return {number} The length of the delimited field payload, not including
   *     the field header.
   */
  skipDelimitedField() {
    // This case should be impossible but jsproto calls this method without
    // first checking wiretype
    if (this.nextWireType_ != BinaryConstants.WireType.DELIMITED) {
      asserts.fail('Invalid wire type for skipDelimitedField');
      this.skipField();
      return 0;
    }

    const length = BinaryDecoder.readUnsignedVarint32(this.decoder_);
    this.decoder_.advance(length);
    return length;
  }


  /**
   * Skips over the next fixed32 field in the binary stream.
   * @private
   */
  skipFixed32Field() {
    asserts.assert(this.nextWireType_ === BinaryConstants.WireType.FIXED32);
    this.decoder_.advance(4);
  }


  /**
   * Skips over the next fixed64 field in the binary stream.
   * @private
   */
  skipFixed64Field() {
    asserts.assert(this.nextWireType_ === BinaryConstants.WireType.FIXED64);
    this.decoder_.advance(8);
  }


  /**
   * Skips over the next group field in the binary stream.
   * @private
   */
  skipGroup() {
    const previousField = this.nextField_;
    do {
      if (!this.nextField()) {
        throw errors.unmatchedStartGroupEofError();
      }
      if (this.nextWireType_ == BinaryConstants.WireType.END_GROUP) {
        // Group end: check that it matches top-of-stack.
        if (this.nextField_ != previousField) {
          throw errors.unmatchedStartGroupError();
        }
        return;
      }
      this.skipField();
    } while (true);
  }


  /**
   * Skips over the next field in the binary stream - this is useful if we're
   * decoding a message that contain unknown fields.
   */
  skipField() {
    switch (this.nextWireType_) {
      case BinaryConstants.WireType.VARINT:
        this.skipVarintField();
        break;
      case BinaryConstants.WireType.FIXED64:
        this.skipFixed64Field();
        break;
      case BinaryConstants.WireType.DELIMITED:
        this.skipDelimitedField();
        break;
      case BinaryConstants.WireType.FIXED32:
        this.skipFixed32Field();
        break;
      case BinaryConstants.WireType.START_GROUP:
        this.skipGroup();
        break;
      default:
        throw errors.invalidWireTypeError(
          this.nextWireType_, this.fieldCursor_);
    }
  }

  /**
   * Skips over the entire content to the end of the stream.
   */
  skipToEnd() {
    this.decoder_.setCursor(this.decoder_.getEnd());
  }

  /**
   * Reads a single field as an uninterpreted bytestring.
   * @return {!ByteString|undefined}
   */
  readUnknownField() {
    // read the field cursor prior to calling skipField, otherwise skipping
    // a group will reset the field cursor.
    const begin = this.getFieldCursor();
    this.skipField();
    return this.readUnknownFieldsStartingFrom(begin);
  }

  /**
   * Reads a range of unknown field(s) as a single bytestring.
   * @param {number} fieldOffset
   * @return {!ByteString|undefined}
   */
  readUnknownFieldsStartingFrom(fieldOffset) {
    if (!this.discardUnknownFields) {
      // It is important that this is actually an immutable reference since the
      // unknownFieldset takes 'ownership' over the data. So we read as a
      // ByteString.
      const currentOffset = this.decoder_.getCursor();
      const fieldLength = currentOffset - fieldOffset;
      this.decoder_.setCursor(fieldOffset);
      const unknownField = this.decoder_.readByteString(fieldLength);
      // double check our own math.
      asserts.assert(currentOffset == this.decoder_.getCursor());
      // lazily instantiate the unknown fields structure.
      return unknownField;
    }
    return undefined;
  }

  /**
   * Reads a field of any valid non-message type from the binary stream.
   *
   * Returns `null` if the type could not be parsed because the data on the wire
   * doesn't match the `fieldType`.
   * @param {!BinaryConstants.FieldType} fieldType
   * @return {boolean|number|string|!Uint8Array|null}
   */
  readAny(fieldType) {
    // If the wire types don't match just return null, it means that there is an
    // invalid value on the wire.  In normal apps/jspb we handle this as an
    // 'unknown field' but in this API we just skip over it as we have no place
    // to store unknowns
    if (BinaryConstants.FieldTypeToWireType(fieldType) !== this.nextWireType_) {
      return null;
    }
    const fieldTypes = BinaryConstants.FieldType;
    switch (fieldType) {
      case fieldTypes.DOUBLE:
        return this.readDouble();
      case fieldTypes.FLOAT:
        return this.readFloat();
      case fieldTypes.INT64:
        return this.readInt64();
      case fieldTypes.UINT64:
        return this.readUint64();
      case fieldTypes.INT32:
        return this.readInt32();
      case fieldTypes.FIXED64:
        return this.readFixed64();
      case fieldTypes.FIXED32:
        return this.readFixed32();
      case fieldTypes.BOOL:
        return this.readBool();
      case fieldTypes.STRING:
        return this.readString();
      case fieldTypes.GROUP:
        asserts.fail('Group field type not supported in readAny()');
      case fieldTypes.MESSAGE:
        asserts.fail('Message field type not supported in readAny()');
      case fieldTypes.BYTES:
        return this.readBytes();
      case fieldTypes.UINT32:
        return this.readUint32();
      case fieldTypes.ENUM:
        return this.readEnum();
      case fieldTypes.SFIXED32:
        return this.readSfixed32();
      case fieldTypes.SFIXED64:
        return this.readSfixed64();
      case fieldTypes.SINT32:
        return this.readSint32();
      case fieldTypes.SINT64:
        return this.readSint64();
      default:
        asserts.fail('Invalid field type in readAny()');
    }
    return null;
  }


  /**
   * Deserialize a proto into the provided message object using the provided
   * reader function. This function is templated as we currently have one client
   * who is using manual deserialization instead of the code-generated versions.
   * @template T,A,B,C
   * @param {T} message
   * @param {function(T, !BinaryReader, A, B, C)} reader
   * @param {A=} contextA
   * @param {B=} contextB
   * @param {C=} contextC
   * @return {T}
   */
  readMessage(message, reader, contextA, contextB, contextC) {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.DELIMITED);

    // Save the current endpoint of the decoder and move it to the end of the
    // embedded message.
    const oldEnd = this.decoder_.getEnd();
    const length = BinaryDecoder.readUnsignedVarint32(this.decoder_);
    const newEnd = this.decoder_.getCursor() + length;
    let underflowLength = newEnd - oldEnd;
    if (underflowLength <= 0) {
      this.decoder_.setEnd(newEnd);

      // Deserialize the embedded message.
      reader(message, this, contextA, contextB, contextC);

      underflowLength = newEnd - this.decoder_.getCursor();
    }
    if (underflowLength) {
      throw errors.messageLengthMismatchError(length, length - underflowLength);
    }
    // Advance the decoder past the embedded message and restore the endpoint.
    this.decoder_.setCursor(newEnd);
    this.decoder_.setEnd(oldEnd);
    return message;
  }

  /**
   * Deserialize a proto into the provided message object using the provided
   * reader function, assuming that the message is serialized as a group
   * with the given tag.
   * @template T
   * @param {number} field
   * @param {T} message
   * @param {function(T, !BinaryReader)} reader
   * @return {T}
   */
  readGroup(field, message, reader) {
    // Ensure that the wire type is correct.
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.START_GROUP);
    // Ensure that the field number is correct.
    asserts.assert(this.nextField_ == field);

    // Deserialize the message. The deserialization will stop at an END_GROUP
    // tag.
    reader(message, this);

    if (this.nextWireType_ !== BinaryConstants.WireType.END_GROUP) {
      // This case should be impossible assuming we trust all the reader
      // callbacks.  In other words this really means the `reader` did the
      // wrong thing.
      throw errors.groupDidNotEndWithEndGroupError();
    } else if (this.nextField_ !== field) {
      // this can happen if start and end group tags are nested improperly
      throw errors.unmatchedStartGroupError();
    }
    return message;
  }

  /**
   * Whether the current field could be a valid start of a message set group.
   * @return {boolean}
   */
  isMessageSetGroup() {
    return this.getTag() === MESSAGE_SET_START_GROUP_TAG;
  }

  /**
   * Deserialize a message-set wire-format group, calling the provided callaback
   * with the type ID and reader to read the message with.
   *
   * See go/messageset-wire-format
   * @param {function(number, !BinaryReader): void} readerCallback Function
   *   called with the type ID and a reader for the message content.
   */
  readMessageSetGroup(readerCallback) {
    asserts.assert(this.isMessageSetGroup());

    // A message set group is encodes like:
    // repeated group Item = 1 {
    //   required uint32 typeId = 2;
    //   required bytes message = 3;
    // }
    //
    let typeId = 0;
    // The offset to the message payload, or -1 if consumed.
    let messageCursor = 0;
    while (this.nextField() && !this.isEndGroup()) {
      // See go/malformed-message-set-parsing If malformed messages repeat the
      // typeId or message fields, only use the first value of either within
      // the group.
      if (this.getTag() === MESSAGE_SET_TYPE_ID_TAG && !typeId) {
        typeId = this.readUint32();
        if (messageCursor) {
          asserts.assert(messageCursor > 0);
          // Backup the parsing to the message payload.
          // No need to restore the position, we'll simply reread the type id
          // again, but skip doing anything because its already been read once.

          // Reset these.  Because we are going to modify the cursor we need to
          // skip the consistency checks in nextField() and pretend like this is
          // a fresh BinaryReader instance.
          if (asserts.ENABLE_ASSERTS) {
            this.nextTag_ = BinaryConstants.INVALID_TAG;
            this.nextWireType_ = BinaryConstants.WireType.INVALID;
          }

          // Reset our cursor to where the message was, and pretend like we had
          // not seen the message payload yet.
          this.decoder_.setCursor(messageCursor);
          messageCursor = 0;
        }
      } else if (this.getTag() === MESSAGE_SET_MESSAGE_TAG && !messageCursor) {
        if (typeId) {
          messageCursor = -1;
          this.readMessage(typeId, readerCallback);
        } else {
          // Save the cursor to read the message
          // after we have the type ID.
          messageCursor = this.getFieldCursor();
          this.skipDelimitedField();
        }
      } else {
        // Either we have already read the payload or this is not a valid
        // messageset member. As a practical matter we don't have a place to
        // store this unknown field and simply skipping is consistent with the
        // Java and C++ impls
        this.skipField();
      }
    }

    // If we do not have an end tag, if we did not have a message, or if we
    // did not have a field number, drop out.
    if (this.getTag() !== MESSAGE_SET_END_TAG || !messageCursor || !typeId) {
      throw errors.malformedBinaryBytesForMessageSet();
    }
  }

  /**
   * Reads a signed 32-bit integer field from the binary stream, or throws an
   * error if the next field in the stream is not of the correct wire type.
   *
   * @return {number} The value of the signed 32-bit integer field.
   */
  readInt32() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.VARINT);
    return BinaryDecoder.readSignedVarint32(this.decoder_);
  }


  /**
   * Reads a signed 64-bit integer field from the binary stream, or throws an
   * error if the next field in the stream is not of the correct wire type.
   *
   * @return {number} The value of the signed 64-bit integer field.
   */
  readInt64() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.VARINT);
    return BinaryDecoder.readSignedVarint64(this.decoder_);
  }


  /**
   * Reads a signed 64-bit integer field from the binary stream, or throws an
   * error if the next field in the stream is not of the correct wire type.
   *
   * Returns the value as a string.
   *
   * @return {string} The value of the signed 64-bit integer field as a decimal
   * string.
   */
  readInt64String() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.VARINT);
    return BinaryDecoder.readSignedVarint64String(this.decoder_);
  }


  /**
   * Reads an unsigned 32-bit integer field from the binary stream, or throws an
   * error if the next field in the stream is not of the correct wire type.
   *
   * @return {number} The value of the unsigned 32-bit integer field.
   */
  readUint32() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.VARINT);
    return BinaryDecoder.readUnsignedVarint32(this.decoder_);
  }


  /**
   * Reads an unsigned 64-bit integer field from the binary stream, or throws an
   * error if the next field in the stream is not of the correct wire type.
   *
   * @return {number} The value of the unsigned 64-bit integer field.
   */
  readUint64() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.VARINT);
    return BinaryDecoder.readUnsignedVarint64(this.decoder_);
  }

  /**
   * Reads an unsigned 64-bit integer field from the binary stream, or throws an
   * error if the next field in the stream is not of the correct wire type.
   *
   * Returns the value as a string.
   *
   * @return {string} The value of the unsigned 64-bit integer field as a
   *     decimal string.
   */
  readUint64String() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.VARINT);
    return BinaryDecoder.readUnsignedVarint64String(this.decoder_);
  }

  /**
   * Reads a signed zigzag-encoded 32-bit integer field from the binary stream,
   * or throws an error if the next field in the stream is not of the correct
   * wire type.
   *
   * @return {number} The value of the signed 32-bit integer field.
   */
  readSint32() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.VARINT);
    return BinaryDecoder.readZigzagVarint32(this.decoder_);
  }


  /**
   * Reads a signed zigzag-encoded 64-bit integer field from the binary stream,
   * or throws an error if the next field in the stream is not of the correct
   * wire type.
   *
   * @return {number} The value of the signed 64-bit integer field.
   */
  readSint64() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.VARINT);
    return BinaryDecoder.readZigzagVarint64(this.decoder_);
  }


  /**
   * Reads a signed zigzag-encoded 64-bit integer field from the binary stream,
   * or throws an error if the next field in the stream is not of the correct
   * wire type.
   *
   * @return {string} The value of the signed 64-bit integer field as a decimal
   *     string.
   */
  readSint64String() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.VARINT);
    return BinaryDecoder.readZigzagVarint64String(this.decoder_);
  }

  /**
   * Reads an unsigned 32-bit fixed-length integer fiield from the binary
   * stream, or throws an error if the next field in the stream is not of the
   * correct wire type.
   *
   * @return {number} The value of the double field.
   */
  readFixed32() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.FIXED32);
    return BinaryDecoder.readUint32(this.decoder_);
  }


  /**
   * Reads an unsigned 64-bit fixed-length integer fiield from the binary
   * stream, or throws an error if the next field in the stream is not of the
   * correct wire type.
   *
   * @return {number} The value of the float field.
   */
  readFixed64() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.FIXED64);
    return BinaryDecoder.readUint64(this.decoder_);
  }


  /**
   * Reads an unsigned 64-bit integer field from the binary stream as a string,
   * or throws an error if the next field in the stream is not of the correct
   * wire type.
   *
   * Returns the value as a string.
   *
   * @return {string} The value of the unsigned 64-bit integer field as a
   *     decimal string.
   */
  readFixed64String() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.FIXED64);
    return BinaryDecoder.readUint64String(this.decoder_);
  }

  /**
   * Reads a signed 32-bit fixed-length integer fiield from the binary stream,
   * or throws an error if the next field in the stream is not of the correct
   * wire type.
   *
   * @return {number} The value of the signed 32-bit integer field.
   */
  readSfixed32() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.FIXED32);
    return BinaryDecoder.readInt32(this.decoder_);
  }


  /**
   * Reads a signed 32-bit fixed-length integer fiield from the binary stream,
   * or throws an error if the next field in the stream is not of the correct
   * wire type.
   *
   * @return {string} The value of the signed 32-bit integer field as a decimal
   * string.
   */
  readSfixed32String() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.FIXED32);
    return BinaryDecoder.readInt32(this.decoder_).toString();
  }


  /**
   * Reads a signed 64-bit fixed-length integer fiield from the binary stream,
   * or throws an error if the next field in the stream is not of the correct
   * wire type.
   *
   * @return {number} The value of the sfixed64 field.
   */
  readSfixed64() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.FIXED64);
    return BinaryDecoder.readInt64(this.decoder_);
  }


  /**
   * Reads a signed 64-bit fixed-length integer field from the binary stream,
   * or throws an error if the next field in the stream is not of the correct
   * wire type.
   *
   * Returns the value as a string.
   *
   * @return {string} The value of the sfixed64 field as a decimal string.
   */
  readSfixed64String() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.FIXED64);
    return BinaryDecoder.readInt64String(this.decoder_);
  }

  /**
   * Reads a 32-bit floating-point field from the binary stream, or throws an
   * error if the next field in the stream is not of the correct wire type.
   *
   * @return {number} The value of the float field.
   */
  readFloat() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.FIXED32);
    return BinaryDecoder.readFloat(this.decoder_);
  }


  /**
   * Reads a 64-bit floating-point field from the binary stream, or throws an
   * error if the next field in the stream is not of the correct wire type.
   *
   * @return {number} The value of the double field.
   */
  readDouble() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.FIXED64);
    return BinaryDecoder.readDouble(this.decoder_);
  }


  /**
   * Reads a boolean field from the binary stream, or throws an error if the
   * next field in the stream is not of the correct wire type.
   *
   * @return {boolean} The value of the boolean field.
   */
  readBool() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.VARINT);
    return BinaryDecoder.readBool(this.decoder_);
  }


  /**
   * Reads an enum field from the binary stream, or throws an error if the next
   * field in the stream is not of the correct wire type.
   *
   * @return {number} The value of the enum field.
   */
  readEnum() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.VARINT);
    return BinaryDecoder.readSignedVarint32(this.decoder_);
  }


  /**
   * Reads a string field from the binary stream, or throws an error if the next
   * field in the stream is not of the correct wire type.
   *
   * @return {string} The value of the string field.
   */
  readString() {
    // delegate to the other reader so that inlining can eliminate this method
    // in the common case.
    if (UTF8_PARSING_ERRORS_ARE_FATAL) {
      return this.readStringRequireUtf8();
    }
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.DELIMITED);
    const length = BinaryDecoder.readUnsignedVarint32(this.decoder_);
    return this.decoder_.readString(length, /*parsingErrorsAreFatal=*/ false);
  }

  /**
   * Reads a string field from the binary stream, or throws an error if the next
   * field in the stream is not of the correct wire type, or if the string is
   * not valid utf8.
   *
   * @return {string} The value of the string field.
   */
  readStringRequireUtf8() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.DELIMITED);
    const length = BinaryDecoder.readUnsignedVarint32(this.decoder_);
    return this.decoder_.readString(length, /*parsingErrorsAreFatal=*/ true);
  }

  /**
   * Reads a length-prefixed block of bytes from the binary stream, or returns
   * null if the next field in the stream has an invalid length value.
   *
   * @return {!Uint8Array} The block of bytes.
   */
  readBytes() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.DELIMITED);
    const length = BinaryDecoder.readUnsignedVarint32(this.decoder_);
    return this.decoder_.readBytes(length);
  }

  /**
   * Reads a length-prefixed block of bytes from the binary stream, or returns
   * null if the next field in the stream has an invalid length value.
   *
   * @return {!ByteString} The block of bytes.
   */
  readByteString() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.DELIMITED);
    const length = BinaryDecoder.readUnsignedVarint32(this.decoder_);
    return this.decoder_.readByteString(length);
  }

  /**
   * Reads a 64-bit varint field from the stream and invokes `convert` to
   * produce the return value, or throws an error if the next field in the
   * stream is not of the correct wire type.
   *
   * @param {function(number, number): T} convert Conversion function to produce
   *     the result value, takes parameters (lowBits, highBits).
   * @return {T}
   * @template T
   */
  readSplitVarint64(convert) {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.VARINT);
    return BinaryDecoder.readSplitVarint64(this.decoder_, convert);
  }


  /**
   * Reads a 64-bit zig-zag varint field from the stream and invokes `convert`
   * to produce the return value, or throws an error if the next field in the
   * stream is not of the correct wire type.
   *
   * @param {function(number, number): T} convert Conversion function to produce
   *     the result value, takes parameters (lowBits, highBits).
   * @return {T}
   * @template T
   */
  readSplitZigzagVarint64(convert) {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.VARINT);
    return BinaryDecoder.readSplitVarint64(
      this.decoder_,
      (lowBits, highBits) => utils.fromZigzag64(lowBits, highBits, convert));
  }


  /**
   * Reads a 64-bit fixed64 field from the stream and invokes `convert`
   * to produce the return value, or throws an error if the next field in the
   * stream is not of the correct wire type.
   *
   * @param {function(number, number): T} convert Conversion function to produce
   *     the result value, takes parameters (lowBits, highBits).
   * @return {T}
   * @template T
   */
  readSplitFixed64(convert) {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.FIXED64);
    return BinaryDecoder.readSplitFixed64(this.decoder_, convert);
  }


  /**
   * Reads a packed scalar field using the supplied raw reader function.
   * @param {function(!BinaryDecoder):T} decodeMethod
   * @param {!Array<T>} dst
   * @template T
   * @private
   */
  readPackedFieldInto_(decodeMethod, dst) {
    const length = this.readPackedFieldLength_();
    const end = this.decoder_.getCursor() + length;
    while (this.decoder_.getCursor() < end) {
      dst.push(decodeMethod(this.decoder_));
    }
  }

  /**
   * Reads the length of a packed field.
   * @return {number}
   * @private
   */
  readPackedFieldLength_() {
    asserts.assert(this.nextWireType_ == BinaryConstants.WireType.DELIMITED);
    return BinaryDecoder.readUnsignedVarint32(this.decoder_);
  }

  /**
   * Reads an int32 field that might be packed
   * @param {!Array<number>} dst
   */
  readPackableInt32Into(dst) {
    if (this.isDelimited()) {
      this.readPackedFieldInto_(BinaryDecoder.readSignedVarint32, dst);
    } else {
      dst.push(this.readInt32());
    }
  }

  /**
   * Reads an int64 field that might be packed
   * @param {!Array<number>}dst
   */
  readPackableInt64Into(dst) {
    if (this.isDelimited()) {
      this.readPackedFieldInto_(BinaryDecoder.readSignedVarint64, dst);
    } else {
      dst.push(this.readInt64());
    }
  }

  /**
   * Reads an int64 field that might be packed
   * @param {!Array<string>} dst
   */
  readPackableInt64StringInto(dst) {
    if (this.isDelimited()) {
      this.readPackedFieldInto_(BinaryDecoder.readSignedVarint64String, dst);
    } else {
      dst.push(this.readInt64String());
    }
  }

  /**
   * Reads an int32 field that might be packed
   * @param {!Array<number>} dst
   */
  readPackableUint32Into(dst) {
    if (this.isDelimited()) {
      this.readPackedFieldInto_(BinaryDecoder.readUnsignedVarint32, dst);
    } else {
      dst.push(this.readUint32());
    }
  }

  /**
   * Reads an uint64 field that might be packed
   * @param {!Array<number>} dst
   */
  readPackableUint64Into(dst) {
    if (this.isDelimited()) {
      this.readPackedFieldInto_(BinaryDecoder.readUnsignedVarint64, dst);
    } else {
      dst.push(this.readUint64());
    }
  }

  /**
   * Reads an uint64 field that might be packed
   * @param {!Array<string>} dst
   */
  readPackableUint64StringInto(dst) {
    if (this.isDelimited()) {
      this.readPackedFieldInto_(BinaryDecoder.readUnsignedVarint64String, dst);
    } else {
      dst.push(this.readUint64String());
    }
  }

  /**
   * Reads a possibly packed sint32 field,
   * @param {!Array<number>} dst
   */
  readPackableSint32Into(dst) {
    if (this.isDelimited()) {
      this.readPackedFieldInto_(BinaryDecoder.readZigzagVarint32, dst);
    } else {
      dst.push(this.readSint32());
    }
  }

  /**
   * Reads a possibly packed sint64 field,
   * @param {!Array<number>} dst
   */
  readPackableSint64Into(dst) {
    if (this.isDelimited()) {
      this.readPackedFieldInto_(BinaryDecoder.readZigzagVarint64, dst);
    } else {
      dst.push(this.readSint64());
    }
  }

  /**
   * Reads a possibly packed sint64 field as an array of strings.
   * @param {!Array<string>} dst
   */
  readPackableSint64StringInto(dst) {
    if (this.isDelimited()) {
      this.readPackedFieldInto_(BinaryDecoder.readZigzagVarint64String, dst);
    } else {
      dst.push(this.readSint64String());
    }
  }

  /**
   * Reads a possibly packed fixed32 field.
   * @param {!Array<number>} dst
   */
  readPackableFixed32Into(dst) {
    if (this.isDelimited()) {
      this.readPackedFieldInto_(BinaryDecoder.readUint32, dst);
    } else {
      dst.push(this.readFixed32());
    }
  }

  /**
   * Reads a possibly packed fixed64 field.
   * @param {!Array<number>} dst
   */
  readPackableFixed64Into(dst) {
    if (this.isDelimited()) {
      this.readPackedFieldInto_(BinaryDecoder.readUint64, dst);
    } else {
      dst.push(this.readFixed64());
    }
  }

  /**
   * Reads a possibly packed fixed64 field as an array fo strings
   * @param {!Array<string>} dst
   */
  readPackableFixed64StringInto(dst) {
    if (this.isDelimited()) {
      this.readPackedFieldInto_(BinaryDecoder.readUint64String, dst);
    } else {
      dst.push(this.readFixed64String());
    }
  }

  /**
   * Reads a possibly packed sfixed32
   * @param {!Array<number>} dst
   */
  readPackableSfixed32Into(dst) {
    if (this.isDelimited()) {
      this.readPackedFieldInto_(BinaryDecoder.readInt32, dst);
    } else {
      dst.push(this.readSfixed32());
    }
  }

  /**
   * Reads a possibly packed sfixed64 field.
   * @param {!Array<number>} dst
   */
  readPackableSfixed64Into(dst) {
    if (this.isDelimited()) {
      this.readPackedFieldInto_(BinaryDecoder.readInt64, dst);
    } else {
      dst.push(this.readSfixed64());
    }
  }

  /**
   * Reads a possibly packed sfixed64 field as an array of strings
   * @param {!Array<string>} dst
   */
  readPackableSfixed64StringInto(dst) {
    if (this.isDelimited()) {
      this.readPackedFieldInto_(BinaryDecoder.readInt64String, dst);
    } else {
      dst.push(this.readSfixed64String());
    }
  }

  /**
   * Reads a packed fixed32 field, which consists of a length header and a list
   * of unsigned 32-bit ints.
   * @return {!Array<number>}
   * @export
   */
  readPackedFixed32() {
    const values = [];
    this.readPackableFixed32Into(values);
    return values;
  }


  /**
   * Reads a packed fixed64 field, which consists of a length header and a list
   * of unsigned 64-bit ints.
   * @return {!Array<number>}
   * @export
   */
  readPackedFixed64() {
    const values = [];
    this.readPackableFixed64Into(values);
    return values;
  }


  /**
   * Reads a packed fixed64 field, which consists of a length header and a list
   * of unsigned 64-bit ints.  Returns a list of strings.
   * @return {!Array<string>}
   * @export
   */
  readPackedFixed64String() {
    const values = [];
    this.readPackableFixed64StringInto(values);
    return values;
  }


  /**
   * Reads a packed sfixed32 field, which consists of a length header and a list
   * of 32-bit ints.
   * @return {!Array<number>}
   * @export
   */
  readPackedSfixed32() {
    const values = [];
    this.readPackableSfixed32Into(values);
    return values;
  }


  /**
   * Reads a packed sfixed64 field, which consists of a length header and a list
   * of 64-bit ints.  Returns a list of strings.
   * @return {!Array<string>}
   * @export
   */
  readPackedSfixed64String() {
    const values = [];
    this.readPackableSfixed64StringInto(values);
    return values;
  }


  /**
   * Reads a possibly packed float field
   * @param {!Array<number>} dst
   */
  readPackableFloatInto(dst) {
    if (this.isDelimited()) {
      this.readPackedFieldInto_(BinaryDecoder.readFloat, dst);
    } else {
      dst.push(this.readFloat());
    }
  }

  /**
   * Reads a possibly packed double field and appends it to `dst`.
   * @param {!Array<number>} dst
   */
  readPackableDoubleInto(dst) {
    if (this.isDelimited()) {
      this.decoder_.readDoubleArrayInto(this.readPackedFieldLength_() / 8, dst);
    } else {
      dst.push(this.readDouble());
    }
  }

  /**
   * Reads a possibly packed bool field
   * @param {!Array<boolean>} dst
   */
  readPackableBoolInto(dst) {
    if (this.isDelimited()) {
      this.readPackedFieldInto_(BinaryDecoder.readBool, dst);
    } else {
      dst.push(this.readBool());
    }
  }


  /**
   * Reads a possibly packed enum field
   * @param {!Array<number>} dst
   */
  readPackableEnumInto(dst) {
    if (this.isDelimited()) {
      this.readPackedFieldInto_(BinaryDecoder.readEnum, dst);
    } else {
      dst.push(this.readEnum());
    }
  }

  /**
   * Visible for testing.
   * @package
   */
  static resetInstanceCache() {
    BinaryReader.instanceCache_ = [];
  }

  /**
   * Visible for testing.
   * @return {!Array<!BinaryReader>}
   * @package
   */
  static getInstanceCache() {
    return BinaryReader.instanceCache_;
  }
}

/**
 * @param {number} tag
 * @return {!BinaryConstants.WireType}
 */
function parseWireType(tag) {
  return /** @type {!BinaryConstants.WireType} */ (tag & 0x7);
}

/**
 * @param {number} tag
 * @return {number}
 */
function parseFieldNumber(tag) {
  return tag >>> 3;
}

/**
 * Global pool of BinaryReader instances.
 * @private {!Array<!BinaryReader>}
 */
BinaryReader.instanceCache_ = [];

const /** number */ MESSAGE_SET_START_GROUP_TAG = utils.makeTag(
  BinaryConstants.MESSAGE_SET_GROUP_NUMBER,
  BinaryConstants.WireType.START_GROUP);
const /** number */ MESSAGE_SET_TYPE_ID_TAG = utils.makeTag(
  BinaryConstants.MESSAGE_SET_TYPE_ID_FIELD_NUMBER,
  BinaryConstants.WireType.VARINT);
const /** number */ MESSAGE_SET_MESSAGE_TAG = utils.makeTag(
  BinaryConstants.MESSAGE_SET_MESSAGE_FIELD_NUMBER,
  BinaryConstants.WireType.DELIMITED);
const /** number */ MESSAGE_SET_END_TAG = utils.makeTag(
  BinaryConstants.MESSAGE_SET_GROUP_NUMBER,
  BinaryConstants.WireType.END_GROUP);

exports = {
  BinaryReader,
  BinaryReaderOptions,
  UTF8_PARSING_ERRORS_ARE_FATAL,
};
