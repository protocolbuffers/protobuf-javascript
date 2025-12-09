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
 * @fileoverview Definition of jspb.Message.
 *
 * @suppress {missingRequire} TODO(b/152540451): this shouldn't be needed
 * @author mwr@google.com (Mark Rawling)
 */

goog.module('jspb.Message');
goog.module.declareLegacyNamespace();

const googArray = goog.require('goog.array');
const googCryptBase64 = goog.require('goog.crypt.base64');

const asserts = goog.require('jspb.asserts');
const { BinaryReader } = goog.require('jspb.binary.reader');
const Map = goog.require('jspb.Map');
const ExtensionFieldInfo = goog.require('jspb.ExtensionFieldInfo');
const ExtensionFieldBinaryInfo = goog.require('jspb.ExtensionFieldBinaryInfo');


/**
 * Base class for all JsPb messages.
 *
 * Several common methods (toObject, serializeBinary, in particular) are not
 * defined on the prototype to encourage code patterns that minimize code bloat
 * due to otherwise unused code on all protos contained in the project.
 *
 * If you want to call these methods on a generic message, either
 * pass in your instance of method as a parameter:
 *     someFunction(instanceOfKnownProto,
 *                  KnownProtoClass.prototype.serializeBinary);
 * or use a lambda that knows the type:
 *     someFunction(()=>instanceOfKnownProto.serializeBinary());
 * or, if you don't care about code size, just suppress the
 *     WARNING - Property serializeBinary never defined on Message
 * and call it the intuitive way.
 *
 * @constructor
 * @struct
 */
const Message = function () { };


/**
 * @define {boolean} Whether to generate toObject methods for objects. Turn
 *     this off, if you do not want toObject to be ever used in your project.
 *     When turning off this flag, consider adding a conformance test that bans
 *     calling toObject. Enabling this will disable the JSCompiler's ability to
 *     dead code eliminate fields used in protocol buffers that are never used
 *     in an application.
 * @export
 */
Message.GENERATE_TO_OBJECT =
  goog.define('Message.GENERATE_TO_OBJECT', true);


/**
 * @define {boolean} Whether to generate fromObject methods for objects. Turn
 *     this off, if you do not want fromObject to be ever used in your project.
 *     When turning off this flag, consider adding a conformance test that bans
 *     calling fromObject. Enabling this might disable the JSCompiler's ability
 *     to dead code eliminate fields used in protocol buffers that are never
 *     used in an application.
 *     By default this is enabled for test code only.
 * @export
 */
Message.GENERATE_FROM_OBJECT = goog.define(
  'Message.GENERATE_FROM_OBJECT', !goog.DISALLOW_TEST_ONLY_CODE);


/**
 * @define {boolean} Whether to generate toString methods for objects. Turn
 *     this off if you do not use toString in your project and want to trim it
 *     from the compiled JS.
 */
Message.GENERATE_TO_STRING =
  goog.define('Message.GENERATE_TO_STRING', true);


/**
 * @define {boolean} Whether arrays passed to initialize() can be assumed to be
 *     local (e.g. not from another iframe) and thus safely classified with
 *     instanceof Array.
 */
Message.ASSUME_LOCAL_ARRAYS =
  goog.define('Message.ASSUME_LOCAL_ARRAYS', false);


// TODO(jakubvrana): Turn this off by default.
/**
 * @define {boolean} Disabling the serialization of empty trailing fields
 *     reduces the size of serialized protos. The price is an extra iteration of
 *     the proto before serialization. This is enabled by default to be
 *     backwards compatible. Projects are advised to turn this flag always off.
 * @private
 */
Message.SERIALIZE_EMPTY_TRAILING_FIELDS =
  goog.define('Message.SERIALIZE_EMPTY_TRAILING_FIELDS', true);


/**
 * Does this JavaScript environment support Uint8Aray typed arrays?
 * @type {boolean}
 * @private
 */
Message.SUPPORTS_UINT8ARRAY_ = (typeof Uint8Array == 'function');


/**
 * The internal data array.
 * @type {!Array}
 * @private
 */
Message.prototype.array;


/**
 * Wrappers are the constructed instances of message-type fields. They are built
 * on demand from the raw array data. Includes message fields, repeated message
 * fields and extension message fields. Indexed by field number.
 * @type {Object}
 * @private
 */
Message.prototype.wrappers_;


/**
 * The object that contains extension fields, if any. This is an object that
 * maps from a proto field number to the field's value.
 * @type {Object}
 * @private
 */
Message.prototype.extensionObject_;


/**
 * Non-extension fields with a field number at or above the pivot are
 * stored in the extension object (in addition to all extension fields).
 * @type {number}
 * @private
 */
Message.prototype.pivot_;


/**
 * The JsPb message_id of this proto.
 * @type {string|undefined} the message id or undefined if this message
 *     has no id.
 * @private
 */
Message.prototype.messageId_;


/**
 * Repeated fields that have been converted to their proper type. This is used
 * for numbers stored as strings (typically "NaN", "Infinity" and "-Infinity")
 * and for booleans stored as numbers (0 or 1).
 * @private {!Object<number,boolean>|undefined}
 */
Message.prototype.convertedPrimitiveFields_;

/**
 * Repeated fields numbers.
 * @protected {?Array<number>|undefined}
 */
Message.prototype.repeatedFields;



/**
 * Returns the JsPb message_id of this proto.
 * @return {string|undefined} the message id or undefined if this message
 *     has no id.
 * @export
 */
Message.prototype.getJsPbMessageId = function () {
  return this.messageId_;
};


/**
 * An offset applied to lookups into this.array to account for the presence or
 * absence of a messageId at position 0. For response messages, this will be 0.
 * Otherwise, it will be -1 so that the first array position is not wasted.
 * @type {number}
 * @private
 */
Message.prototype.arrayIndexOffset_;


/**
 * Returns the index into msg.array at which the proto field with tag number
 * fieldNumber will be located.
 * @param {!Message} msg Message for which we're calculating an index.
 * @param {number} fieldNumber The field number.
 * @return {number} The index.
 * @private
 */
Message.getIndex_ = function (msg, fieldNumber) {
  return fieldNumber + msg.arrayIndexOffset_;
};

// This is only here to ensure we are not back sliding on ES6 requirements for
// protos in g3.
Message.hiddenES6Property_ = class { };


/**
 * Returns the tag number based on the index in msg.array.
 * @param {!Message} msg Message for which we're calculating an index.
 * @param {number} index The tag number.
 * @return {number} The field number.
 * @private
 */
Message.getFieldNumber_ = function (msg, index) {
  return index - msg.arrayIndexOffset_;
};


/**
 * Initializes a JsPb Message.
 * @param {!Message} msg The JsPb proto to modify.
 * @param {Array|undefined} data An initial data array.
 * @param {string|number} messageId For response messages, the message id or ''
 *     if no message id is specified. For non-response messages, 0.
 * @param {number} suggestedPivot The field number at which to start putting
 *     fields into the extension object. This is only used if data does not
 *     contain an extension object already. -1 if no extension object is
 *     required for this message type.
 * @param {Array<number>} repeatedFields The message's repeated fields.
 * @param {Array<!Array<number>>=} opt_oneofFields The fields belonging to
 *     each of the message's oneof unions.
 * @export
 */
