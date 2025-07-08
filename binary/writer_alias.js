/**
 * @fileoverview Legacy alias for the old namespace used by writer.js
 */
goog.module('jspb.BinaryWriter');
goog.module.declareLegacyNamespace();

const {BinaryWriter} = goog.require('jspb.binary.writer');

exports = BinaryWriter;
