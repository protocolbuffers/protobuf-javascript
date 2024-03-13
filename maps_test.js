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

goog.require('goog.userAgent');

// CommonJS-LoadFromFile: protos/testbinary_pb proto.jspb.test
goog.require('proto.jspb.test.MapValueEnum');
goog.require('proto.jspb.test.MapValueMessage');
goog.require('proto.jspb.test.TestMapFields');
goog.require('proto.jspb.test.TestMapFieldsOptionalKeys');
goog.require('proto.jspb.test.TestMapFieldsOptionalValues');
goog.require('proto.jspb.test.MapEntryOptionalKeysStringKey');
goog.require('proto.jspb.test.MapEntryOptionalKeysInt32Key');
goog.require('proto.jspb.test.MapEntryOptionalKeysInt64Key');
goog.require('proto.jspb.test.MapEntryOptionalKeysBoolKey');
goog.require('proto.jspb.test.MapEntryOptionalValuesStringValue');
goog.require('proto.jspb.test.MapEntryOptionalValuesInt32Value');
goog.require('proto.jspb.test.MapEntryOptionalValuesInt64Value');
goog.require('proto.jspb.test.MapEntryOptionalValuesBoolValue');
goog.require('proto.jspb.test.MapEntryOptionalValuesDoubleValue');
goog.require('proto.jspb.test.MapEntryOptionalValuesEnumValue');
goog.require('proto.jspb.test.MapEntryOptionalValuesMessageValue');

// CommonJS-LoadFromFile: protos/test_pb proto.jspb.test
goog.require('proto.jspb.test.MapValueMessageNoBinary');
goog.require('proto.jspb.test.TestMapFieldsNoBinary');

goog.requireType('jspb.Map');


/**
 * Helper: check that the given map has exactly this set of (sorted) entries.
 * @param {!jspb.Map} map
 * @param {!Array<!Array<?>>} entries
 */
function checkMapEquals(map, entries) {
  const arr = map.toArray();
  expect(entries.length).toEqual(arr.length);
  for (let i = 0; i < arr.length; i++) {
    if (Array.isArray(arr[i])) {
      expect(Array.isArray(entries[i])).toBeTrue();;
      expect(entries[i]).toEqual(arr[i]);
    } else {
      expect(entries[i]).toEqual(arr[i]);
    }
  }
}

/**
 * Converts an ES6 iterator to an array.
 * @template T
 * @param {!Iterator<T>} iter an iterator
 * @return {!Array<T>}
 */
function toArray(iter) {
  const arr = [];
  while (true) {
    const val = iter.next();
    if (val.done) {
      break;
    }
    arr.push(val.value);
  }
  return arr;
}


/**
 * Helper: generate test methods for this TestMapFields class.
 * @param {?} msgInfo
 * @param {?} submessageCtor
 * @param {string} suffix
 */
