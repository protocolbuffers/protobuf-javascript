goog.module('jspb.binary.repeated_field_type');

const {ScalarFieldType} = goog.requireType('jspb.binary.scalar_field_type');

/**
 * A repeated field is an array of scalars, blobs, or messages.
 * @typedef {!Array<!ScalarFieldType>|!Array<!Uint8Array>}
 */
let RepeatedFieldType;

exports = {RepeatedFieldType};
