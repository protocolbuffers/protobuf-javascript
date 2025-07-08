goog.module('jspb.binary.any_field_type');

const {RepeatedFieldType} = goog.require('jspb.binary.repeated_field_type');
const {ScalarFieldType} = goog.requireType('jspb.binary.scalar_field_type');


/**
 * A field in jspb can be a scalar, a block of bytes, another proto, or an
 * array of any of the above.
 * @typedef {?ScalarFieldType|?RepeatedFieldType|!Uint8Array}
 */
let AnyFieldType;

exports = {AnyFieldType};