Message.initialize = function (
    msg, data, messageId, suggestedPivot, repeatedFields, opt_oneofFields) {
  msg.wrappers_ = null;
  if (!data) {
    data = messageId ? [messageId] : [];
  }
  msg.messageId_ = messageId ? String(messageId) : undefined;
  // If the messageId is 0, this message is not a response message, so we shift
  // array indices down by 1 so as not to waste the first position in the array,
  // which would otherwise go unused.
  msg.arrayIndexOffset_ = messageId === 0 ? -1 : 0;
  msg.array = data;
  Message.initPivotAndExtensionObject_(msg, suggestedPivot);
  msg.convertedPrimitiveFields_ = {};

  if (!Message.SERIALIZE_EMPTY_TRAILING_FIELDS) {
    // TODO(jakubvrana): This is same for all instances, move to prototype.
    // TODO(jakubvrana): There are indexOf calls on this in serialization,
    // consider switching to a set.
    msg.repeatedFields = repeatedFields;
  }

  if (repeatedFields) {
    for (var i = 0; i < repeatedFields.length; i++) {
      var fieldNumber = repeatedFields[i];
      if (fieldNumber < msg.pivot_) {
        var index = Message.getIndex_(msg, fieldNumber);
        msg.array[index] =
          msg.array[index] || Message.EMPTY_LIST_SENTINEL_;
      } else {
        Message.maybeInitEmptyExtensionObject_(msg);
        msg.extensionObject_[fieldNumber] = msg.extensionObject_[fieldNumber] ||
          Message.EMPTY_LIST_SENTINEL_;
      }
    }
  }

  if (opt_oneofFields && opt_oneofFields.length) {
    // Compute the oneof case for each union. This ensures only one value is
    // set in the union.
    for (var i = 0; i < opt_oneofFields.length; i++) {
      Message.computeOneofCase(msg, opt_oneofFields[i]);
    }
  }
};


/**
 * Used to mark empty repeated fields. Serializes to null when serialized
 * to JSON.
 * When reading a repeated field readers must check the return value against
 * this value and return and replace it with a new empty array if it is
 * present.
 * @private @const {!Object}
 */
Message.EMPTY_LIST_SENTINEL_ =
    goog.DEBUG && Object.freeze ? Object.freeze([]) : [];


/**
 * Returns true if the provided argument is an array.
 * @param {*} o The object to classify as array or not.
 * @return {boolean} True if the provided object is an array.
 * @private
 */
Message.isArray_ = function (o) {
  return Message.ASSUME_LOCAL_ARRAYS ? o instanceof Array :
                                            Array.isArray(o);
};

/**
 * Returns true if the provided argument is an extension object.
 * @param {*} o The object to classify as array or not.
 * @return {boolean} True if the provided object is an extension object.
 * @private
 */
Message.isExtensionObject_ = function (o) {
  // Normal fields are never objects, so we can be sure that if we find an
  // object here, then it's the extension object. However, we must ensure that
  // the object is not an array, since arrays are valid field values (bytes
  // fields can also be array).
  // NOTE(lukestebbing): We avoid looking at .length to avoid a JIT bug
  // in Safari on iOS 8. See the description of CL/86511464 for details.
  return (
    o !== null && typeof o == 'object' && !Message.isArray_(o) &&
    !(Message.SUPPORTS_UINT8ARRAY_ && o instanceof Uint8Array));
};


/**
 * If the array contains an extension object in its last position, then the
 * object is kept in place and its position is used as the pivot.  If not,
 * decides the pivot of the message based on suggestedPivot without
 * materializing the extension object.
 *
 * @param {!Message} msg The JsPb proto to modify.
 * @param {number} suggestedPivot See description for initialize().
 * @private
 */
Message.initPivotAndExtensionObject_ = function (msg, suggestedPivot) {
  // There are 3 variants that need to be dealt with which are the
  // combination of whether there exists an extension object (EO) and
  // whether there is a suggested pivot (SP).
  //
  // EO,    ?    : pivot is the index of the EO
  // no-EO, no-SP: pivot is MAX_INT
  // no-EO, SP   : pivot is the max(lastindex + 1, SP)

  var msgLength = msg.array.length;
  var lastIndex = -1;
  if (msgLength) {
    lastIndex = msgLength - 1;
    var obj = msg.array[lastIndex];
    if (Message.isExtensionObject_(obj)) {
      msg.pivot_ = Message.getFieldNumber_(msg, lastIndex);
      msg.extensionObject_ = obj;
      return;
    }
  }

  if (suggestedPivot > -1) {
    // If a extension object is not present, set the pivot value as being
    // after the last value in the array to avoid overwriting values, etc.
    msg.pivot_ = Math.max(
      suggestedPivot, Message.getFieldNumber_(msg, lastIndex + 1));
    // Avoid changing the shape of the proto with an empty extension object by
    // deferring the materialization of the extension object until the first
    // time a field set into it (may be due to getting a repeated proto field
    // from it, in which case a new empty array is set into it at first).
    msg.extensionObject_ = null;
  } else {
    // suggestedPivot is -1, which means that we don't have an extension object
    // at all, in which case all fields are stored in the array.
    msg.pivot_ = Number.MAX_VALUE;
  }
};


/**
 * Creates an empty extensionObject_ if non exists.
 * @param {!Message} msg The JsPb proto to modify.
 * @private
 */
Message.maybeInitEmptyExtensionObject_ = function (msg) {
  var pivotIndex = Message.getIndex_(msg, msg.pivot_);
  if (!msg.array[pivotIndex]) {
    msg.extensionObject_ = msg.array[pivotIndex] = {};
  }
};


/**
 * Converts a JsPb repeated message field into an object list.
 * @param {!Array<T>} field The repeated message field to be
 *     converted.
 * @param {?function(boolean=): Object|
 *     function((boolean|undefined),T): Object} toObjectFn The toObject
 *     function for this field.  We need to pass this for effective dead code
 *     removal.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Array<Object>} An array of converted message objects.
 * @template T
 * @export
 */
Message.toObjectList = function (field, toObjectFn, opt_includeInstance) {
// Not using googArray.map in the generated code to keep it small.
  // And not using it here to avoid a function call.
  var result = [];
  for (var i = 0; i < field.length; i++) {
    result[i] = toObjectFn.call(field[i], opt_includeInstance, field[i]);
  }
  return result;
};


/**
 * Adds a proto's extension data to a Soy rendering object.
 * @param {!Message} proto The proto whose extensions to convert.
 * @param {!Object} obj The Soy object to add converted extension data to.
 * @param {!Object} extensions The proto class' registered extensions.
 * @param {function(this:?, ExtensionFieldInfo) : *} getExtensionFn
 *     The proto class' getExtension function. Passed for effective dead code
 *     removal.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @export
 */