function makeTests(msgInfo, submessageCtor, suffix) {
  /**
   * Helper: fill all maps on a TestMapFields.
   * @param {?} msg
   */
  const fillMapFields = function (msg) {
    msg.getMapStringStringMap().set('asdf', 'jkl;').set('key 2', 'hello world');
    msg.getMapStringInt32Map().set('a', 1).set('b', -2);
    msg.getMapStringInt64Map().set('c', 0x100000000).set('d', 0x200000000);
    msg.getMapStringBoolMap().set('e', true).set('f', false);
    msg.getMapStringDoubleMap().set('g', 3.14159).set('h', 2.71828);
    msg.getMapStringEnumMap()
      .set('i', proto.jspb.test.MapValueEnum.MAP_VALUE_BAR)
      .set('j', proto.jspb.test.MapValueEnum.MAP_VALUE_BAZ);
    msg.getMapStringMsgMap()
      .set('k', new submessageCtor())
      .set('l', new submessageCtor());
    msg.getMapStringMsgMap().get('k').setFoo(42);
    msg.getMapStringMsgMap().get('l').setFoo(84);
    msg.getMapInt32StringMap().set(-1, 'a').set(42, 'b');
    msg.getMapInt64StringMap()
      .set(0x123456789abc, 'c')
      .set(0xcba987654321, 'd');
    msg.getMapBoolStringMap().set(false, 'e').set(true, 'f');
  };

  /**
   * Helper: check all maps on a TestMapFields.
   * @param {?} msg
   */
  const checkMapFields = function (msg) {
    checkMapEquals(
      msg.getMapStringStringMap(),
      [['asdf', 'jkl;'], ['key 2', 'hello world']]);
    checkMapEquals(msg.getMapStringInt32Map(), [['a', 1], ['b', -2]]);
    checkMapEquals(
      msg.getMapStringInt64Map(), [['c', 0x100000000], ['d', 0x200000000]]);
    checkMapEquals(msg.getMapStringBoolMap(), [['e', true], ['f', false]]);
    checkMapEquals(
      msg.getMapStringDoubleMap(), [['g', 3.14159], ['h', 2.71828]]);
    checkMapEquals(msg.getMapStringEnumMap(), [
      ['i', proto.jspb.test.MapValueEnum.MAP_VALUE_BAR],
      ['j', proto.jspb.test.MapValueEnum.MAP_VALUE_BAZ]
    ]);
    checkMapEquals(msg.getMapInt32StringMap(), [[-1, 'a'], [42, 'b']]);
    checkMapEquals(
      msg.getMapInt64StringMap(),
      [[0x123456789abc, 'c'], [0xcba987654321, 'd']]);
    checkMapEquals(msg.getMapBoolStringMap(), [[false, 'e'], [true, 'f']]);

    expect(msg.getMapStringMsgMap().getLength()).toEqual(2);
    expect(msg.getMapStringMsgMap().get('k').getFoo()).toEqual(42);
    expect(msg.getMapStringMsgMap().get('l').getFoo()).toEqual(84);

    const entries = toArray(msg.getMapStringMsgMap().entries());
    expect(entries.length).toEqual(2);
    entries.forEach(function (entry) {
      const key = entry[0];
      const val = entry[1];
      expect(msg.getMapStringMsgMap().get(key)).toEqual(val);
    });

    msg.getMapStringMsgMap().forEach(function (val, key) {
      expect(msg.getMapStringMsgMap().get(key)).toEqual(val);
    });
  };

  it('testMapStringStringField' + suffix, () => {
    let msg = new msgInfo.constructor();
    expect(msg.getMapStringStringMap().getLength()).toEqual(0);
    expect(msg.getMapStringInt32Map().getLength()).toEqual(0);
    expect(msg.getMapStringInt64Map().getLength()).toEqual(0);
    expect(msg.getMapStringBoolMap().getLength()).toEqual(0);
    expect(msg.getMapStringDoubleMap().getLength()).toEqual(0);
    expect(msg.getMapStringEnumMap().getLength()).toEqual(0);
    expect(msg.getMapStringMsgMap().getLength()).toEqual(0);

    // Re-create to clear out any internally-cached wrappers, etc.
    msg = new msgInfo.constructor();
    const m = msg.getMapStringStringMap();
    expect(m.has('asdf')).toBeFalse()
    expect(m.get('asdf')).toBeUndefined()
    m.set('asdf', 'hello world');
    expect(m.has('asdf')).toBeTrue();
    expect(m.get('asdf')).toEqual('hello world');
    m.set('jkl;', 'key 2');
    expect(m.has('jkl;')).toBeTrue();
    expect(m.get('jkl;')).toEqual('key 2');
    expect(m.getLength()).toEqual(2);
    let it = m.entries();
    expect(it.next().value).toEqual(['asdf', 'hello world']);
    expect(it.next().value).toEqual(['jkl;', 'key 2']);
    expect(it.next().done).toBeTrue();
    checkMapEquals(m, [['asdf', 'hello world'], ['jkl;', 'key 2']]);
    m.del('jkl;');
    expect(m.has('jkl;')).toBeFalse()
    expect(m.get('jkl;')).toBeUndefined()
    expect(m.getLength()).toEqual(1);
    it = m.keys();
    expect(it.next().value).toEqual('asdf');
    expect(it.next().done).toBeTrue();
    it = m.values();
    expect(it.next().value).toEqual('hello world');
    expect(it.next().done).toBeTrue();

    let count = 0;
    m.forEach(function (value, key, map) {
      expect(m).toEqual(map);
      expect(key).toEqual('asdf');
      expect(value).toEqual('hello world');
      count++;
    });
    expect(count).toEqual(1);

    m.clear();
    expect(m.getLength()).toEqual(0);
  });


  /**
   * Tests operations on maps with all key and value types.
   */
  it('testAllMapTypes' + suffix, () => {
    const msg = new msgInfo.constructor();
    fillMapFields(msg);
    checkMapFields(msg);
  });


  if (msgInfo.deserializeBinary) {
    /**
     * Tests serialization and deserialization in binary format.
     */
    it('testBinaryFormat' + suffix, () => {
      if (goog.userAgent.IE && !goog.userAgent.isDocumentModeOrHigher(10)) {
        // IE8/9 currently doesn't support binary format because they lack
        // TypedArray.
        return;
      }

      // Check that the format is correct.
      let msg = new msgInfo.constructor();
      msg.getMapStringStringMap().set('A', 'a');
      let serialized = msg.serializeBinary();
      const expectedSerialized = [
        0x0a, 0x6,  // field 1 (map_string_string), delimited, length 6
        0x0a, 0x1,  // field 1 in submessage (key), delimited, length 1
        0x41,       // ASCII 'A'
        0x12, 0x1,  // field 2 in submessage (value), delimited, length 1
        0x61        // ASCII 'a'
      ];
      expect(expectedSerialized.length).toEqual(serialized.length);
      for (let i = 0; i < serialized.length; i++) {
        expect(expectedSerialized[i]).toEqual(serialized[i]);
      }

      // Check that all map fields successfully round-trip.
      msg = new msgInfo.constructor();
      fillMapFields(msg);
      serialized = msg.serializeBinary();
      const decoded = msgInfo.deserializeBinary(serialized);
      checkMapFields(decoded);
    });

    /**
     * Tests deserialization of undefined map keys go to default values in
     * binary format.
     */
    it('testMapDeserializationForUndefinedKeys', () => {
      const testMessageOptionalKeys =
        new proto.jspb.test.TestMapFieldsOptionalKeys();
      const mapEntryStringKey =
        new proto.jspb.test.MapEntryOptionalKeysStringKey();
      mapEntryStringKey.setValue('a');
      testMessageOptionalKeys.setMapStringString(mapEntryStringKey);
      const mapEntryInt32Key = new proto.jspb.test.MapEntryOptionalKeysInt32Key();
      mapEntryInt32Key.setValue('b');
      testMessageOptionalKeys.setMapInt32String(mapEntryInt32Key);
      const mapEntryInt64Key = new proto.jspb.test.MapEntryOptionalKeysInt64Key();
      mapEntryInt64Key.setValue('c');
      testMessageOptionalKeys.setMapInt64String(mapEntryInt64Key);
      const mapEntryBoolKey = new proto.jspb.test.MapEntryOptionalKeysBoolKey();
      mapEntryBoolKey.setValue('d');
      testMessageOptionalKeys.setMapBoolString(mapEntryBoolKey);
      const deserializedMessage =
        msgInfo.deserializeBinary(testMessageOptionalKeys.serializeBinary());
      checkMapEquals(deserializedMessage.getMapStringStringMap(), [['', 'a']]);
      checkMapEquals(deserializedMessage.getMapInt32StringMap(), [[0, 'b']]);
      checkMapEquals(deserializedMessage.getMapInt64StringMap(), [[0, 'c']]);
      checkMapEquals(deserializedMessage.getMapBoolStringMap(), [[false, 'd']]);
    });

    /**
     * Tests deserialization of undefined map values go to default values in
     * binary format.
     */
    it('testMapDeserializationForUndefinedValues', () => {
      const testMessageOptionalValues =
        new proto.jspb.test.TestMapFieldsOptionalValues();
      const mapEntryStringValue =
        new proto.jspb.test.MapEntryOptionalValuesStringValue();
      mapEntryStringValue.setKey('a');
      testMessageOptionalValues.setMapStringString(mapEntryStringValue);
      const mapEntryInt32Value =
        new proto.jspb.test.MapEntryOptionalValuesInt32Value();
      mapEntryInt32Value.setKey('b');
      testMessageOptionalValues.setMapStringInt32(mapEntryInt32Value);
      const mapEntryInt64Value =
        new proto.jspb.test.MapEntryOptionalValuesInt64Value();
      mapEntryInt64Value.setKey('c');
      testMessageOptionalValues.setMapStringInt64(mapEntryInt64Value);
      const mapEntryBoolValue =
        new proto.jspb.test.MapEntryOptionalValuesBoolValue();
      mapEntryBoolValue.setKey('d');
      testMessageOptionalValues.setMapStringBool(mapEntryBoolValue);
      const mapEntryDoubleValue =
        new proto.jspb.test.MapEntryOptionalValuesDoubleValue();
      mapEntryDoubleValue.setKey('e');
      testMessageOptionalValues.setMapStringDouble(mapEntryDoubleValue);
      const mapEntryEnumValue =
        new proto.jspb.test.MapEntryOptionalValuesEnumValue();
      mapEntryEnumValue.setKey('f');
      testMessageOptionalValues.setMapStringEnum(mapEntryEnumValue);
      const mapEntryMessageValue =
        new proto.jspb.test.MapEntryOptionalValuesMessageValue();
      mapEntryMessageValue.setKey('g');
      testMessageOptionalValues.setMapStringMsg(mapEntryMessageValue);
      const deserializedMessage = msgInfo.deserializeBinary(
        testMessageOptionalValues.serializeBinary());
      checkMapEquals(deserializedMessage.getMapStringStringMap(), [['a', '']]);
      checkMapEquals(deserializedMessage.getMapStringInt32Map(), [['b', 0]]);
      checkMapEquals(deserializedMessage.getMapStringInt64Map(), [['c', 0]]);
      checkMapEquals(deserializedMessage.getMapStringBoolMap(), [['d', false]]);
      checkMapEquals(deserializedMessage.getMapStringDoubleMap(), [['e', 0.0]]);
      checkMapEquals(deserializedMessage.getMapStringEnumMap(), [['f', 0]]);
      checkMapEquals(deserializedMessage.getMapStringMsgMap(), [['g', []]]);
    });
  }


  /**
   * Exercises the lazy map<->underlying array sync.
   */
  it('testLazyMapSync' + suffix, () => {
    // Start with a JSPB array containing a few map entries.
    const entries = [['a', 'entry 1'], ['c', 'entry 2'], ['b', 'entry 3']];
    const msg = new msgInfo.constructor([entries]);
    expect(entries.length).toEqual(3);
    expect(entries[0][0]).toEqual('a');
    expect(entries[1][0]).toEqual('c');
    expect(entries[2][0]).toEqual('b');
    msg.getMapStringStringMap().del('a');
    expect(entries.length).toEqual(3);  // not yet sync'd
    msg.toArray();                    // force a sync
    expect(entries.length).toEqual(2);
    expect(entries[0][0]).toEqual('b');  // now in sorted order
    expect(entries[1][0]).toEqual('c');

    const a = msg.toArray();
    expect(entries).toEqual(a[0]);  // retains original reference
  });

  /**
   * Returns IteratorIterables for entries(), keys() and values().
   */
  it('testIteratorIterables' + suffix, () => {
    const msg = new msgInfo.constructor();
    const m = msg.getMapStringStringMap();
    m.set('key1', 'value1');
    m.set('key2', 'value2');
    const entryIterator = m.entries();
    expect(entryIterator.next().value).toEqual(['key1', 'value1']);
    expect(entryIterator.next().value).toEqual(['key2', 'value2']);
    expect(entryIterator.next().done).toBeTrue();

    try {
      const entryIterable = m.entries()[Symbol.iterator]();
      expect(entryIterable.next().value).toEqual(['key1', 'value1']);
      expect(entryIterable.next().value).toEqual(['key2', 'value2']);
      expect(entryIterable.next().done).toBeTrue();
    } catch (err) {
      // jspb.Map.ArrayIteratorIterable_.prototype[Symbol.iterator] may be
      // undefined in some environment.
      if (err.name != 'TypeError' && err.name != 'ReferenceError') {
        throw err;
      }
    }

    const keyIterator = m.keys();
    expect(keyIterator.next().value).toEqual('key1');
    expect(keyIterator.next().value).toEqual('key2');
    expect(keyIterator.next().done).toBeTrue();

    try {
      const keyIterable = m.keys()[Symbol.iterator]();
      expect(keyIterable.next().value).toEqual('key1');
      expect(keyIterable.next().value).toEqual('key2');
      expect(keyIterable.next().done).toBeTrue();
    } catch (err) {
      // jspb.Map.ArrayIteratorIterable_.prototype[Symbol.iterator] may be
      // undefined in some environment.
      if (err.name != 'TypeError' && err.name != 'ReferenceError') {
        throw err;
      }
    }
    const valueIterator = m.values();
    expect(valueIterator.next().value).toEqual('value1');
    expect(valueIterator.next().value).toEqual('value2');
    expect(valueIterator.next().done).toBeTrue();

    try {
      const valueIterable = m.values()[Symbol.iterator]();
      expect(valueIterable.next().value).toEqual('value1');
      expect(valueIterable.next().value).toEqual('value2');
      expect(valueIterable.next().done).toBeTrue();
    } catch (err) {
      // jspb.Map.ArrayIteratorIterable_.prototype[Symbol.iterator] may be
      // undefined in some environment.
      if (err.name != 'TypeError' && err.name != 'ReferenceError') {
        throw err;
      }
    }
  });
}

describe('mapsTest', () => {
  makeTests(
    {
      constructor: proto.jspb.test.TestMapFields,
      deserializeBinary: proto.jspb.test.TestMapFields.deserializeBinary
    },
    proto.jspb.test.MapValueMessage, '_Binary');
  makeTests(
    {
      constructor: proto.jspb.test.TestMapFieldsNoBinary,
      deserializeBinary: null
    },
    proto.jspb.test.MapValueMessageNoBinary, '_NoBinary');
});
