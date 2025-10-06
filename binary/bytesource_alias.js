/**
 * @fileoverview Legacy alias for the old namespace used by encoder.js
 */
goog.module('jspb.ByteSource');
goog.module.declareLegacyNamespace();

const { ByteSource } = goog.require('jspb.binary.bytesource');

exports = ByteSource;