Message.toObjectExtension = function (
    proto, obj, extensions, getExtensionFn, opt_includeInstance) {
  for (var fieldNumber in extensions) {
    var fieldInfo = extensions[fieldNumber];
    var value = getExtensionFn.call(proto, fieldInfo);
    if (value != null) {
      for (var name in fieldInfo.fieldName) {
        if (fieldInfo.fieldName.hasOwnProperty(name)) {
          break;  // the compiled field name
        }
      }
      if (!fieldInfo.toObjectFn) {
        obj[name] = value;
      } else {
        if (fieldInfo.isRepeated) {
          obj[name] = Message.toObjectList(
              /** @type {!Array<!Message>} */(value),
              fieldInfo.toObjectFn, opt_includeInstance);
        } else {
          obj[name] = fieldInfo.toObjectFn(
            opt_includeInstance, /** @type {!Message} */(value));
        }
      }
    }
  }
};


/**
 * Writes a proto's extension data to a binary-format output stream.
 * @param {!Message} proto The proto whose extensions to convert.
 * @param {*} writer The binary-format writer to write to.
 * @param {!Object} extensions The proto class' registered extensions.
 * @param {function(this:Message,!ExtensionFieldInfo) : *}
 *     getExtensionFn The proto class' getExtension function. Passed for
 *     effective dead code removal.
 * @export
 */
Message.serializeBinaryExtensions = function (
    proto, writer, extensions, getExtensionFn) {
  for (var fieldNumber in extensions) {
    var binaryFieldInfo = extensions[fieldNumber];
    var fieldInfo = binaryFieldInfo.fieldInfo;

    // The old codegen doesn't add the extra fields to ExtensionFieldInfo, so we
    // need to gracefully error-out here rather than produce a null dereference
    // below.
    if (!binaryFieldInfo.binaryWriterFn) {
      throw new Error(
          'Message extension present that was generated ' +
          'without binary serialization support');
    }
    var value = getExtensionFn.call(proto, fieldInfo);
    if (value != null) {
      if (fieldInfo.isMessageType()) {
        // If the message type of the extension was generated without binary
        // support, there may not be a binary message serializer function, and
        // we can't know when we codegen the extending message that the extended
        // message may require binary support, so we can *only* catch this error
        // here, at runtime (and this decoupled codegen is the whole point of
        // extensions!).
        if (binaryFieldInfo.binaryMessageSerializeFn) {
          binaryFieldInfo.binaryWriterFn.call(
              writer, fieldInfo.fieldIndex, value,
              binaryFieldInfo.binaryMessageSerializeFn);
        } else {
          throw new Error(
              'Message extension present holding submessage ' +
              'without binary support enabled, and message is ' +
              'being serialized to binary format');
        }
      } else {
        binaryFieldInfo.binaryWriterFn.call(
            writer, fieldInfo.fieldIndex, value);
      }
    }
  }
};


/**
 * Reads an extension field from the given reader and, if a valid extension,
 * sets the extension value.
 * @param {!Message} msg A jspb proto.
 * @param {!jspb.BinaryReader} reader
 * @param {!Object} extensions The extensions object.
 * @param {function(this:Message,!ExtensionFieldInfo)} getExtensionFn
 * @param {function(this:Message,!ExtensionFieldInfo, ?)}
 *     setExtensionFn
 * @export
 */
Message.readBinaryExtension = function (
    msg, reader, extensions, getExtensionFn, setExtensionFn) {
  var binaryFieldInfo = extensions[reader.getFieldNumber()];
  if (!binaryFieldInfo) {
    reader.skipField();
    return;
  }
  var fieldInfo = binaryFieldInfo.fieldInfo;
  if (!binaryFieldInfo.binaryReaderFn) {
    throw new Error(
        'Deserializing extension whose generated code does not ' +
        'support binary format');
  }

  var value;
  if (fieldInfo.isMessageType()) {
    value = new fieldInfo.ctor();
    binaryFieldInfo.binaryReaderFn.call(
        reader, value, binaryFieldInfo.binaryMessageDeserializeFn);
  } else {
    // All other types.
    if (fieldInfo.isRepeated && binaryFieldInfo.isPacked) {
      value = getExtensionFn.call(msg, fieldInfo) ?? [];
      binaryFieldInfo.binaryReaderFn.call(reader, value);
      setExtensionFn.call(msg, fieldInfo, value);
      return;
    } else {
      value = binaryFieldInfo.binaryReaderFn.call(reader);
    }
  }

  if (fieldInfo.isRepeated && !binaryFieldInfo.isPacked) {
    var currentList = getExtensionFn.call(msg, fieldInfo);
    if (!currentList) {
      setExtensionFn.call(msg, fieldInfo, [value]);
    } else {
      currentList.push(value);
    }
  } else {
    setExtensionFn.call(msg, fieldInfo, value);
  }
};


/**
 * Gets the value of a non-extension field.
 * @param {!Message} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @return {string|number|boolean|Uint8Array|Array|null|undefined}
 * The field's value.
 * @export
 */
Message.getField = function (msg, fieldNumber) {
  if (fieldNumber < msg.pivot_) {
    var index = Message.getIndex_(msg, fieldNumber);
    var val = msg.array[index];
    if (val === Message.EMPTY_LIST_SENTINEL_) {
      return msg.array[index] = [];
    }
    return val;
  } else {
    if (!msg.extensionObject_) {
      return undefined;
    }
    var val = msg.extensionObject_[fieldNumber];
    if (val === Message.EMPTY_LIST_SENTINEL_) {
      return msg.extensionObject_[fieldNumber] = [];
    }
    return val;
  }
};


/**
 * Gets the value of a non-extension repeated field.
 * @param {!Message} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @return {!Array}
 * The field's value.
 * @export
 */
Message.getRepeatedField = function (msg, fieldNumber) {
  return /** @type {!Array} */ (Message.getField(msg, fieldNumber));
};


/**
 * Gets the value of an optional float or double field.
 * @param {!Message} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @return {?number|undefined} The field's value.
 * @export
 */
Message.getOptionalFloatingPointField = function (msg, fieldNumber) {
  var value = Message.getField(msg, fieldNumber);
  // Converts "NaN", "Infinity" and "-Infinity" to their corresponding numbers.
  return value == null ? value : +value;
};


/**
 * Gets the value of an optional boolean field.
 * @param {!Message} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @return {?boolean|undefined} The field's value.
 * @export
 */
Message.getBooleanField = function (msg, fieldNumber) {
  var value = Message.getField(msg, fieldNumber);
  // TODO(b/122673075): always return null when the value is null-ish.
  return value == null ? (value) : !!value;
};


/**
 * Gets the value of a repeated float or double field.
 * @param {!Message} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @return {!Array<number>} The field's value.
 * @export
 */
Message.getRepeatedFloatingPointField = function (msg, fieldNumber) {
  var values = Message.getRepeatedField(msg, fieldNumber);
  if (!msg.convertedPrimitiveFields_) {
    msg.convertedPrimitiveFields_ = {};
  }
  if (!msg.convertedPrimitiveFields_[fieldNumber]) {
    for (var i = 0; i < values.length; i++) {
      // Converts "NaN", "Infinity" and "-Infinity" to their corresponding
      // numbers.
      values[i] = +values[i];
    }
    msg.convertedPrimitiveFields_[fieldNumber] = true;
  }
  return /** @type {!Array<number>} */ (values);
};

