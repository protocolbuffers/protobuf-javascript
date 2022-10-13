// Protocol Buffers - Google's data interchange format
// Copyright 2008 Google Inc.  All rights reserved.
// https://developers.google.com/protocol-buffers/
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

goog.setTestOnly();

// CommonJS-LoadFromFile: google-protobuf
goog.require('jspb.debug');

// CommonJS-LoadFromFile: protos/test_pb proto.jspb.test
goog.require('proto.jspb.test.HasExtensions');
goog.require('proto.jspb.test.IsExtension');
goog.require('proto.jspb.test.MapValueMessageNoBinary');
goog.require('proto.jspb.test.Simple1');
goog.require('proto.jspb.test.TestMapFieldsNoBinary');


// CommonJS-LoadFromFile: protos/testbinary_pb proto.jspb.test
goog.require('proto.jspb.test.TestAllTypes');

describe('debugTest', function () {
  it('testSimple1', function () {
    if (COMPILED) {
      return;
    }
    const message = new proto.jspb.test.Simple1();
    message.setAString('foo');
    expect(jspb.debug.dump(message)).toEqual({
      $name: 'proto.jspb.test.Simple1',
      'aString': 'foo',
      'aRepeatedStringList': []
    });

    message.setABoolean(true);
    message.setARepeatedStringList(['1', '2']);

    expect(jspb.debug.dump(message)).toEqual({
      $name: 'proto.jspb.test.Simple1',
      'aString': 'foo',
      'aRepeatedStringList': ['1', '2'],
      'aBoolean': true
    });

    message.clearAString();

    expect(jspb.debug.dump(message)).toEqual({
      $name: 'proto.jspb.test.Simple1',
      'aRepeatedStringList': ['1', '2'],
      'aBoolean': true
    });
  });

  it('testBytes', function () {
    if (COMPILED || typeof Uint8Array == 'undefined') {
      return;
    }
    const message = new proto.jspb.test.TestAllTypes();
    const bytes = new Uint8Array(4);
    message.setOptionalBytes(bytes);
    expect(bytes).toEqual(jspb.debug.dump(message)['optionalBytes']);
  });

  it('testExtensions', function () {
    if (COMPILED) {
      return;
    }
    const extension = new proto.jspb.test.IsExtension();
    extension.setExt1('ext1field');
    const extendable = new proto.jspb.test.HasExtensions();
    extendable.setStr1('v1');
    extendable.setStr2('v2');
    extendable.setStr3('v3');
    extendable.setExtension(proto.jspb.test.IsExtension.extField, extension);

    expect(jspb.debug.dump(extendable)).toEqual({
      '$name': 'proto.jspb.test.HasExtensions',
      'str1': 'v1',
      'str2': 'v2',
      'str3': 'v3',
      '$extensions': {
        'extField': {
          '$name': 'proto.jspb.test.IsExtension',
          'ext1': 'ext1field'
        },
        'repeatedSimpleList': []
      }
    });
  });

  it('testMapsBasicTypes', function () {
    if (COMPILED) {
      return;
    }

    const message = new proto.jspb.test.TestMapFieldsNoBinary();
    message.getMapBoolStringMap().set(true, 'bool_string_value1');
    message.getMapBoolStringMap().set(false, 'bool_string_value2');
    message.getMapStringInt32Map().set('key', 111);

    expect(jspb.debug.dump(message)).toEqual({
      '$name': 'proto.jspb.test.TestMapFieldsNoBinary',
      'mapBoolStringMap': {
        true: 'bool_string_value1',
        false: 'bool_string_value2'
      },
      'mapInt32StringMap': {},
      'mapInt64StringMap': {},
      'mapStringBoolMap': {},
      'mapStringDoubleMap': {},
      'mapStringEnumMap': {},
      'mapStringInt32Map': {
        'key': 111
      },
      'mapStringInt64Map': {},
      'mapStringMsgMap': {},
      'mapStringStringMap': {},
      'mapStringTestmapfieldsMap': {}
    });
  });

  it('testMapsMessageValues', function () {
    if (COMPILED) {
      return;
    }

    const value1 = new proto.jspb.test.MapValueMessageNoBinary();
    value1.setFoo(1111);
    const value2 = new proto.jspb.test.MapValueMessageNoBinary();
    value2.setFoo(2222);

    const message = new proto.jspb.test.TestMapFieldsNoBinary();
    message.getMapStringMsgMap().set('key1', value1);
    message.getMapStringMsgMap().set('key2', value2);

    expect(jspb.debug.dump(message)).toEqual({
      '$name': 'proto.jspb.test.TestMapFieldsNoBinary',
      'mapBoolStringMap': {},
      'mapInt32StringMap': {},
      'mapInt64StringMap': {},
      'mapStringBoolMap': {},
      'mapStringDoubleMap': {},
      'mapStringEnumMap': {},
      'mapStringInt32Map': {},
      'mapStringInt64Map': {},
      'mapStringMsgMap': {
        'key1': {
          '$name': 'proto.jspb.test.MapValueMessageNoBinary',
          'foo': 1111
        },
        'key2': {
          '$name': 'proto.jspb.test.MapValueMessageNoBinary',
          'foo': 2222
        }
      },
      'mapStringStringMap': {},
      'mapStringTestmapfieldsMap': {}
    });
  });

});
