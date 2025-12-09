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
 * @fileoverview Definition of jspb.ExtensionFieldInfo.
 */

goog.module('jspb.ExtensionFieldInfo');
goog.module.declareLegacyNamespace();

// We need to reference jspb.Message for type annotations, but we want to avoid
// a circular dependency that would cause a runtime error.
goog.forwardDeclare('jspb.Message');

/**
 * Stores information for a single extension field.
 *
 * For example, an extension field defined like so:
 *
 *     extend BaseMessage {
 *       optional MyMessage my_field = 123;
 *     }
 *
 * will result in an ExtensionFieldInfo object with these properties:
 *
 *     {
 *       fieldIndex: 123,
 *       fieldName: {my_field_renamed: 0},
 *       ctor: proto.example.MyMessage,
 *       toObjectFn: proto.example.MyMessage.toObject,
 *       isRepeated: 0
 *     }
 *
 * We include `toObjectFn` to allow the JSCompiler to perform dead-code removal
 * on unused toObject() methods.
 *
 * If an extension field is primitive, ctor and toObjectFn will be null.
 * isRepeated should be 0 or 1.
 *
 * binary{Reader,Writer}Fn and (if message type) binaryMessageSerializeFn are
 * always provided. binaryReaderFn and binaryWriterFn are references to the
 * appropriate methods on BinaryReader/BinaryWriter to read/write the value of
 * this extension, and binaryMessageSerializeFn is a reference to the message
 * class's .serializeBinary method, if available.
 *
 * @param {number} fieldNumber
 * @param {Object} fieldName This has the extension field name as a property.
 * @param {?function(new: jspb.Message, Array=)} ctor
 * @param {?function((boolean|undefined),!jspb.Message):!Object} toObjectFn
 * @param {number} isRepeated
 * @constructor
 * @struct
 * @template T
 */
const ExtensionFieldInfo = function (
  fieldNumber, fieldName, ctor, toObjectFn, isRepeated) {
  /** @const */
  this.fieldIndex = fieldNumber;
  /** @const */
  this.fieldName = fieldName;
  /** @const */
  this.ctor = ctor;
  /** @const */
  this.toObjectFn = toObjectFn;
  /** @const */
  this.isRepeated = isRepeated;
};

/**
 * @return {boolean} Does this field represent a sub Message?
 * @export
 */
ExtensionFieldInfo.prototype.isMessageType = function () {
  return !!this.ctor;
};

exports = ExtensionFieldInfo;