/**
 * Gets the value of a repeated boolean field.
 * @param {!Message} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @return {!Array<boolean>} The field's value.
 * @export
 */
Message.getRepeatedBooleanField = function (msg, fieldNumber) {
  var values = Message.getRepeatedField(msg, fieldNumber);
  if (!msg.convertedPrimitiveFields_) {
    msg.convertedPrimitiveFields_ = {};
  }
  if (!msg.convertedPrimitiveFields_[fieldNumber]) {
    for (var i = 0; i < values.length; i++) {
      // Converts 0 and 1 to their corresponding booleans.
      values[i] = !!values[i];
    }
    msg.convertedPrimitiveFields_[fieldNumber] = true;
  }
  return /** @type {!Array<boolean>} */ (values);
};


/**
 * Coerce a 'bytes' field to a base 64 string.
 * @param {string|Uint8Array|null} value
 * @return {?string} The field's coerced value.
 * @export
 */
Message.bytesAsB64 = function (value) {
  if (value == null || typeof value === 'string') {
    return value;
  }
  if (Message.SUPPORTS_UINT8ARRAY_ && value instanceof Uint8Array) {
    return googCryptBase64.encodeByteArray(value);
  }
  asserts.fail('Cannot coerce to b64 string: ' + goog.typeOf(value));
  return null;
};


/**
 * Coerce a 'bytes' field to a Uint8Array byte buffer.
 * Note that Uint8Array is not supported on IE versions before 10 nor on Opera
 * Mini. @see http://caniuse.com/Uint8Array
 * @param {string|Uint8Array|null} value
 * @return {?Uint8Array} The field's coerced value.
 * @export
 */
Message.bytesAsU8 = function (value) {
  if (value == null || value instanceof Uint8Array) {
    return value;
  }
  if (typeof value === 'string') {
    return googCryptBase64.decodeStringToUint8Array(value);
  }
  asserts.fail('Cannot coerce to Uint8Array: ' + goog.typeOf(value));
  return null;
};


/**
 * Coerce a repeated 'bytes' field to an array of base 64 strings.
 * Note: the returned array should be treated as immutable.
 * @param {!Array<string>|!Array<!Uint8Array>} value
 * @return {!Array<string?>} The field's coerced value.
 * @export
 */
Message.bytesListAsB64 = function (value) {
  Message.assertConsistentTypes_(value);
  if (!value.length || typeof value[0] === 'string') {
    return /** @type {!Array<string>} */ (value);
  }
  return googArray.map(value, Message.bytesAsB64);
};


/**
 * Coerce a repeated 'bytes' field to an array of Uint8Array byte buffers.
 * Note: the returned array should be treated as immutable.
 * Note that Uint8Array is not supported on IE versions before 10 nor on Opera
 * Mini. @see http://caniuse.com/Uint8Array
 * @param {!Array<string>|!Array<!Uint8Array>} value
 * @return {!Array<Uint8Array?>} The field's coerced value.
 * @export
 */
Message.bytesListAsU8 = function (value) {
  Message.assertConsistentTypes_(value);
  if (!value.length || value[0] instanceof Uint8Array) {
    return /** @type {!Array<!Uint8Array>} */ (value);
  }
  return googArray.map(value, Message.bytesAsU8);
};


/**
 * Asserts that all elements of an array are of the same type.
 * @param {Array?} array The array to test.
 * @private
 */
Message.assertConsistentTypes_ = function (array) {
  if (goog.DEBUG && array && array.length > 1) {
    var expected = goog.typeOf(array[0]);
    googArray.forEach(array, function (e) {
      if (goog.typeOf(e) != expected) {
        asserts.fail(
            'Inconsistent type in JSPB repeated field array. ' +
            'Got ' + goog.typeOf(e) + ' expected ' + expected);
      }
    });
  }
};


/**
 * Gets the value of a non-extension primitive field, with proto3 (non-nullable
 * primitives) semantics. Returns `defaultValue` if the field is not otherwise
 * set.
 * @template T
 * @param {!Message} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {T} defaultValue The default value.
 * @return {T} The field's value.
 * @export
 */
Message.getFieldWithDefault = function (msg, fieldNumber, defaultValue) {
  var value = Message.getField(msg, fieldNumber);
  if (value == null) {
    return defaultValue;
  } else {
    return value;
  }
};


/**
 * Gets the value of a boolean field, with proto3 (non-nullable primitives)
 * semantics. Returns `defaultValue` if the field is not otherwise set.
 * @template T
 * @param {!Message} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {boolean} defaultValue The default value.
 * @return {boolean} The field's value.
 * @export
 */
Message.getBooleanFieldWithDefault = function (
    msg, fieldNumber, defaultValue) {
  var value = Message.getBooleanField(msg, fieldNumber);
  if (value == null) {
    return defaultValue;
  } else {
    return value;
  }
};


/**
 * Gets the value of a floating point field, with proto3 (non-nullable
 * primitives) semantics. Returns `defaultValue` if the field is not otherwise
 * set.
 * @template T
 * @param {!Message} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {number} defaultValue The default value.
 * @return {number} The field's value.
 * @export
 */
Message.getFloatingPointFieldWithDefault = function (
    msg, fieldNumber, defaultValue) {
  var value = Message.getOptionalFloatingPointField(msg, fieldNumber);
  if (value == null) {
    return defaultValue;
  } else {
    return value;
  }
};


/**
 * Alias for getFieldWithDefault used by older generated code.
 * @template T
 * @param {!Message} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {T} defaultValue The default value.
 * @return {T} The field's value.
 * @export
 */
Message.getFieldProto3 = Message.getFieldWithDefault;


/**
 * Gets the value of a map field, lazily creating the map container if
 * necessary.
 *
 * This should only be called from generated code, because it requires knowledge
 * of serialization/parsing callbacks (which are required by the map at
 * construction time, and the map may be constructed here).
 *
 * @template K, V
 * @param {!Message} msg
 * @param {number} fieldNumber
 * @param {boolean|undefined} noLazyCreate
 * @param {?=} opt_valueCtor
 * @return {!Map<K, V>|undefined}
 * @export
 */
Message.getMapField = function (
    msg, fieldNumber, noLazyCreate, opt_valueCtor) {
  if (!msg.wrappers_) {
    msg.wrappers_ = {};
  }
  // If we already have a map in the map wrappers, return that.
  if (fieldNumber in msg.wrappers_) {
    return msg.wrappers_[fieldNumber];
  }
  var arr = Message.getField(msg, fieldNumber);
  // Wrap the underlying elements array with a Map.
  if (!arr) {
    if (noLazyCreate) {
      return undefined;
    }
    arr = [];
    Message.setField(msg, fieldNumber, arr);
  }
  return msg.wrappers_[fieldNumber] = new Map(
             /** @type {!Array<!Array<!Object>>} */ (arr), opt_valueCtor);
};


/**
 * Sets the value of a non-extension field.
 * @param {T} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {string|number|boolean|Uint8Array|Array|undefined} value New value
 * @return {T} return msg
 * @template T
 * @export
 */
