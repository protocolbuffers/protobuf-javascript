goog.module('jspb.BinaryConstants');
goog.module.declareLegacyNamespace();


/**
 * Field type codes, taken from proto2/public/wire_format_lite.h.
 * @enum {number}
 * @package
 */
const FieldType = {
  INVALID: -1,
  DOUBLE: 1,
  FLOAT: 2,
  INT64: 3,
  UINT64: 4,
  INT32: 5,
  FIXED64: 6,
  FIXED32: 7,
  BOOL: 8,
  STRING: 9,
  GROUP: 10,
  MESSAGE: 11,
  BYTES: 12,
  UINT32: 13,
  ENUM: 14,
  SFIXED32: 15,
  SFIXED64: 16,
  SINT32: 17,
  SINT64: 18,
};


/**
 * Wire-format type codes, taken from proto2/public/wire_format_lite.h.
 * @enum {number}
 */
const WireType = {
  INVALID: -1,
  VARINT: 0,
  FIXED64: 1,
  DELIMITED: 2,
  START_GROUP: 3,
  END_GROUP: 4,
  FIXED32: 5
};

/** @return {boolean} */
function isValidWireType(/** number */ wireType) {
  return wireType >= 0 && wireType <= 5;
}


/**
 * Translates field type to wire type.
 * @param {!FieldType} fieldType
 * @return {!WireType}
 */
function FieldTypeToWireType(fieldType) {
  switch (fieldType) {
    case FieldType.INT32:
    case FieldType.INT64:
    case FieldType.UINT32:
    case FieldType.UINT64:
    case FieldType.SINT32:
    case FieldType.SINT64:
    case FieldType.BOOL:
    case FieldType.ENUM:
      return WireType.VARINT;

    case FieldType.DOUBLE:
    case FieldType.FIXED64:
    case FieldType.SFIXED64:
      return WireType.FIXED64;

    case FieldType.STRING:
    case FieldType.MESSAGE:
    case FieldType.BYTES:
      return WireType.DELIMITED;

    case FieldType.FLOAT:
    case FieldType.FIXED32:
    case FieldType.SFIXED32:
      return WireType.FIXED32;

    case FieldType.INVALID:
    case FieldType.GROUP:
    default:
      return WireType.INVALID;
  }
}


/**
 * Flag to indicate a missing field.
 * @const {number}
 */
const INVALID_FIELD_NUMBER = -1;

/**
 * Flag to indicate a missing tag.
 * @const {number}
 */
const INVALID_TAG = -1;


/**
 * The smallest denormal float32 value.
 * @const {number}
 */
const FLOAT32_EPS = 1.401298464324817e-45;


/**
 * The smallest normal float64 value.
 * @const {number}
 */
const FLOAT32_MIN = 1.1754943508222875e-38;


/**
 * The largest finite float32 value.
 * @const {number}
 */
const FLOAT32_MAX = 3.4028234663852886e+38;


/**
 * The smallest denormal float64 value.
 * @const {number}
 */
const FLOAT64_EPS = 5e-324;


/**
 * The smallest normal float64 value.
 * @const {number}
 */
const FLOAT64_MIN = 2.2250738585072014e-308;


/**
 * The largest finite float64 value.
 * @const {number}
 */
const FLOAT64_MAX = 1.7976931348623157e+308;


/**
 * Convenience constant equal to 2^20.
 * @const {number}
 */
const TWO_TO_20 = 1048576;


/**
 * Convenience constant equal to 2^23.
 * @const {number}
 */
const TWO_TO_23 = 8388608;


/**
 * Convenience constant equal to 2^31.
 * @const {number}
 */
const TWO_TO_31 = 2147483648;


/**
 * Convenience constant equal to 2^32.
 * @const {number}
 */
const TWO_TO_32 = 4294967296;


/**
 * Convenience constant equal to 2^52.
 * @const {number}
 */
const TWO_TO_52 = 4503599627370496;


/**
 * Convenience constant equal to 2^63.
 * @const {number}
 */
const TWO_TO_63 = 9223372036854775808;


/**
 * Convenience constant equal to 2^64.
 * @const {number}
 */
const TWO_TO_64 = 18446744073709551616;


/**
 * Eight-character string of zeros, used as the default 64-bit hash value.
 * @const {string}
 */
const ZERO_HASH = '\0\0\0\0\0\0\0\0';


// See MessageSet wire format: https://github.com/protocolbuffers/protobuf/blob/735621f7d720fcacc0a05114f407c3817411f296/src/google/protobuf/descriptor.proto#L600
// message MessageSet {
//   repeated group Item = 1 {
//     required uint32 type_id = 2;
//     required bytes message = 3;
//   };
// };
const /** number */ MESSAGE_SET_GROUP_NUMBER = 1;
const /** number */ MESSAGE_SET_TYPE_ID_FIELD_NUMBER = 2;
const /** number */ MESSAGE_SET_MESSAGE_FIELD_NUMBER = 3;
const /** number */ MESSAGE_SET_MAX_TYPE_ID = 0xFFFFFFFE;

exports = {
  FieldType,
  FieldTypeToWireType,
  FLOAT32_EPS,
  FLOAT32_MIN,
  FLOAT32_MAX,
  FLOAT64_EPS,
  FLOAT64_MIN,
  FLOAT64_MAX,
  INVALID_FIELD_NUMBER,
  INVALID_TAG,
  MESSAGE_SET_GROUP_NUMBER,
  MESSAGE_SET_MAX_TYPE_ID,
  MESSAGE_SET_MESSAGE_FIELD_NUMBER,
  MESSAGE_SET_TYPE_ID_FIELD_NUMBER,
  TWO_TO_20,
  TWO_TO_23,
  TWO_TO_31,
  TWO_TO_32,
  TWO_TO_52,
  TWO_TO_63,
  TWO_TO_64,
  WireType,
  ZERO_HASH,
  isValidWireType,
};
