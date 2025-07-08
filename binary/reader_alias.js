/**
 * @fileoverview Legacy alias for the old namespace used by reader.js
 */
goog.module('jspb.BinaryReader');
goog.module.declareLegacyNamespace();

const {BinaryReader} = goog.require('jspb.binary.reader');

exports = BinaryReader;