Message.setField = function (msg, fieldNumber, value) {
  // TODO(b/35241823): replace this with a bounded generic when available
  asserts.assertInstanceof(msg, Message);
  if (fieldNumber < msg.pivot_) {
    msg.array[Message.getIndex_(msg, fieldNumber)] = value;
  } else {
    Message.maybeInitEmptyExtensionObject_(msg);
    msg.extensionObject_[fieldNumber] = value;
  }
  return msg;
};


/**
 * Sets the value of a non-extension integer field of a proto3
 * @param {T} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {number} value New value
 * @return {T} return msg
 * @template T
 * @export
 */
Message.setProto3IntField = function (msg, fieldNumber, value) {
  return Message.setFieldIgnoringDefault_(msg, fieldNumber, value, 0);
};


/**
 * Sets the value of a non-extension floating point field of a proto3
 * @param {T} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {number} value New value
 * @return {T} return msg
 * @template T
 * @export
 */
Message.setProto3FloatField = function (msg, fieldNumber, value) {
  return Message.setFieldIgnoringDefault_(msg, fieldNumber, value, 0.0);
};


/**
 * Sets the value of a non-extension boolean field of a proto3
 * @param {T} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {boolean} value New value
 * @return {T} return msg
 * @template T
 * @export
 */
Message.setProto3BooleanField = function (msg, fieldNumber, value) {
  return Message.setFieldIgnoringDefault_(msg, fieldNumber, value, false);
};


/**
 * Sets the value of a non-extension String field of a proto3
 * @param {T} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {string} value New value
 * @return {T} return msg
 * @template T
 * @export
 */
Message.setProto3StringField = function (msg, fieldNumber, value) {
  return Message.setFieldIgnoringDefault_(msg, fieldNumber, value, '');
};


/**
 * Sets the value of a non-extension Bytes field of a proto3
 * @param {T} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {!Uint8Array|string} value New value
 * @return {T} return msg
 * @template T
 * @export
 */
Message.setProto3BytesField = function (msg, fieldNumber, value) {
  return Message.setFieldIgnoringDefault_(msg, fieldNumber, value, '');
};


/**
 * Sets the value of a non-extension enum field of a proto3
 * @param {T} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {number} value New value
 * @return {T} return msg
 * @template T
 * @export
 */
Message.setProto3EnumField = function (msg, fieldNumber, value) {
  return Message.setFieldIgnoringDefault_(msg, fieldNumber, value, 0);
};


/**
 * Sets the value of a non-extension int field of a proto3 that has jstype set
 * to String.
 * @param {T} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {string} value New value
 * @return {T} return msg
 * @template T
 * @export
 */
Message.setProto3StringIntField = function (msg, fieldNumber, value) {
  return Message.setFieldIgnoringDefault_(msg, fieldNumber, value, '0');
};

/**
 * Sets the value of a non-extension primitive field, with proto3 (non-nullable
 * primitives) semantics of ignoring values that are equal to the type's
 * default.
 * @param {T} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {!Uint8Array|string|number|boolean|undefined} value New value
 * @param {!Uint8Array|string|number|boolean} defaultValue The default value.
 * @return {T} return msg
 * @template T
 * @private
 */
Message.setFieldIgnoringDefault_ = function (
    msg, fieldNumber, value, defaultValue) {
  // TODO(b/35241823): replace this with a bounded generic when available
  asserts.assertInstanceof(msg, Message);
  if (value !== defaultValue) {
    Message.setField(msg, fieldNumber, value);
  } else if (fieldNumber < msg.pivot_) {
    msg.array[Message.getIndex_(msg, fieldNumber)] = null;
  } else {
    Message.maybeInitEmptyExtensionObject_(msg);
    delete msg.extensionObject_[fieldNumber];
  }
  return msg;
};


/**
 * Adds a value to a repeated, primitive field.
 * @param {T} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {string|number|boolean|!Uint8Array} value New value
 * @param {number=} opt_index Index where to put new value.
 * @return {T} return msg
 * @template T
 * @export
 */
Message.addToRepeatedField = function (msg, fieldNumber, value, opt_index) {
  // TODO(b/35241823): replace this with a bounded generic when available
  asserts.assertInstanceof(msg, Message);
  var arr = Message.getRepeatedField(msg, fieldNumber);
  if (opt_index != undefined) {
    arr.splice(opt_index, 0, value);
  } else {
    arr.push(value);
  }
  return msg;
};


/**
 * Sets the value of a field in a oneof union and clears all other fields in
 * the union.
 * @param {T} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {!Array<number>} oneof The fields belonging to the union.
 * @param {string|number|boolean|Uint8Array|Array|undefined} value New value
 * @return {T} return msg
 * @template T
 * @export
 */
Message.setOneofField = function (msg, fieldNumber, oneof, value) {
  // TODO(b/35241823): replace this with a bounded generic when available
  asserts.assertInstanceof(msg, Message);
  var currentCase = Message.computeOneofCase(msg, oneof);
  if (currentCase && currentCase !== fieldNumber && value !== undefined) {
    if (msg.wrappers_ && currentCase in msg.wrappers_) {
      msg.wrappers_[currentCase] = undefined;
    }
    Message.setField(msg, currentCase, undefined);
  }
  return Message.setField(msg, fieldNumber, value);
};


/**
 * Computes the selection in a oneof group for the given message, ensuring
 * only one field is set in the process.
 *
 * According to the protobuf language guide (
 * https://protobuf.dev/programming-guides/proto2/#oneof), "if the
 * parser encounters multiple members of the same oneof on the wire, only the
 * last member seen is used in the parsed message." Since JSPB serializes
 * messages to a JSON array, the "last member seen" will always be the field
 * with the greatest field number (directly corresponding to the greatest
 * array index).
 *
 * @param {!Message} msg A jspb proto.
 * @param {!Array<number>} oneof The field numbers belonging to the union.
 * @return {number} The field number currently set in the union, or 0 if none.
 * @export
 */
Message.computeOneofCase = function (msg, oneof) {
  var oneofField;
  var oneofValue;

  for (var i = 0; i < oneof.length; i++) {
    var fieldNumber = oneof[i];
    var value = Message.getField(msg, fieldNumber);
    if (value != null) {
      oneofField = fieldNumber;
      oneofValue = value;
      Message.setField(msg, fieldNumber, undefined);
    }
  }

  if (oneofField) {
    // NB: We know the value is unique, so we can call Message.setField
    // directly instead of jpsb.Message.setOneofField. Also, setOneofField
    // calls this function.
    Message.setField(msg, oneofField, oneofValue);
    return oneofField;
  }

  return 0;
};


/**
 * Gets and wraps a proto field on access.
 * @param {!Message} msg A jspb proto.
 * @param {function(new:Message, Array)} ctor Constructor for the field.
 * @param {number} fieldNumber The field number.
 * @param {number=} opt_required True (1) if this is a required field.
 * @return {Message} The field as a jspb proto.
 * @export
 */
