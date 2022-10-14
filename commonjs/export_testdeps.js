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

goog.require('jspb.debug');
goog.require('jspb.BinaryReader');
goog.require('jspb.BinaryWriter');
goog.require('jspb.ExtensionFieldBinaryInfo');
goog.require('jspb.ExtensionFieldInfo');
goog.require('jspb.Message');
goog.require('jspb.Map');

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
