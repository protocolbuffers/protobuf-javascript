/**
 * @fileoverview Export symbols needed by tests in CommonJS style.
 *
 * This file is like export.js, but for symbols that are only used by tests.
 * However we exclude assert functions here, because they are exported into
 * the global namespace, so those are handled as a special case in
 * export_asserts.js.
 */

goog.provide('jspb.ExportTestDeps');

goog.require('goog.crypt.base64');
goog.require('goog.testing.PropertyReplacer');

goog.require('jspb.arith');
goog.require('jspb.debug');
goog.require('jspb.BinaryReader');
goog.require('jspb.BinaryWriter');
goog.require('jspb.BinaryConstants');
goog.require('jspb.ExtensionFieldBinaryInfo');
goog.require('jspb.ExtensionFieldInfo');
goog.require('jspb.Message');
goog.require('jspb.Map');
goog.require('jspb.utils');
goog.require('jspb.binary.utf8');
goog.require('jspb.binary.test_utils');

if (typeof exports === 'object') {
  exports['goog'] = {
    'crypt': {
      'byteArrayToString': goog.crypt.byteArrayToString,
      'byteArrayToHex': goog.crypt.byteArrayToHex,
      'base64': {
	'Alphabet': goog.crypt.base64.Alphabet,
	'encodeByteArray': goog.crypt.base64.encodeByteArray,
	'encodeString': goog.crypt.base64.encodeString,
	'decodeStringToUint8Array': goog.crypt.base64.decodeStringToUint8Array
      }
    },

    'testing': {
      'PropertyReplacer': goog.testing.PropertyReplacer,
    },

    'userAgent': goog.userAgent,

    'exportSymbol': goog.exportSymbol,
    'array': goog.array,
    'object': goog.object,
    'requireType': goog.requireType,
  };

  exports['jspb'] = {
    'arith': {
      'Int64': jspb.arith.Int64,
      'UInt64': jspb.arith.UInt64,
    },
    'binary': {
      'decoder': {
        'BinaryDecoder': jspb.binary.decoder.BinaryDecoder,
      },
      'encoder': {
        'BinaryEncoder': jspb.binary.encoder.BinaryEncoder,
      },
      'utf8': {
        'encodeUtf8': jspb.binary.utf8.encodeUtf8,
      },
      'test_utils': {
        'toHexFields': jspb.binary.test_utils.toHexFields,
      },
    },
    'bytestring': {
      'ByteString': jspb.bytestring.ByteString,
    },
    'utils': {
      'makeTag': jspb.utils.makeTag,
      'countFixed32Fields': jspb.utils.countFixed32Fields,
      'countFixed64Fields': jspb.utils.countFixed64Fields,
      'splitDecimalString': jspb.utils.splitDecimalString,
      'byteSourceToUint8Array': jspb.utils.byteSourceToUint8Array,
      'getSplit64Low': jspb.utils.getSplit64Low,
      'getSplit64High': jspb.utils.getSplit64High,
      'countVarintFields': jspb.utils.countVarintFields,
      'countDelimitedFields': jspb.utils.countDelimitedFields,
      'countVarints': jspb.utils.countVarints,
      'toZigzag64': jspb.utils.toZigzag64,
      'fromZigzag64': jspb.utils.fromZigzag64,
      'splitFloat64': jspb.utils.splitFloat64,
      'joinFloat64': jspb.utils.joinFloat64,
      'joinFloat32': jspb.utils.joinFloat32,
      'splitFloat32': jspb.utils.splitFloat32,
      'joinUnsignedDecimalString': jspb.utils.joinUnsignedDecimalString,
      'sliceUint8Array': jspb.utils.sliceUint8Array,
      'joinSignedDecimalString': jspb.utils.joinSignedDecimalString,
    },
    'BinaryConstants': jspb.BinaryConstants,

    'debug': jspb.debug,
    'BinaryReader': jspb.BinaryReader,
    'BinaryWriter': jspb.BinaryWriter,
    'ExtensionFieldBinaryInfo': jspb.ExtensionFieldBinaryInfo,
    'ExtensionFieldInfo': jspb.ExtensionFieldInfo,
    'Message': jspb.Message,
    'Map': jspb.Map,
  };
  // exports['exportSymbol'] = goog.exportSymbol;
  // exports['inherits'] = goog.inherits;
  // exports['object'] = {extend: goog.object.extend};
  // exports['typeOf'] = goog.typeOf;
  // exports['requireType'] = goog.requireType;

  // The COMPILED variable is set by Closure compiler to "true" when it compiles
  // JavaScript, so in practice this is equivalent to "exports.COMPILED = true".
  // This will disable some debugging functionality in debug.js, such as
  // attempting to check names that have been optimized away.
  exports['COMPILED'] = COMPILED;
}