Message.getWrapperField = function (msg, ctor, fieldNumber, opt_required) {
  // TODO(mwr): Consider copying data and/or arrays.
  if (!msg.wrappers_) {
    msg.wrappers_ = {};
  }
  if (!msg.wrappers_[fieldNumber]) {
    var data = /** @type {Array} */ (Message.getField(msg, fieldNumber));
    if (opt_required || data) {
      // TODO(mwr): Remove existence test for always valid default protos.
      msg.wrappers_[fieldNumber] = new ctor(data);
    }
  }
  return /** @type {Message} */ (msg.wrappers_[fieldNumber]);
};


/**
 * Gets and wraps a repeated proto field on access.
 * @param {!Message} msg A jspb proto.
 * @param {function(new:Message, Array)} ctor Constructor for the field.
 * @param {number} fieldNumber The field number.
 * @return {!Array<!Message>} The repeated field as an array of protos.
 * @export
 */
Message.getRepeatedWrapperField = function (msg, ctor, fieldNumber) {
  Message.wrapRepeatedField_(msg, ctor, fieldNumber);
  var val = msg.wrappers_[fieldNumber];
  if (val == Message.EMPTY_LIST_SENTINEL_) {
    val = msg.wrappers_[fieldNumber] = [];
  }
  return /** @type {!Array<!Message>} */ (val);
};


/**
 * Wraps underlying array into proto message representation if it wasn't done
 * before.
 * @param {!Message} msg A jspb proto.
 * @param {function(new:Message, ?Array)} ctor Constructor for the field.
 * @param {number} fieldNumber The field number.
 * @private
 */
Message.wrapRepeatedField_ = function (msg, ctor, fieldNumber) {
  if (!msg.wrappers_) {
    msg.wrappers_ = {};
  }
  if (!msg.wrappers_[fieldNumber]) {
    var data = Message.getRepeatedField(msg, fieldNumber);
    for (var wrappers = [], i = 0; i < data.length; i++) {
      wrappers[i] = new ctor(data[i]);
    }
    msg.wrappers_[fieldNumber] = wrappers;
  }
};


/**
 * Sets a proto field and syncs it to the backing array.
 * @param {T} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {?Message|?Map|undefined} value A new value for this proto
 * field.
 * @return {T} the msg
 * @template T
 * @export
 */
Message.setWrapperField = function (msg, fieldNumber, value) {
  // TODO(b/35241823): replace this with a bounded generic when available
  asserts.assertInstanceof(msg, Message);
  if (!msg.wrappers_) {
    msg.wrappers_ = {};
  }
  var data = value ? value.toArray() : value;
  msg.wrappers_[fieldNumber] = value;
  return Message.setField(msg, fieldNumber, data);
};



/**
 * Sets a proto field in a oneof union and syncs it to the backing array.
 * @param {T} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {!Array<number>} oneof The fields belonging to the union.
 * @param {Message|undefined} value A new value for this proto field.
 * @return {T} the msg
 * @template T
 * @export
 */
Message.setOneofWrapperField = function (msg, fieldNumber, oneof, value) {
  // TODO(b/35241823): replace this with a bounded generic when available
  asserts.assertInstanceof(msg, Message);
  if (!msg.wrappers_) {
    msg.wrappers_ = {};
  }
  var data = value ? value.toArray() : value;
  msg.wrappers_[fieldNumber] = value;
  return Message.setOneofField(msg, fieldNumber, oneof, data);
};


/**
 * Sets a repeated proto field and syncs it to the backing array.
 * @param {T} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {Array<!Message>|undefined} value An array of protos.
 * @return {T} the msg
 * @template T
 * @export
 */
Message.setRepeatedWrapperField = function (msg, fieldNumber, value) {
  // TODO(b/35241823): replace this with a bounded generic when available
  asserts.assertInstanceof(msg, Message);
  if (!msg.wrappers_) {
    msg.wrappers_ = {};
  }
  value = value || [];
  for (var data = [], i = 0; i < value.length; i++) {
    data[i] = value[i].toArray();
  }
  msg.wrappers_[fieldNumber] = value;
  return Message.setField(msg, fieldNumber, data);
};


/**
 * Add a message to a repeated proto field.
 * @param {!Message} msg A jspb proto.
 * @param {number} fieldNumber The field number.
 * @param {T_CHILD|undefined} value Proto that will be added to the
 *     repeated field.
 * @param {function(new:T_CHILD, ?Array=)} ctor The constructor of the
 *     message type.
 * @param {number|undefined} index Index at which to insert the value.
 * @return {T_CHILD_NOT_UNDEFINED} proto that was inserted to the repeated field
 * @template MessageType
 * Use go/closure-ttl to declare a non-undefined version of T_CHILD. Replace the
 * undefined in blah|undefined with none. This is necessary because the compiler
 * will infer T_CHILD to be |undefined.
 * @template T_CHILD
 * @template T_CHILD_NOT_UNDEFINED :=
 *     cond(isUnknown(T_CHILD), unknown(),
 *       mapunion(T_CHILD, (X) =>
 *         cond(eq(X, 'undefined'), none(), X)))
 * =:
 * @export
 */
Message.addToRepeatedWrapperField = function (
    msg, fieldNumber, value, ctor, index) {
  Message.wrapRepeatedField_(msg, ctor, fieldNumber);
  var wrapperArray = msg.wrappers_[fieldNumber];
  if (!wrapperArray) {
    wrapperArray = msg.wrappers_[fieldNumber] = [];
  }
  var insertedValue = value ? value : new ctor();
  var array = Message.getRepeatedField(msg, fieldNumber);
  if (index != undefined) {
    wrapperArray.splice(index, 0, insertedValue);
    array.splice(index, 0, insertedValue.toArray());
  } else {
    wrapperArray.push(insertedValue);
    array.push(insertedValue.toArray());
  }
  return insertedValue;
};


/**
 * Converts a JsPb repeated message field into a map. The map will contain
 * protos unless an optional toObject function is given, in which case it will
 * contain objects suitable for Soy rendering.
 * @param {!Array<T>} field The repeated message field to be
 *     converted.
 * @param {function() : string?} mapKeyGetterFn The function to get the key of
 *     the map.
 * @param {?function(boolean=): Object|
 *     function((boolean|undefined),T): Object} opt_toObjectFn The
 *     toObject function for this field. We need to pass this for effective
 *     dead code removal.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object<string, Object>} A map of proto or Soy objects.
 * @template T
 * @export
 */
Message.toMap = function (
    field, mapKeyGetterFn, opt_toObjectFn, opt_includeInstance) {
  var result = {};
  for (var i = 0; i < field.length; i++) {
    result[mapKeyGetterFn.call(field[i])] = opt_toObjectFn ?
        opt_toObjectFn.call(
            field[i], opt_includeInstance,
            /** @type {!Message} */(field[i])) :
        field[i];
  }
  return result;
};


/**
 * Syncs all map fields' contents back to their underlying arrays.
 * @private
 */
Message.prototype.syncMapFields_ = function () {
  // This iterates over submessage, map, and repeated fields, which is intended.
  // Submessages can contain maps which also need to be synced.
  //
  // There is a lot of opportunity for optimization here.  For example we could
  // statically determine that some messages have no submessages with maps and
  // optimize this method away for those just by generating one extra static
  // boolean per message type.
  if (this.wrappers_) {
    for (var fieldNumber in this.wrappers_) {
      var val = this.wrappers_[fieldNumber];
      if (Array.isArray(val)) {
        for (var i = 0; i < val.length; i++) {
          if (val[i]) {
            val[i].toArray();
          }
        }
      } else {
        // Works for submessages and maps.
        if (val) {
          val.toArray();
        }
      }
    }
  }
};


