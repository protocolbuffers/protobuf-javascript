/**
 * @fileoverview Public APIs exposed purely for use by generated code.  Use of
 * these APIs outside of that context is not supported and actively discouraged.
 * @public
 *
 * DO NOT USE THIS OUTSIDE OF THIS PACKAGE.
 */

goog.module('jspb.internal.public_for_gencode');
goog.module.declareLegacyNamespace();

const asserts = goog.require('goog.asserts');
const { BinaryReader } = goog.require('jspb.binary.reader');
const { BinaryWriter } = goog.requireType('jspb.binary.writer');
const JspbMap = goog.requireType('jspb.Map');

/**
 * Write this Map field in wire format to a BinaryWriter, using the given
 * field number.
 * @param {?JspbMap<K,V>} map
 * @param {number} fieldNumber
 * @param {!BinaryWriter} writer
 * @param {function(this:BinaryWriter,number,K_OR_NULL)} keyWriterFn
 *     The method on BinaryWriter that writes type K to the stream.
 * @param {function(this:BinaryWriter,number,V,?=)|
 *          function(this:BinaryWriter,number,V,?)} valueWriterFn
 *     The method on BinaryWriter that writes type V to the stream.  May be
 *     writeMessage, in which case the second callback arg form is used.
 * @param {function(V,!BinaryWriter)=} valueWriterCallback
 *    The BinaryWriter serialization callback for type V, if V is a message
 *    type.
 * @template K,V
 * Use go/closure-ttl  to create a `K|null` type for the keyWriterFn argument
 * closure type inference will occasionally infer K based on the keyWriterFn
 * argument instead of the map argument which will cause type errors when they
 * don't match
 * @template K_OR_NULL := union(K, 'null') =:
 */
function serializeMapToBinary(
    map, fieldNumber, writer, keyWriterFn, valueWriterFn, valueWriterCallback) {
  if (!map) {
    return;
  }
  map.forEach((value, key) => {
    writer.writeMessage(
        fieldNumber, /* we need a non-null value to pass here */ map,
        (ignored, w) => {
          keyWriterFn.call(w, 1, key);
          valueWriterFn.call(w, 2, value, valueWriterCallback);
        });
  });
}

/**
 * Read one key/value message from the given BinaryReader. Compatible as the
 * `reader` callback parameter to BinaryReader.readMessage, to be called
 * when a key/value pair submessage is encountered. If the Key is undefined,
 * we should default it to 0.
 * @template K, V
 * @param {!JspbMap<K,V>} map
 * @param {!BinaryReader} reader
 * @param {function(this:BinaryReader):K} keyReaderFn
 *     The method on BinaryReader that reads type K from the stream.
 *
 * @param {K} defaultKey
 *    The default value for the type of map keys. Accepting map entries with
 *    unset keys is required for maps to be backwards compatible with the
 *    repeated message representation described here: goo.gl/zuoLAC
 *
 * @param {function(this:BinaryReader):V|function(V,!BinaryReader)}
 *     valueReaderFn
 *    The method on BinaryReader that reads type V from the stream, or a
 * callback for readMessage.
 *
 * @param {V} defaultValue
 *    The default value for the type of map values. Accepting map entries with
 *    unset values is required for maps to be backwards compatible with the
 *    repeated message representation described here: goo.gl/zuoLAC
 */
function deserializeMapFromBinary(
    map, reader, keyReaderFn, defaultKey, valueReaderFn, defaultValue) {
  reader.readMessage(map, (message, reader) => {
    let key = defaultKey;
    let value = defaultValue;

    while (reader.nextField()) {
      if (reader.isEndGroup()) {
        break;
      }
      const field = reader.getFieldNumber();

      if (field == 1) {
        // Key.
        key = keyReaderFn.call(reader);
      } else if (field == 2) {
        // Value.
        if (map.valueCtor) {
          reader.readMessage(value, valueReaderFn);
        } else {
          value = (/** @type {function(this:BinaryReader):?} */ (valueReaderFn))
                      .call(reader);
        }
      }
    }

    asserts.assert(key != undefined);
    asserts.assert(value != undefined);
    map.set(key, value);
  });
}

exports = {deserializeMapFromBinary, serializeMapToBinary};
