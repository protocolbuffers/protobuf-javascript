// Protocol Buffers - Google's data interchange format
// Copyright 2008 Google Inc.  All rights reserved.
// https://protobuf.dev/
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//     * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

/**
 * @fileoverview Utilities to debug JSPB based proto objects.
 */

goog.module('jspb.debug');
goog.module.declareLegacyNamespace();

const googArray = goog.require('goog.array');
const googObject = goog.require('goog.object');

const asserts = goog.require('jspb.asserts');
const Map = goog.require('jspb.Map');
const Message = goog.require('jspb.Message');


/**
 * Turns a proto into a human readable object that can i.e. be written to the
 * console: `console.log(jspb.debug.dump(myProto))`.
 * This function makes a best effort and may not work in all cases. It will not
 * work in obfuscated and or optimized code.
 * Use this in environments where {@see jspb.Message.prototype.toObject} is
 * not available for code size reasons.
 * @param {Message} message A jspb.Message.
 * @return {Object}
 */
function dump(message) {
  if (!goog.DEBUG) {
    return null;
  }
  asserts.assertInstanceof(message, Message,
      'jspb.Message instance expected');
  /** @type {Object} */
  var object = message;
  asserts.assert(object['getExtension'],
      'Only unobfuscated and unoptimized compilation modes supported.');
  return /** @type {Object} */ (dump_(message));
}


/**
 * Recursively introspects a message and the values its getters return to
 * make a best effort in creating a human readable representation of the
 * message.
 * @param {?} thing A jspb.Message, Array or primitive type to dump.
 * @return {*}
 * @private
 */
function dump_(thing) {
  var type = goog.typeOf(thing);
  var message = thing;  // Copy because we don't want type inference on thing.
  if (type == 'number' || type == 'string' || type == 'boolean' ||
      type == 'null' || type == 'undefined') {
    return thing;
  }
  if (typeof Uint8Array !== 'undefined') {
    // Will fail on IE9, where Uint8Array doesn't exist.
    if (message instanceof Uint8Array) {
      return thing;
    }
  }

  if (type == 'array') {
    asserts.assertArray(thing);
    return googArray.map(thing, dump_);
  }

  if (message instanceof Map) {
    var mapObject = {};
    var entries = message.entries();
    for (var entry = entries.next(); !entry.done; entry = entries.next()) {
      mapObject[entry.value[0]] = dump_(entry.value[1]);
    }
    return mapObject;
  }

  asserts.assertInstanceof(message, Message,
      'Only messages expected: ' + thing);
  var ctor = message.constructor;
  var messageName = ctor.name || ctor.displayName;
  var object = {
    '$name': messageName
  };
  for (var name in ctor.prototype) {
    var match = /^get([A-Z]\w*)/.exec(name);
    if (match && name != 'getExtension' &&
        name != 'getJsPbMessageId') {
      var has = 'has' + match[1];
      if (!thing[has] || thing[has]()) {
        var val = thing[name]();
        object[formatFieldName_(match[1])] = dump_(val);
      }
    }
  }
  if (COMPILED && thing['extensionObject_']) {
    object['$extensions'] = 'Recursive dumping of extensions not supported ' +
        'in compiled code. Switch to uncompiled or dump extension object ' +
        'directly';
    return object;
  }
  var extensionsObject;
  for (var id in ctor['extensions']) {
    if (/^\d+$/.test(id)) {
      var ext = ctor['extensions'][id];
      var extVal = thing.getExtension(ext);
      var fieldName = googObject.getKeys(ext.fieldName)[0];
      if (extVal != null) {
        if (!extensionsObject) {
          extensionsObject = object['$extensions'] = {};
        }
        extensionsObject[formatFieldName_(fieldName)] =
          dump_(extVal);
      }
    }
  }
  return object;
}


/**
 * Formats a field name for output as camelCase.
 *
 * @param {string} name Name of the field.
 * @return {string}
 * @private
 */
function formatFieldName_(name) {
  // Name may be in TitleCase.
  return name.replace(/^[A-Z]/, function(c) {
    return c.toLowerCase();
  });
}

exports = {
  dump
};