/**
 * Returns the internal array of this proto.
 * <p>Note: If you use this array to construct a second proto, the content
 * would then be partially shared between the two protos.
 * @return {!Array} The proto represented as an array.
 * @export
 */
Message.prototype.toArray = function () {
  this.syncMapFields_();
  return this.array;
};



if (Message.GENERATE_TO_STRING) {
  /**
   * Creates a string representation of the internal data array of this proto.
   * <p>NOTE: This string is *not* suitable for use in server requests.
   * @return {string} A string representation of this proto.
   * @override
   * @export
   */
  Message.prototype.toString = function () {
    this.syncMapFields_();
    return this.array.toString();
  };
}

/**
 * Gets the value of the extension field from the extended object.
 * @param {ExtensionFieldInfo<T>} fieldInfo Specifies the field to get.
 * @return {T} The value of the field.
 * @template T
 * @export
 */
Message.prototype.getExtension = function (fieldInfo) {
  if (!this.extensionObject_) {
    return undefined;
  }
  if (!this.wrappers_) {
    this.wrappers_ = {};
  }
  var fieldNumber = fieldInfo.fieldIndex;
  if (fieldInfo.isRepeated) {
    if (fieldInfo.isMessageType()) {
      if (!this.wrappers_[fieldNumber]) {
        this.wrappers_[fieldNumber] = googArray.map(
            this.extensionObject_[fieldNumber] || [], function(arr) {
              return new fieldInfo.ctor(arr);
            });
      }
      return this.wrappers_[fieldNumber];
    } else {
      return this.extensionObject_[fieldNumber];
    }
  } else {
    if (fieldInfo.isMessageType()) {
      if (!this.wrappers_[fieldNumber] && this.extensionObject_[fieldNumber]) {
        this.wrappers_[fieldNumber] = new fieldInfo.ctor(
            /** @type {Array|undefined} */ (
                this.extensionObject_[fieldNumber]));
      }
      return this.wrappers_[fieldNumber];
    } else {
      return this.extensionObject_[fieldNumber];
    }
  }
};


/**
 * Sets the value of the extension field in the extended object.
 * @param {ExtensionFieldInfo} fieldInfo Specifies the field to set.
 * @param {Message|string|Uint8Array|number|boolean|Array?} value The value
 *     to set.
 * @return {THIS} For chaining
 * @this {THIS}
 * @template THIS
 * @export
 */
Message.prototype.setExtension = function (fieldInfo, value) {
  // Cast self, since the inferred THIS is unknown inside the function body.
  // https://github.com/google/closure-compiler/issues/1411#issuecomment-232442220
  var self = /** @type {!Message} */ (this);
  if (!self.wrappers_) {
    self.wrappers_ = {};
  }
  Message.maybeInitEmptyExtensionObject_(self);
  var fieldNumber = fieldInfo.fieldIndex;
  if (fieldInfo.isRepeated) {
    value = value || [];
    if (fieldInfo.isMessageType()) {
      self.wrappers_[fieldNumber] = value;
      self.extensionObject_[fieldNumber] = googArray.map(
          /** @type {!Array<!Message>} */(value), function (msg) {
            return msg.toArray();
          });
    } else {
      self.extensionObject_[fieldNumber] = value;
    }
  } else {
    if (fieldInfo.isMessageType()) {
      self.wrappers_[fieldNumber] = value;
      self.extensionObject_[fieldNumber] =
        value ? /** @type {!Message} */ (value).toArray() : value;
    } else {
      self.extensionObject_[fieldNumber] = value;
    }
  }
  return self;
};


/**
 * Creates a difference object between two messages.
 *
 * The result will contain the top-level fields of m2 that differ from those of
 * m1 at any level of nesting. No data is cloned, the result object will
 * share its top-level elements with m2 (but not with m1).
 *
 * Note that repeated fields should not have null/undefined elements, but if
 * they do, this operation will treat repeated fields of different length as
 * the same if the only difference between them is due to trailing
 * null/undefined values.
 *
 * @param {!Message} m1 The first message object.
 * @param {!Message} m2 The second message object.
 * @return {!Message} The difference returned as a proto message.
 *     Note that the returned message may be missing required fields. This is
 *     currently tolerated in Js, but would cause an error if you tried to
 *     send such a proto to the server. You can access the raw difference
 *     array with result.toArray().
 * @throws {Error} If the messages are responses with different types.
 * @export
 */
Message.difference = function (m1, m2) {
  if (!(m1 instanceof m2.constructor)) {
    throw new Error('Messages have different types.');
  }
  var arr1 = m1.toArray();
  var arr2 = m2.toArray();
  var res = [];
  var start = 0;
  var length = arr1.length > arr2.length ? arr1.length : arr2.length;
  if (m1.getJsPbMessageId()) {
    res[0] = m1.getJsPbMessageId();
    start = 1;
  }
  for (var i = start; i < length; i++) {
    if (!Message.compareFields(arr1[i], arr2[i])) {
      res[i] = arr2[i];
    }
  }
  return new m1.constructor(res);
};


/**
 * Tests whether two messages are equal.
 * @param {Message|undefined} m1 The first message object.
 * @param {Message|undefined} m2 The second message object.
 * @return {boolean} true if both messages are null/undefined, or if both are
 *     of the same type and have the same field values.
 * @export
 */
Message.equals = function (m1, m2) {
  return m1 == m2 ||
      (!!(m1 && m2) && (m1 instanceof m2.constructor) &&
      Message.compareFields(m1.toArray(), m2.toArray()));
};


/**
 * Compares two message extension fields recursively.
 * @param {!Object} extension1 The first field.
 * @param {!Object} extension2 The second field.
 * @return {boolean} true if the extensions are null/undefined, or otherwise
 *     equal.
 * @export
 */
Message.compareExtensions = function (extension1, extension2) {
  extension1 = extension1 || {};
  extension2 = extension2 || {};

  var keys = {};
  for (var name in extension1) {
    keys[name] = 0;
  }
  for (var name in extension2) {
    keys[name] = 0;
  }
  for (name in keys) {
    if (!Message.compareFields(extension1[name], extension2[name])) {
      return false;
    }
  }
  return true;
};


/**
 * Compares two message fields recursively.
 * @param {*} field1 The first field.
 * @param {*} field2 The second field.
 * @return {boolean} true if the fields are null/undefined, or otherwise equal.
 * @export
 */
