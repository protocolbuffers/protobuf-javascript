/**
 * @fileoverview Standard error messages for errors detected when parsing
 * binary protos.
 */
goog.module('jspb.binary.errors');

// N.B. In the functions below invoke the `Error` constructor directly in order
// to be compatible with the string replacement semantics in the JsCompiler,
// which typically matches on strings passed to the Error constructor.

/**
 * Reports that we didn't read the number of expected bytes for a message.
 * @return {!Error}
 */
function messageLengthMismatchError(
    /** number */ messageLength, /** number */ readLength) {
  // NOTE: we directly throw here instead of report because this is what we used
  // to do as well.
  return new Error(
      `Message parsing ended unexpectedly. Expected to read ` +
      `${messageLength} bytes, instead read ${readLength} bytes, either the ` +
      `data ended unexpectedly or the message misreported its own length`);
}


/**
 * Reports an invalid wire type value.
 *
 * @return {!Error}
 */
function invalidWireTypeError(/** number */ wireType, /** number */ position) {
  return new Error(`Invalid wire type: ${wireType} (at position ${position})`);
}

/**
 * Reports an invalid field number.
 *
 * @return {!Error}
 */
function invalidFieldNumberError(
    /** number */ fieldNumber, /** number */ position) {
  return new Error(
      `Invalid field number: ${fieldNumber} (at position ${position})`);
}

/**
 * Reports message-set parsing faield
 * @return {!Error}
 */
function malformedBinaryBytesForMessageSet() {
  return new Error('Malformed binary bytes for message set');
}

/**
 * Reports a failure to find an END_GROUP tag because we hit end of stream.
 *
 * @return {!Error}
 */
function unmatchedStartGroupEofError() {
  return new Error('Unmatched start-group tag: stream EOF');
}

/**
 * Reports a general failure to find an END_GROUP tag matching a START_GROUP.
 *
 * @return {!Error}
 */
function unmatchedStartGroupError() {
  return new Error('Unmatched end-group tag');
}

/**
 * Reports that parsing a group did not end on an END_GROUP tag.
 *
 * @return {!Error}
 */
function groupDidNotEndWithEndGroupError() {
  return new Error('Group submessage did not end with an END_GROUP tag');
}

/**
 * Reports that the varint is invalid in some way.
 *
 * @return {!Error}
 */
function invalidVarintError() {
  return new Error('Failed to read varint, encoding is invalid.');
}

/**
 * Reports that we read more bytes than were available.
 *
 * @return {!Error}
 */
function readTooFarError(
    /** number */ expectedLength, /** number */ readLength) {
  return new Error(`Tried to read past the end of the data ${readLength} > ${
      expectedLength}`);
}

/**
 * Reports that we read more bytes than were available.
 *
 * @return {!Error}
 */
function negativeByteLengthError(
    /** number */ length) {
  return new Error(`Tried to read a negative byte length: ${length}`);
}

exports = {
  messageLengthMismatchError,
  groupDidNotEndWithEndGroupError,
  invalidFieldNumberError,
  invalidVarintError,
  invalidWireTypeError,
  malformedBinaryBytesForMessageSet,
  negativeByteLengthError,
  readTooFarError,
  unmatchedStartGroupError,
  unmatchedStartGroupEofError,
};
