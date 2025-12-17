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
 * @fileoverview Definition of jspb.ExtensionFieldBinaryInfo.
 */

goog.module('jspb.ExtensionFieldBinaryInfo');
goog.module.declareLegacyNamespace();

const ExtensionFieldInfo = goog.require('jspb.ExtensionFieldInfo');
const BinaryReader = goog.requireType('jspb.BinaryReader');
const BinaryWriter = goog.requireType('jspb.BinaryWriter');

/**
 * Stores binary-related information for a single extension field.
 * @param {!ExtensionFieldInfo<T>} fieldInfo
 * @param {function(this:BinaryReader,number,?,?)} binaryReaderFn
 * @param {function(this:BinaryWriter,number,?)
 *        |function(this:BinaryWriter,number,?,?,?,?,?)} binaryWriterFn
 * @param {function(?,?)=} opt_binaryMessageSerializeFn
 * @param {function(?,?)=} opt_binaryMessageDeserializeFn
 * @param {boolean=} opt_isPacked
 * @constructor
 * @struct
 * @template T
 */
const ExtensionFieldBinaryInfo = function (
  fieldInfo, binaryReaderFn, binaryWriterFn, opt_binaryMessageSerializeFn,
  opt_binaryMessageDeserializeFn, opt_isPacked) {
  /** @const */
  this.fieldInfo = fieldInfo;
  /** @const */
  this.binaryReaderFn = binaryReaderFn;
  /** @const */
  this.binaryWriterFn = binaryWriterFn;
  /** @const */
  this.binaryMessageSerializeFn = opt_binaryMessageSerializeFn;
  /** @const */
  this.binaryMessageDeserializeFn = opt_binaryMessageDeserializeFn;
  /** @const */
  this.isPacked = opt_isPacked;
};

exports = ExtensionFieldBinaryInfo;