Message.compareFields = function (field1, field2) {
  // If the fields are trivially equal, they're equal.
  if (field1 == field2) return true;

  if (!goog.isObject(field1) || !goog.isObject(field2)) {
    // NaN != NaN so we cover this case.
    if ((typeof field1 === 'number' && isNaN(field1)) ||
        (typeof field2 === 'number' && isNaN(field2))) {
      // One of the fields might be a string 'NaN'.
      return String(field1) == String(field2);
    }
    // If the fields aren't trivially equal and one of them isn't an object,
    // they can't possibly be equal.
    return false;
  }

  // We have two objects. If they're different types, they're not equal.
  field1 = /** @type {!Object} */ (field1);
  field2 = /** @type {!Object} */ (field2);
  if (field1.constructor != field2.constructor) return false;

  // If both are Uint8Arrays, compare them element-by-element.
  if (Message.SUPPORTS_UINT8ARRAY_ && field1.constructor === Uint8Array) {
    var bytes1 = /** @type {!Uint8Array} */ (field1);
    var bytes2 = /** @type {!Uint8Array} */ (field2);
    if (bytes1.length != bytes2.length) return false;
    for (var i = 0; i < bytes1.length; i++) {
      if (bytes1[i] != bytes2[i]) return false;
    }
    return true;
  }

  // If they're both Arrays, compare them element by element except for the
  // optional extension objects at the end, which we compare separately.
  if (field1.constructor === Array) {
    var typedField1 = /** @type {!Array<?>} */ (field1);
    var typedField2 = /** @type {!Array<?>} */ (field2);
    var extension1 = undefined;
    var extension2 = undefined;

    var length = Math.max(typedField1.length, typedField2.length);
    for (var i = 0; i < length; i++) {
      var val1 = typedField1[i];
      var val2 = typedField2[i];

      if (val1 && (val1.constructor == Object)) {
        asserts.assert(extension1 === undefined);
        asserts.assert(i === typedField1.length - 1);
        extension1 = val1;
        val1 = undefined;
      }

      if (val2 && (val2.constructor == Object)) {
        asserts.assert(extension2 === undefined);
        asserts.assert(i === typedField2.length - 1);
        extension2 = val2;
        val2 = undefined;
      }

      if (!Message.compareFields(val1, val2)) {
        return false;
      }
    }

    if (extension1 || extension2) {
      extension1 = extension1 || {};
      extension2 = extension2 || {};
      return Message.compareExtensions(extension1, extension2);
    }

    return true;
  }

  // If they're both plain Objects (i.e. extensions), compare them as
  // extensions.
  if (field1.constructor === Object) {
    return Message.compareExtensions(field1, field2);
  }

  throw new Error('Invalid type in JSPB array');
};


/**
 * Templated, type-safe cloneMessage definition.
 * @return {THIS}
 * @this {THIS}
 * @template THIS
 * @export
 */
Message.prototype.cloneMessage = function () {
  return Message.cloneMessage(/** @type {!Message} */(this));
};

/**
 * Alias clone to cloneMessage. goog.object.unsafeClone uses clone to
 * efficiently copy objects. Without this alias, copying jspb messages comes
 * with a large performance penalty.
 * @return {THIS}
 * @this {THIS}
 * @template THIS
 * @export
 */
Message.prototype.clone = function () {
  return Message.cloneMessage(/** @type {!Message} */(this));
};

/**
 * Static clone function. NOTE: A type-safe method called "cloneMessage"
 * exists
 * on each generated JsPb class. Do not call this function directly.
 * @param {!Message} msg A message to clone.
 * @return {!Message} A deep clone of the given message.
 * @export
 */
Message.clone = function (msg) {
  // Although we could include the wrappers, we leave them out here.
  return Message.cloneMessage(msg);
};


/**
 * @param {!Message} msg A message to clone.
 * @return {!Message} A deep clone of the given message.
 * @protected
 */
Message.cloneMessage = function (msg) {
  // Although we could include the wrappers, we leave them out here.
  return new msg.constructor(Message.clone_(msg.toArray()));
};


/**
 * Takes 2 messages of the same type and copies the contents of the first
 * message into the second. After this the 2 messages will equals in terms of
 * value semantics but share no state. All data in the destination message will
 * be overridden.
 *
 * @param {MESSAGE} fromMessage Message that will be copied into toMessage.
 * @param {MESSAGE} toMessage Message which will receive a copy of fromMessage
 *     as its contents.
 * @template MESSAGE
 * @export
 */
Message.copyInto = function (fromMessage, toMessage) {
  asserts.assertInstanceof(fromMessage, Message);
  asserts.assertInstanceof(toMessage, Message);
  asserts.assert(
      fromMessage.constructor == toMessage.constructor,
      'Copy source and target message should have the same type.');

  var copyOfFrom = Message.clone(fromMessage);

  var to = toMessage.toArray();
  var from = copyOfFrom.toArray();

  // Empty destination in case it has more values at the end of the array.
  to.length = 0;
  // and then copy everything from the new to the existing message.
  for (var i = 0; i < from.length; i++) {
    to[i] = from[i];
  }

  // This is either null or empty for a fresh copy.
  toMessage.wrappers_ = copyOfFrom.wrappers_;
  // Just a reference into the shared array.
  toMessage.extensionObject_ = copyOfFrom.extensionObject_;
};


/**
 * Helper for cloning an internal JsPb object.
 * @param {!Object} obj A JsPb object, eg, a field, to be cloned.
 * @return {!Object} A clone of the input object.
 * @private
 */
Message.clone_ = function (obj) {
  var o;
  if (Array.isArray(obj)) {
    // Allocate array of correct size.
    var clonedArray = new Array(obj.length);
    // Use array iteration where possible because it is faster than for-in.
    for (var i = 0; i < obj.length; i++) {
      o = obj[i];
      if (o != null) {
        // NOTE:redundant null check existing for NTI compatibility.
        // see b/70515949
        clonedArray[i] = (typeof o == 'object') ?
          Message.clone_(/** @type {!Object} */(asserts.assert(o))) :
            o;
      }
    }
    return clonedArray;
  }
  if (Message.SUPPORTS_UINT8ARRAY_ && obj instanceof Uint8Array) {
    return new Uint8Array(obj);
  }
  var clone = {};
  for (var key in obj) {
    o = obj[key];
    if (o != null) {
      // NOTE:redundant null check existing for NTI compatibility.
      // see b/70515949
      clone[key] = (typeof o == 'object') ?
        Message.clone_(/** @type {!Object} */(asserts.assert(o))) :
          o;
    }
  }
  return clone;
};


/**
 * Registers a JsPb message type id with its constructor.
 * @param {string} id The id for this type of message.
 * @param {Function} constructor The message constructor.
 * @export
 */
Message.registerMessageType = function (id, constructor) {
  // This is needed so we can later access messageId directly on the
  // constructor, otherwise it is not available due to 'property collapsing' by
  // the compiler.
  /**
   * @suppress {strictMissingProperties} messageId is not defined on Function
   */
  constructor.messageId = id;
};
/**
 * The extensions registered on MessageSet. This is a map of extension
 * field number to field info object. This should be considered as a
 * private API.
 *
 * This is similar to [jspb class name].extensions object for
 * non-MessageSet. We special case MessageSet so that we do not need
 * to goog.require MessageSet from classes that extends MessageSet.
 *
 * @type {!Object<number, ExtensionFieldInfo>}
 */
Message.messageSetExtensions = {};

/**
 * @type {!Object<number, ExtensionFieldBinaryInfo>}
 */
Message.messageSetExtensionsBinary = {};
exports = Message;
