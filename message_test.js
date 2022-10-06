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

// Test suite is written using Jasmine -- see http://jasmine.github.io/

goog.setTestOnly();

goog.require('goog.testing.PropertyReplacer');

goog.require('goog.userAgent');

// CommonJS-LoadFromFile: protos/google-protobuf jspb
goog.require('jspb.Message');

// CommonJS-LoadFromFile: protos/google-protobuf jspb.asserts
goog.require('jspb.asserts');

// CommonJS-LoadFromFile: protos/test15_pb proto.jspb.filenametest.package1
goog.require('proto.jspb.filenametest.package1.b');

// CommonJS-LoadFromFile: protos/test14_pb proto.jspb.filenametest.package2
goog.require('proto.jspb.filenametest.package2.TestMessage');

// CommonJS-LoadFromFile: protos/test13_pb proto.jspb.filenametest.package1
goog.require('proto.jspb.filenametest.package1.a');
goog.require('proto.jspb.filenametest.package1.TestMessage');

// CommonJS-LoadFromFile: protos/test12_pb proto.jspb.circulartest
goog.require('proto.jspb.circulartest.ExtensionContainingType1');
goog.require('proto.jspb.circulartest.ExtensionContainingType2');
goog.require('proto.jspb.circulartest.ExtensionField1');
goog.require('proto.jspb.circulartest.ExtensionField2');
goog.require('proto.jspb.circulartest.ExtensionField3');
goog.require('proto.jspb.circulartest.MapField1');
goog.require('proto.jspb.circulartest.MapField2');
goog.require('proto.jspb.circulartest.MessageField1');
goog.require('proto.jspb.circulartest.MessageField2');
goog.require('proto.jspb.circulartest.NestedEnum1');
goog.require('proto.jspb.circulartest.NestedEnum2');
goog.require('proto.jspb.circulartest.NestedMessage1');
goog.require('proto.jspb.circulartest.NestedMessage2');
goog.require('proto.jspb.circulartest.RepeatedMessageField1');
goog.require('proto.jspb.circulartest.RepeatedMessageField2');

// CommonJS-LoadFromFile: protos/test11_pb proto.jspb.exttest.reverse
goog.require('proto.jspb.exttest.reverse.TestExtensionReverseOrderMessage1');
goog.require('proto.jspb.exttest.reverse.TestExtensionReverseOrderMessage2');
goog.require('proto.jspb.exttest.reverse.c');

// CommonJS-LoadFromFile: protos/test8_pb proto.jspb.exttest.nested
goog.require('proto.jspb.exttest.nested.TestNestedExtensionsMessage');
goog.require('proto.jspb.exttest.nested.TestOuterMessage');

// CommonJS-LoadFromFile: protos/test5_pb proto.jspb.exttest.beta
goog.require('proto.jspb.exttest.beta.floatingStrField');

// CommonJS-LoadFromFile: protos/test3_pb proto.jspb.exttest
goog.require('proto.jspb.exttest.floatingMsgField');

// CommonJS-LoadFromFile: protos/test4_pb proto.jspb.exttest
goog.require('proto.jspb.exttest.floatingMsgFieldTwo');

// CommonJS-LoadFromFile: protos/test_pb proto.jspb.test
goog.require('proto.jspb.test.BooleanFields');
goog.require('proto.jspb.test.CloneExtension');
goog.require('proto.jspb.test.Complex');
goog.require('proto.jspb.test.DefaultValues');
goog.require('proto.jspb.test.Empty');
goog.require('proto.jspb.test.EnumContainer');
goog.require('proto.jspb.test.floatingMsgField');
goog.require('proto.jspb.test.FloatingPointFields');
goog.require('proto.jspb.test.floatingStrField');
goog.require('proto.jspb.test.HasExtensions');
goog.require('proto.jspb.test.IndirectExtension');
goog.require('proto.jspb.test.IsExtension');
goog.require('proto.jspb.test.OptionalFields');
goog.require('proto.jspb.test.OuterEnum');
goog.require('proto.jspb.test.OuterMessage.Complex');
goog.require('proto.jspb.test.Simple1');
goog.require('proto.jspb.test.Simple2');
goog.require('proto.jspb.test.SpecialCases');
goog.require('proto.jspb.test.TestClone');
goog.require('proto.jspb.test.TestCloneExtension');
goog.require('proto.jspb.test.TestEndsWithBytes');
goog.require('proto.jspb.test.TestGroup');
goog.require('proto.jspb.test.TestGroup1');
goog.require('proto.jspb.test.TestLastFieldBeforePivot');
goog.require('proto.jspb.test.TestMessageWithOneof');
goog.require('proto.jspb.test.TestReservedNames');
goog.require('proto.jspb.test.TestReservedNamesExtension');

// CommonJS-LoadFromFile: protos/test2_pb proto.jspb.test
goog.require('proto.jspb.test.ExtensionMessage');
goog.require('proto.jspb.test.TestExtensionsMessage');

goog.require('proto.jspb.test.TestAllowAliasEnum');
// CommonJS-LoadFromFile: protos/testlargenumbers_pb proto.jspb.test
goog.require('proto.jspb.test.MessageWithLargeFieldNumbers');

goog.require('proto.jspb.test.simple1');

describe('Message test suite', () => {
  const stubs = new goog.testing.PropertyReplacer();

  beforeEach(() => {
    stubs.set(jspb.Message, 'SERIALIZE_EMPTY_TRAILING_FIELDS', false);
  });

  afterEach(() => {
    stubs.reset();
  });

  it('testEmptyProto', () => {
    const empty1 = new proto.jspb.test.Empty([]);
    const empty2 = new proto.jspb.test.Empty([]);
    expect(empty1.toObject()).toEqual({});
    expect(empty1).toEqual(empty2);
  });

  it('testTopLevelEnum', () => {
    const response = new proto.jspb.test.EnumContainer([]);
    response.setOuterEnum(proto.jspb.test.OuterEnum.FOO);
    expect(response.getOuterEnum()).toEqual(proto.jspb.test.OuterEnum.FOO);
  });

  it('testByteStrings', () => {
    const data = new proto.jspb.test.DefaultValues([]);
    data.setBytesField('some_bytes');
    expect(data.getBytesField()).toEqual('some_bytes');
  });

  it('testComplexConversion', () => {
    const data1 = ['a', , , [, 11], [[, 22], [, 33]], , ['s1', 's2'], , 1];
    const foo = new proto.jspb.test.Complex(data1);
    let result = foo.toObject();
    expect(result).toEqual({
      aString: 'a',
      anOutOfOrderBool: true,
      aNestedMessage: {anInt: 11},
      aRepeatedMessageList: [{anInt: 22}, {anInt: 33}],
      aRepeatedStringList: ['s1', 's2'],
      aFloatingPointField: undefined,
    });

    // Now test with the jspb instances included.
    result = foo.toObject(true /* opt_includeInstance */);
    expect(result).toEqual({
      aString: 'a',
      anOutOfOrderBool: true,
      aNestedMessage:
          {anInt: 11, $jspbMessageInstance: foo.getANestedMessage()},
      aRepeatedMessageList: [
        {anInt: 22, $jspbMessageInstance: foo.getARepeatedMessageList()[0]},
        {anInt: 33, $jspbMessageInstance: foo.getARepeatedMessageList()[1]}
      ],
      aRepeatedStringList: ['s1', 's2'],
      aFloatingPointField: undefined,
      $jspbMessageInstance: foo
    });
  });

  it('testMissingFields', () => {
    const foo = new proto.jspb.test.Complex([
      undefined, undefined, undefined, [], undefined, undefined, undefined,
      undefined
    ]);
    const result = foo.toObject();
    expect(result).toEqual({
      aString: undefined,
      anOutOfOrderBool: undefined,
      aNestedMessage: {anInt: undefined},
      // Note: JsPb converts undefined repeated fields to empty arrays.
      aRepeatedMessageList: [],
      aRepeatedStringList: [],
      aFloatingPointField: undefined,
    });
  });

  it('testNestedComplexMessage', () => {
    // Instantiate the message and set a unique field, just to ensure that we
    // are not getting jspb.test.Complex instead.
    const msg = new proto.jspb.test.OuterMessage.Complex();
    msg.setInnerComplexField(5);
  });

  it('testSpecialCases', () => {
    // Note: Some property names are reserved in JavaScript.
    // These names are converted to the Js property named pb_<reserved_name>.
    const special = new proto.jspb.test.SpecialCases(
        ['normal', 'default', 'function', 'var']);
    const result = special.toObject();
    expect(result).toEqual({
      normal: 'normal',
      pb_default: 'default',
      pb_function: 'function',
      pb_var: 'var'
    });
  });

  it('testDefaultValues', () => {
    const defaultString = 'default<>\'"abc';
    let response = new proto.jspb.test.DefaultValues();

    // Test toObject
    const expectedObject = {
      stringField: defaultString,
      boolField: true,
      intField: 11,
      enumField: 13,
      emptyField: '',
      bytesField: 'bW9v'
    };
    expect(response.toObject()).toEqual(expectedObject);


    // Test getters
    response = new proto.jspb.test.DefaultValues();
    expect(response.getStringField()).toEqual(defaultString);
    expect(response.getBoolField()).toEqual(true);
    expect(response.getIntField()).toEqual(11);
    expect(response.getEnumField()).toEqual(13);
    expect(response.getEmptyField()).toEqual('');
    expect(response.getBytesField()).toEqual('bW9v');

    function makeDefault(values) {
      return new proto.jspb.test.DefaultValues(values);
    }

    // Test with undefined values,
    // Use push to workaround IE treating undefined array elements as holes.
    response = makeDefault([undefined, undefined, undefined, undefined]);
    expect(response.getStringField()).toEqual(defaultString);
    expect(response.getBoolField()).toEqual(true);
    expect(response.getIntField()).toEqual(11);
    expect(response.getEnumField()).toEqual(13);
    expect(response.hasStringField()).toEqual(false);
    expect(response.hasBoolField()).toEqual(false);
    expect(response.hasIntField()).toEqual(false);
    expect(response.hasEnumField()).toEqual(false);

    // Test with null values, as would be returned by a JSON serializer.
    response = makeDefault([null, null, null, null]);
    expect(response.getStringField()).toEqual(defaultString);
    expect(response.getBoolField()).toEqual(true);
    expect(response.getIntField()).toEqual(11);
    expect(response.getEnumField()).toEqual(13);
    expect(response.hasStringField()).toEqual(false);
    expect(response.hasBoolField()).toEqual(false);
    expect(response.hasIntField()).toEqual(false);
    expect(response.hasEnumField()).toEqual(false);

    // Test with false-like values.
    response = makeDefault(['', false, 0, 0]);
    expect(response.getStringField()).toEqual('');
    expect(response.getBoolField()).toEqual(false);
    expect(response.getIntField()).toEqual(0);
    expect(response.getEnumField()).toEqual(0);
    expect(response.hasStringField()).toEqual(true);
    expect(response.hasBoolField()).toEqual(true);
    expect(response.hasIntField()).toEqual(true);
    expect(response.hasEnumField()).toEqual(true);

    // Test that clearing the values reverts them to the default state.
    response = makeDefault(['blah', false, 111, 77]);
    response.clearStringField();
    response.clearBoolField();
    response.clearIntField();
    response.clearEnumField();
    expect(response.getStringField()).toEqual(defaultString);
    expect(response.getBoolField()).toEqual(true);
    expect(response.getIntField()).toEqual(11);
    expect(response.getEnumField()).toEqual(13);
    expect(response.hasStringField()).toEqual(false);
    expect(response.hasBoolField()).toEqual(false);
    expect(response.hasIntField()).toEqual(false);
    expect(response.hasEnumField()).toEqual(false);

    // Test that setFoo(null) clears the values.
    response = makeDefault(['blah', false, 111, 77]);
    response.setStringField(null);
    response.setBoolField(null);
    response.setIntField(undefined);
    response.setEnumField(undefined);
    expect(response.getStringField()).toEqual(defaultString);
    expect(response.getBoolField()).toEqual(true);
    expect(response.getIntField()).toEqual(11);
    expect(response.getEnumField()).toEqual(13);
    expect(response.hasStringField()).toEqual(false);
    expect(response.hasBoolField()).toEqual(false);
    expect(response.hasIntField()).toEqual(false);
    expect(response.hasEnumField()).toEqual(false);
  });

  it('testEqualsSimple', () => {
    const s1 = new proto.jspb.test.Simple1(['hi']);
    expect(jspb.Message.equals(s1, new proto.jspb.test.Simple1(['hi'])))
        .toEqual(true);
    expect(jspb.Message.equals(s1, new proto.jspb.test.Simple1(['bye'])))
        .toEqual(false);
    const s1b = new proto.jspb.test.Simple1(['hi', ['hello']]);
    expect(jspb.Message.equals(s1b, new proto.jspb.test.Simple1([
      'hi', ['hello']
    ]))).toEqual(true);
    expect(jspb.Message.equals(s1b, new proto.jspb.test.Simple1([
      'hi', ['hello', undefined, undefined, undefined]
    ]))).toEqual(true);
    expect(jspb.Message.equals(s1b, new proto.jspb.test.Simple1([
      'no', ['hello']
    ]))).toEqual(false);
    // Test with messages of different types
    const s2 = new proto.jspb.test.Simple2(['hi']);
    expect(jspb.Message.equals(s1, s2)).toEqual(false);
  });

  it('testEquals_softComparison', () => {
    const s1 = new proto.jspb.test.Simple1(['hi', [], null]);
    expect(jspb.Message.equals(s1, new proto.jspb.test.Simple1(['hi', []])))
        .toBeTrue();

    const s1b = new proto.jspb.test.Simple1(['hi', [], true]);
    expect(jspb.Message.equals(s1b, new proto.jspb.test.Simple1(['hi', [], 1])))
        .toBeTrue();
  });

  it('testEqualsComplex', () => {
    const data1 = ['a', , , [, 11], [[, 22], [, 33]], , ['s1', 's2'], , 1];
    const data2 = ['a', , , [, 11], [[, 22], [, 34]], , ['s1', 's2'], , 1];
    const data3 = ['a', , , [, 11], [[, 22]], , ['s1', 's2'], , 1];
    const data4 = ['hi'];
    const c1a = new proto.jspb.test.Complex(data1);
    const c1b = new proto.jspb.test.Complex(data1);
    const c2 = new proto.jspb.test.Complex(data2);
    const c3 = new proto.jspb.test.Complex(data3);
    const s1 = new proto.jspb.test.Simple1(data4);

    expect(jspb.Message.equals(c1a, c1b)).toBeTrue();
    expect(jspb.Message.equals(c1a, c2)).toBeFalse();
    expect(jspb.Message.equals(c2, c3)).toBeFalse();
    expect(jspb.Message.equals(c1a, s1)).toBeFalse();
  });

  it('testEqualsExtensionsConstructed', () => {
    expect(jspb.Message.equals(
               new proto.jspb.test.HasExtensions([]),
               new proto.jspb.test.HasExtensions([{}])))
        .toBeTrue();
    expect(jspb.Message.equals(
               new proto.jspb.test.HasExtensions(['hi', {100: [{200: 'a'}]}]),
               new proto.jspb.test.HasExtensions(['hi', {100: [{200: 'a'}]}])))
        .toBeTrue();
    expect(jspb.Message.equals(
               new proto.jspb.test.HasExtensions(['hi', {100: [{200: 'a'}]}]),
               new proto.jspb.test.HasExtensions(['hi', {100: [{200: 'b'}]}])))
        .toBeFalse();
    expect(jspb.Message.equals(
               new proto.jspb.test.HasExtensions([{100: [{200: 'a'}]}]),
               new proto.jspb.test.HasExtensions([{100: [{200: 'a'}]}])))
        .toBeTrue();
    expect(jspb.Message.equals(
               new proto.jspb.test.HasExtensions([{100: [{200: 'a'}]}]),
               new proto.jspb.test.HasExtensions([, , , {100: [{200: 'a'}]}])))
        .toBeTrue();
    expect(jspb.Message.equals(
               new proto.jspb.test.HasExtensions([, , , {100: [{200: 'a'}]}]),
               new proto.jspb.test.HasExtensions([{100: [{200: 'a'}]}])))
        .toBeTrue();
    expect(
        jspb.Message.equals(
            new proto.jspb.test.HasExtensions(['hi', {100: [{200: 'a'}]}]),
            new proto.jspb.test.HasExtensions(['hi', , , {100: [{200: 'a'}]}])))
        .toBeTrue();
    expect(
        jspb.Message.equals(
            new proto.jspb.test.HasExtensions(['hi', , , {100: [{200: 'a'}]}]),
            new proto.jspb.test.HasExtensions(['hi', {100: [{200: 'a'}]}])))
        .toBeTrue();
  });

  it('testEqualsExtensionsUnconstructed', () => {
    expect(jspb.Message.compareFields([], [{}])).toBeTrue();
    expect(jspb.Message.compareFields([, , , {}], [])).toBeTrue();
    expect(jspb.Message.compareFields([, , , {}], [, , {}])).toBeTrue();
    expect(jspb.Message.compareFields(['hi', {100: [{200: 'a'}]}], [
      'hi', {100: [{200: 'a'}]}
    ])).toBeTrue();
    expect(jspb.Message.compareFields(['hi', {100: [{200: 'a'}]}], [
      'hi', {100: [{200: 'b'}]}
    ])).toBeFalse();
    expect(jspb.Message.compareFields([{100: [{200: 'a'}]}], [
      {100: [{200: 'a'}]}
    ])).toBeTrue();
    expect(jspb.Message.compareFields([{100: [{200: 'a'}]}], [
      , , , {100: [{200: 'a'}]}
    ])).toBeTrue();
    expect(jspb.Message.compareFields([, , , {100: [{200: 'a'}]}], [
      {100: [{200: 'a'}]}
    ])).toBeTrue();
    expect(jspb.Message.compareFields(['hi', {100: [{200: 'a'}]}], [
      'hi', , , {100: [{200: 'a'}]}
    ])).toBeTrue();
    expect(jspb.Message.compareFields(['hi', , , {100: [{200: 'a'}]}], [
      'hi', {100: [{200: 'a'}]}
    ])).toBeTrue();
  });

  it('testInitializeMessageWithLastFieldNull', () => {
    // This tests for regression to bug http://b/117298778
    const msg = new proto.jspb.test.TestLastFieldBeforePivot([null]);
    expect(msg.getLastFieldBeforePivot()).not.toBeUndefined();
  });

  it('testEqualsNonFinite', () => {
    expect(jspb.Message.compareFields(NaN, NaN)).toEqual(true);
    expect(jspb.Message.compareFields(NaN, 'NaN')).toEqual(true);
    expect(jspb.Message.compareFields('NaN', NaN)).toEqual(true);
    expect(jspb.Message.compareFields(Infinity, Infinity)).toEqual(true);
    expect(jspb.Message.compareFields(Infinity, 'Infinity')).toEqual(true);
    expect(jspb.Message.compareFields('-Infinity', -Infinity)).toEqual(true);
    expect(jspb.Message.compareFields([NaN], ['NaN'])).toEqual(true);
    expect(jspb.Message.compareFields(undefined, NaN)).toEqual(false);
    expect(jspb.Message.compareFields(NaN, undefined)).toEqual(false);
  });

  it('testToMap', () => {
    const p1 = new proto.jspb.test.Simple1(['k', ['v']]);
    const p2 = new proto.jspb.test.Simple1(['k1', ['v1', 'v2']]);
    const soymap = jspb.Message.toMap(
        [p1, p2], proto.jspb.test.Simple1.prototype.getAString,
        proto.jspb.test.Simple1.prototype.toObject);
    expect(soymap['k'].aString).toEqual('k');
    expect(soymap['k'].aRepeatedStringList).toEqual(['v']);
    const protomap = jspb.Message.toMap(
        [p1, p2], proto.jspb.test.Simple1.prototype.getAString);
    expect(protomap['k'].getAString()).toEqual('k');
    expect(protomap['k'].getARepeatedStringList()).toEqual(['v']);
  });

  it('testClone', () => {
    const supportsUint8Array =
        !goog.userAgent.IE || goog.userAgent.isVersionOrHigher('10');
    const original = new proto.jspb.test.TestClone();
    original.setStr('v1');
    const simple1 = new proto.jspb.test.Simple1(['x1', ['y1', 'z1']]);
    const simple2 = new proto.jspb.test.Simple1(['x2', ['y2', 'z2']]);
    const simple3 = new proto.jspb.test.Simple1(['x3', ['y3', 'z3']]);
    original.setSimple1(simple1);
    original.setSimple2List([simple2, simple3]);
    const bytes1 = supportsUint8Array ? new Uint8Array([1, 2, 3]) : '123';
    original.setBytesField(bytes1);
    const extension = new proto.jspb.test.CloneExtension();
    extension.setExt('e1');
    original.setExtension(proto.jspb.test.IsExtension.extField, extension);
    const clone = original.clone();
    expect(clone.toArray()).toEqual([
      'v1', , ['x1', ['y1', 'z1']], ,
      [['x2', ['y2', 'z2']], ['x3', ['y3', 'z3']]], bytes1, , {100: [, 'e1']}
    ]);
    clone.setStr('v2');
    const simple4 = new proto.jspb.test.Simple1(['a1', ['b1', 'c1']]);
    const simple5 = new proto.jspb.test.Simple1(['a2', ['b2', 'c2']]);
    const simple6 = new proto.jspb.test.Simple1(['a3', ['b3', 'c3']]);
    clone.setSimple1(simple4);
    clone.setSimple2List([simple5, simple6]);
    if (supportsUint8Array) {
      clone.getBytesField()[0] = 4;
      expect(original.getBytesField()).toEqual(bytes1);
    }
    const bytes2 = supportsUint8Array ? new Uint8Array([4, 5, 6]) : '456';
    clone.setBytesField(bytes2);
    const newExtension = new proto.jspb.test.CloneExtension();
    newExtension.setExt('e2');
    clone.setExtension(proto.jspb.test.CloneExtension.extField, newExtension);
    expect(clone.toArray()).toEqual([
      'v2', , ['a1', ['b1', 'c1']], ,
      [['a2', ['b2', 'c2']], ['a3', ['b3', 'c3']]], bytes2, , {100: [, 'e2']}
    ]);

    expect(original.toArray()).toEqual([
      'v1', , ['x1', ['y1', 'z1']], ,
      [['x2', ['y2', 'z2']], ['x3', ['y3', 'z3']]], bytes1, , {100: [, 'e1']}
    ]);
  });

  it('testCopyInto', () => {
    const supportsUint8Array =
        !goog.userAgent.IE || goog.userAgent.isVersionOrHigher('10');
    const original = new proto.jspb.test.TestClone();
    original.setStr('v1');
    const dest = new proto.jspb.test.TestClone();
    dest.setStr('override');
    const simple1 = new proto.jspb.test.Simple1(['x1', ['y1', 'z1']]);
    const simple2 = new proto.jspb.test.Simple1(['x2', ['y2', 'z2']]);
    const simple3 = new proto.jspb.test.Simple1(['x3', ['y3', 'z3']]);
    const destSimple1 = new proto.jspb.test.Simple1(['ox1', ['oy1', 'oz1']]);
    const destSimple2 = new proto.jspb.test.Simple1(['ox2', ['oy2', 'oz2']]);
    const destSimple3 = new proto.jspb.test.Simple1(['ox3', ['oy3', 'oz3']]);
    original.setSimple1(simple1);
    original.setSimple2List([simple2, simple3]);
    dest.setSimple1(destSimple1);
    dest.setSimple2List([destSimple2, destSimple3]);
    const bytes1 = supportsUint8Array ? new Uint8Array([1, 2, 3]) : '123';
    const bytes2 = supportsUint8Array ? new Uint8Array([4, 5, 6]) : '456';
    original.setBytesField(bytes1);
    dest.setBytesField(bytes2);
    const extension = new proto.jspb.test.CloneExtension();
    extension.setExt('e1');
    original.setExtension(proto.jspb.test.CloneExtension.extField, extension);

    jspb.Message.copyInto(original, dest);
    expect(dest.toArray()).toEqual(original.toArray());
    expect(dest.getSimple1().getAString()).toEqual('x1');
    expect(dest.getExtension(proto.jspb.test.CloneExtension.extField).getExt())
        .toEqual('e1');

    dest.getSimple1().setAString('new value');
    expect(dest.getSimple1().getAString())
        .not.toEqual(original.getSimple1().getAString());
    if (supportsUint8Array) {
      dest.getBytesField()[0] = 7;
      expect(original.getBytesField()).toEqual(bytes1);

      expect(dest.getBytesField()).toEqual(new Uint8Array([7, 2, 3]));
    } else {
      dest.setBytesField('789');
      expect(original.getBytesField()).toEqual(bytes1);
      expect(dest.getBytesField()).toEqual('789');
    }
    dest.getExtension(proto.jspb.test.CloneExtension.extField)
        .setExt('new value');
    expect(
        original.getExtension(proto.jspb.test.CloneExtension.extField).getExt())
        .not.toEqual(dest.getExtension(proto.jspb.test.CloneExtension.extField)
                         .getExt());
  });

  it('testCopyInto_notSameType', () => {
    const a = new proto.jspb.test.TestClone();
    const b = new proto.jspb.test.Simple1(['str', ['s1', 's2']]);

    expect(() => {jspb.Message.copyInto(a, b)})
        .toThrowError(Error, /should have the same type/);
  });

  it('testExtensions', () => {
    const extension1 = new proto.jspb.test.IsExtension(['ext1field']);
    const extension2 = new proto.jspb.test.Simple1(['str', ['s1', 's2']]);
    const extendable = new proto.jspb.test.HasExtensions(['v1', 'v2', 'v3']);
    extendable.setExtension(proto.jspb.test.IsExtension.extField, extension1);
    extendable.setExtension(
        proto.jspb.test.IndirectExtension.simple, extension2);
    extendable.setExtension(proto.jspb.test.IndirectExtension.str, 'xyzzy');
    extendable.setExtension(
        proto.jspb.test.IndirectExtension.repeatedStrList, ['a', 'b']);
    const s1 = new proto.jspb.test.Simple1(['foo', ['s1', 's2']]);
    const s2 = new proto.jspb.test.Simple1(['bar', ['t1', 't2']]);
    extendable.setExtension(
        proto.jspb.test.IndirectExtension.repeatedSimpleList, [s1, s2]);
    expect(extendable.getExtension(proto.jspb.test.IsExtension.extField))
        .toEqual(extension1);

    expect(extendable.getExtension(proto.jspb.test.IndirectExtension.simple))
        .toEqual(extension2);

    expect(extendable.getExtension(proto.jspb.test.IndirectExtension.str))
        .toEqual('xyzzy');

    expect(extendable.getExtension(
               proto.jspb.test.IndirectExtension.repeatedStrList))
        .toEqual(['a', 'b']);
    expect(extendable.getExtension(
               proto.jspb.test.IndirectExtension.repeatedSimpleList))
        .toEqual([s1, s2]);
    // Not supported yet, but it should work...
    extendable.setExtension(proto.jspb.test.IndirectExtension.simple, null);
    expect(extendable.getExtension(proto.jspb.test.IndirectExtension.simple))
        .toBeNull();
    extendable.setExtension(proto.jspb.test.IndirectExtension.str, null);
    expect(extendable.getExtension(proto.jspb.test.IndirectExtension.str))
        .toBeNull();


    // Extension fields with jspb.ignore = true are ignored.
    expect(proto.jspb.test.IndirectExtension['ignored']).toBeUndefined();
    expect(proto.jspb.test.HasExtensions['ignoredFloating']).toBeUndefined();
  });

  it('testFloatingExtensions', () => {
    // From an autogenerated container.
    let extendable = new proto.jspb.test.HasExtensions(['v1', 'v2', 'v3']);
    let extension = new proto.jspb.test.Simple1(['foo', ['s1', 's2']]);
    extendable.setExtension(proto.jspb.test.simple1, extension);
    expect(extendable.getExtension(proto.jspb.test.simple1)).toEqual(extension);

    // From _lib mode.
    extension = new proto.jspb.test.ExtensionMessage(['s1']);
    extendable = new proto.jspb.test.TestExtensionsMessage([16]);
    extendable.setExtension(proto.jspb.test.floatingMsgField, extension);
    extendable.setExtension(proto.jspb.test.floatingStrField, 's2');
    expect(extendable.getExtension(proto.jspb.test.floatingMsgField))
        .toEqual(extension);
    expect(extendable.getExtension(proto.jspb.test.floatingStrField))
        .toEqual('s2');
    expect(proto.jspb.exttest.floatingMsgField).not.toBeUndefined();
    expect(proto.jspb.exttest.floatingMsgFieldTwo).not.toBeUndefined();
    expect(proto.jspb.exttest.beta.floatingStrField).not.toBeUndefined();
  });

  it('testNestedExtensions', () => {
    const extendable =
        new proto.jspb.exttest.nested.TestNestedExtensionsMessage();
    const extension =
        new proto.jspb.exttest.nested.TestOuterMessage.NestedExtensionMessage(
            ['s1']);
    extendable.setExtension(
        proto.jspb.exttest.nested.TestOuterMessage.innerExtension, extension);
    expect(extendable.getExtension(
               proto.jspb.exttest.nested.TestOuterMessage.innerExtension))
        .toEqual(extension);
  });

  it('testToObject_extendedObject', () => {
    const extension1 = new proto.jspb.test.IsExtension(['ext1field']);
    const extension2 = new proto.jspb.test.Simple1(['str', ['s1', 's2'], true]);
    const extendable = new proto.jspb.test.HasExtensions(['v1', 'v2', 'v3']);
    extendable.setExtension(proto.jspb.test.IsExtension.extField, extension1);
    extendable.setExtension(
        proto.jspb.test.IndirectExtension.simple, extension2);
    extendable.setExtension(proto.jspb.test.IndirectExtension.str, 'xyzzy');
    extendable.setExtension(
        proto.jspb.test.IndirectExtension.repeatedStrList, ['a', 'b']);
    const s1 = new proto.jspb.test.Simple1(['foo', ['s1', 's2'], true]);
    const s2 = new proto.jspb.test.Simple1(['bar', ['t1', 't2'], false]);
    extendable.setExtension(
        proto.jspb.test.IndirectExtension.repeatedSimpleList, [s1, s2]);
    expect(extendable.toObject()).toEqual({
      str1: 'v1',
      str2: 'v2',
      str3: 'v3',
      extField: {ext1: 'ext1field'},
      simple:
          {aString: 'str', aRepeatedStringList: ['s1', 's2'], aBoolean: true},
      str: 'xyzzy',
      repeatedStrList: ['a', 'b'],
      repeatedSimpleList: [
        {aString: 'foo', aRepeatedStringList: ['s1', 's2'], aBoolean: true},
        {aString: 'bar', aRepeatedStringList: ['t1', 't2'], aBoolean: false}
      ]
    });

    // Now, with instances included.
    expect(extendable.toObject(true /* opt_includeInstance */)).toEqual({
      str1: 'v1',
      str2: 'v2',
      str3: 'v3',
      extField: {
        ext1: 'ext1field',
        $jspbMessageInstance:
            extendable.getExtension(proto.jspb.test.IsExtension.extField)
      },
      simple: {
        aString: 'str',
        aRepeatedStringList: ['s1', 's2'],
        aBoolean: true,
        $jspbMessageInstance:
            extendable.getExtension(proto.jspb.test.IndirectExtension.simple)
      },
      str: 'xyzzy',
      repeatedStrList: ['a', 'b'],
      repeatedSimpleList: [
        {
          aString: 'foo',
          aRepeatedStringList: ['s1', 's2'],
          aBoolean: true,
          $jspbMessageInstance: s1
        },
        {
          aString: 'bar',
          aRepeatedStringList: ['t1', 't2'],
          aBoolean: false,
          $jspbMessageInstance: s2
        }
      ],
      $jspbMessageInstance: extendable
    });
  });

  it('testInitialization_emptyArray', () => {
    const msg = new proto.jspb.test.HasExtensions([]);
    expect(msg.toArray()).toEqual([]);
  });

  it('testInitialization_justExtensionObject', () => {
    const msg = new proto.jspb.test.Empty([{1: 'hi'}]);
    // The extensionObject is not moved from its original location.
    expect(msg.toArray()).toEqual([{1: 'hi'}])
  });

  it('testInitialization_incompleteList', () => {
    const msg = new proto.jspb.test.Empty([1, {4: 'hi'}]);
    // The extensionObject is not moved from its original location.
    expect(msg.toArray()).toEqual([1, {4: 'hi'}]);
  });

  it('testInitialization_forwardCompatible', () => {
    const msg = new proto.jspb.test.Empty([1, 2, 3, {1: 'hi'}]);

    expect(msg.toArray()).toEqual([1, 2, 3, {1: 'hi'}]);
  });

  it('testExtendedMessageEnsureObject',
     /** @suppress {visibility} */ () => {
       const data =
           new proto.jspb.test.HasExtensions(['str1', {'a_key': 'an_object'}]);

       expect(jspb.Message.getField(data, ['a_key'])).toEqual('an_object');
     });

  it('testToObject_hasExtensionField', () => {
    const data =
        new proto.jspb.test.HasExtensions(['str1', {100: ['ext1'], 102: ''}]);
    const obj = data.toObject();
    expect(obj.str1).toEqual('str1');
    expect(obj.extField.ext1).toEqual('ext1');
    expect(obj.str).toEqual('');
  });

  it('testGetExtension', () => {
    const data = new proto.jspb.test.HasExtensions(['str1', {100: ['ext1']}]);
    expect(data.getStr1()).toEqual('str1');
    const extension = data.getExtension(proto.jspb.test.IsExtension.extField);
    expect(extension).not.toBeNull();
    expect(extension.getExt1()).toEqual('ext1');
  });

  it('testSetExtension', () => {
    const data = new proto.jspb.test.HasExtensions();
    const extensionMessage = new proto.jspb.test.IsExtension(['is_extension']);
    data.setExtension(proto.jspb.test.IsExtension.extField, extensionMessage);
    const obj = data.toObject();
    expect(data.getExtension(proto.jspb.test.IsExtension.extField))
        .not.toBeNull();
    expect(obj.extField.ext1).toEqual('is_extension');
  });

  /**
   * Note that group is long deprecated, we only support it because JsPb has
   * a goal of being able to generate JS classes for all proto descriptors.
   */
  it('testGroups', () => {
    const group = new proto.jspb.test.TestGroup();
    const someGroup = new proto.jspb.test.TestGroup.RepeatedGroup();
    someGroup.setId('g1');
    someGroup.setSomeBoolList([true, false]);
    group.setRepeatedGroupList([someGroup]);
    const groups = group.getRepeatedGroupList();
    expect(groups[0].getId()).toEqual('g1');
    expect(groups[0].getSomeBoolList()).toEqual([true, false]);
    expect(groups[0].toObject())
        .toEqual({id: 'g1', someBoolList: [true, false]});
    expect(group.toObject()).toEqual({
      repeatedGroupList: [{id: 'g1', someBoolList: [true, false]}],
      requiredGroup: {id: undefined},
      optionalGroup: undefined,
      requiredSimple: {aRepeatedStringList: [], aString: undefined},
      optionalSimple: undefined,
      id: undefined
    });
    const group1 = new proto.jspb.test.TestGroup1();
    group1.setGroup(someGroup);
    expect(group1.getGroup()).toEqual(someGroup);
  });

  it('testNonExtensionFieldsAfterExtensionRange', () => {
    const data = [{'1': 'a_string'}];
    const message = new proto.jspb.test.Complex(data);
    expect(message.getARepeatedStringList()).toEqual([])
  });

  it('testReservedGetterNames', () => {
    const message = new proto.jspb.test.TestReservedNames();
    message.setExtension$(11);
    message.setExtension(proto.jspb.test.TestReservedNamesExtension.foo, 12);
    expect(message.getExtension$()).toEqual(11);
    expect(message.getExtension(proto.jspb.test.TestReservedNamesExtension.foo))
        .toEqual(12);
    expect(message.toObject()).toEqual({extension: 11, foo: 12});
  });

  it('testInitializeMessageWithUnsetOneof', () => {
    const message = new proto.jspb.test.TestMessageWithOneof([]);
    expect(message.getPartialOneofCase())
        .toEqual(proto.jspb.test.TestMessageWithOneof.PartialOneofCase
                     .PARTIAL_ONEOF_NOT_SET);

    expect(message.getRecursiveOneofCase())
        .toEqual(proto.jspb.test.TestMessageWithOneof.RecursiveOneofCase
                     .RECURSIVE_ONEOF_NOT_SET);
  });

  it('testUnsetsOneofCaseWhenFieldIsCleared', () => {
    const message = new proto.jspb.test.TestMessageWithOneof;
    expect(message.getPartialOneofCase())
        .toEqual(proto.jspb.test.TestMessageWithOneof.PartialOneofCase
                     .PARTIAL_ONEOF_NOT_SET);


    message.setPone('hi');
    expect(message.getPartialOneofCase())
        .toEqual(proto.jspb.test.TestMessageWithOneof.PartialOneofCase.PONE);

    message.clearPone();
    expect(message.getPartialOneofCase())
        .toEqual(proto.jspb.test.TestMessageWithOneof.PartialOneofCase
                     .PARTIAL_ONEOF_NOT_SET);
  });

  it('testFloatingPointFieldsSupportNan', () => {
    const message = new proto.jspb.test.FloatingPointFields([
      'NaN', 'NaN', ['NaN', 'NaN'], 'NaN', 'NaN', 'NaN', ['NaN', 'NaN'], 'NaN'
    ]);
    expect(message.getOptionalFloatField()).toBeNaN();
    expect(message.getRequiredFloatField()).toBeNaN();
    expect(message.getRepeatedFloatFieldList()[0]).toBeNaN();
    expect(message.getRepeatedFloatFieldList()[1]).toBeNaN();
    expect(message.getDefaultFloatField()).toBeNaN();
    expect(message.getOptionalDoubleField()).toBeNaN();
    expect(message.getRequiredDoubleField()).toBeNaN()
    expect(message.getRepeatedDoubleFieldList()[0]).toBeNaN();
    expect(message.getRepeatedDoubleFieldList()[1]).toBeNaN();
    expect(message.getDefaultDoubleField()).toBeNaN();
  });

  it('testFloatingPointsAreConvertedFromStringInput', () => {
    const message = new proto.jspb.test.FloatingPointFields([
      Infinity, 'Infinity', ['Infinity', Infinity], 'Infinity', 'Infinity',
      'Infinity', ['Infinity', Infinity], 'Infinity'
    ]);
    expect(message.getOptionalFloatField()).toBePositiveInfinity();
    expect(message.getRequiredFloatField()).toBePositiveInfinity();
    expect(message.getRepeatedFloatFieldList()[0]).toBePositiveInfinity();
    expect(message.getRepeatedFloatFieldList()[1]).toBePositiveInfinity();
    expect(message.getDefaultFloatField()).toBePositiveInfinity();
    expect(message.getOptionalDoubleField()).toBePositiveInfinity();
    expect(message.getRequiredDoubleField()).toBePositiveInfinity();
    expect(message.getRepeatedDoubleFieldList()[0]).toBePositiveInfinity();
    expect(message.getRepeatedDoubleFieldList()[1]).toBePositiveInfinity();
    expect(message.getDefaultDoubleField()).toBePositiveInfinity();
  });

  it('testBooleansAreConvertedFromNumberInput', () => {
    let message = new proto.jspb.test.BooleanFields([1, 1, [true, 1]]);
    expect(message.getOptionalBooleanField()).toBeTrue();
    expect(message.getRequiredBooleanField()).toBeTrue();
    expect(message.getRepeatedBooleanFieldList()[0]).toBeTrue();
    expect(message.getRepeatedBooleanFieldList()[1]).toBeTrue();
    expect(message.getDefaultBooleanField()).toBeTrue();

    message = new proto.jspb.test.BooleanFields([0, 0, [0, 0]]);
    expect(message.getOptionalBooleanField()).toBeFalse();
    expect(message.getRequiredBooleanField()).toBeFalse();
    expect(message.getRepeatedBooleanFieldList()[0]).toBeFalse();
    expect(message.getRepeatedBooleanFieldList()[1]).toBeFalse();
  });

  it('testExtensionReverseOrder', () => {
    const message2 =
        new proto.jspb.exttest.reverse.TestExtensionReverseOrderMessage2;

    message2.setExtension(
        proto.jspb.exttest.reverse.TestExtensionReverseOrderMessage1.a, 233);
    message2.setExtension(
        proto.jspb.exttest.reverse.TestExtensionReverseOrderMessage1
            .TestExtensionReverseOrderNestedMessage1.b,
        2333);
    message2.setExtension(proto.jspb.exttest.reverse.c, 23333);

    expect(message2.getExtension(
               proto.jspb.exttest.reverse.TestExtensionReverseOrderMessage1.a))
        .toEqual(233);
    expect(message2.getExtension(
               proto.jspb.exttest.reverse.TestExtensionReverseOrderMessage1
                   .TestExtensionReverseOrderNestedMessage1.b))
        .toEqual(2333);
    expect(message2.getExtension(proto.jspb.exttest.reverse.c)).toEqual(23333);
  });

  it('testCircularDepsBaseOnMessageField', () => {
    const nestMessage1 = new proto.jspb.circulartest.MessageField1;
    const nestMessage2 = new proto.jspb.circulartest.MessageField2;
    const message1 = new proto.jspb.circulartest.MessageField1;
    const message2 = new proto.jspb.circulartest.MessageField2;

    nestMessage1.setA(1);
    nestMessage2.setA(2);
    message1.setB(nestMessage2);
    message2.setB(nestMessage1);


    expect(message1.getB().getA()).toEqual(2);
    expect(message2.getB().getA()).toEqual(1);
  });


  it('testCircularDepsBaseOnRepeatedMessageField', () => {
    const nestMessage1 = new proto.jspb.circulartest.RepeatedMessageField1;
    const nestMessage2 = new proto.jspb.circulartest.RepeatedMessageField2;
    const message1 = new proto.jspb.circulartest.RepeatedMessageField1;
    const message2 = new proto.jspb.circulartest.RepeatedMessageField2;

    nestMessage1.setA(1);
    nestMessage2.setA(2);
    message1.setB(nestMessage2);
    message2.addB(nestMessage1);


    expect(message1.getB().getA()).toEqual(2);
    expect(message2.getBList()[0].getA()).toEqual(1);
  });

  it('testCircularDepsBaseOnMapField', () => {
    const nestMessage1 = new proto.jspb.circulartest.MapField1;
    const nestMessage2 = new proto.jspb.circulartest.MapField2;
    const message1 = new proto.jspb.circulartest.MapField1;
    const message2 = new proto.jspb.circulartest.MapField2;

    nestMessage1.setA(1);
    nestMessage2.setA(2);
    message1.setB(nestMessage2);
    message2.getBMap().set(1, nestMessage1);


    expect(message1.getB().getA()).toEqual(2);
    expect(message2.getBMap().get(1).getA()).toEqual(1);
  });

  it('testCircularDepsBaseOnNestedMessage', () => {
    const nestMessage1 =
        new proto.jspb.circulartest.NestedMessage1.NestedNestedMessage;
    const nestMessage2 = new proto.jspb.circulartest.NestedMessage2;
    const message1 = new proto.jspb.circulartest.NestedMessage1;
    const message2 = new proto.jspb.circulartest.NestedMessage2;

    nestMessage1.setA(1);
    nestMessage2.setA(2);
    message1.setB(nestMessage2);
    message2.setB(nestMessage1);


    expect(message1.getB().getA()).toEqual(2);
    expect(message2.getB().getA()).toEqual(1);
  });

  it('testCircularDepsBaseOnNestedEnum', () => {
    const nestMessage2 = new proto.jspb.circulartest.NestedEnum2;
    const message1 = new proto.jspb.circulartest.NestedEnum1;
    const message2 = new proto.jspb.circulartest.NestedEnum2;

    nestMessage2.setA(2);
    message1.setB(nestMessage2);
    message2.setB(proto.jspb.circulartest.NestedEnum1.NestedNestedEnum.VALUE_1);


    expect(message1.getB().getA()).toEqual(2);
    expect(message2.getB())
        .toEqual(proto.jspb.circulartest.NestedEnum1.NestedNestedEnum.VALUE_1);
  });

  it('testCircularDepsBaseOnExtensionContainingType', () => {
    const nestMessage2 = new proto.jspb.circulartest.ExtensionContainingType2;
    const message1 = new proto.jspb.circulartest.ExtensionContainingType1;

    nestMessage2.setA(2);
    message1.setB(nestMessage2);
    message1.setExtension(
        proto.jspb.circulartest.ExtensionContainingType2.c, 1);


    expect(message1.getB().getA()).toEqual(2);
    expect(message1.getExtension(
               proto.jspb.circulartest.ExtensionContainingType2.c))
        .toEqual(1);
  });

  it('testCircularDepsBaseOnExtensionField', () => {
    const nestMessage2 = new proto.jspb.circulartest.ExtensionField2;
    const message1 = new proto.jspb.circulartest.ExtensionField1;
    const message3 = new proto.jspb.circulartest.ExtensionField3;

    nestMessage2.setA(2);
    message1.setB(nestMessage2);
    message3.setExtension(proto.jspb.circulartest.ExtensionField2.c, message1);


    expect(message3.getExtension(proto.jspb.circulartest.ExtensionField2.c)
               .getB()
               .getA())
        .toEqual(2);
  });

  it('testSameMessageNameOuputs', () => {
    const package1Message = new proto.jspb.filenametest.package1.TestMessage;
    const package2Message = new proto.jspb.filenametest.package2.TestMessage;

    package1Message.setExtension(proto.jspb.filenametest.package1.a, 10);
    package1Message.setExtension(proto.jspb.filenametest.package1.b, 11);
    package2Message.setA(12);

    expect(package1Message.getExtension(proto.jspb.filenametest.package1.a))
        .toEqual(10);
    expect(package1Message.getExtension(proto.jspb.filenametest.package1.b))
        .toEqual(11);
    expect(package2Message.getA()).toEqual(12);
  });


  it('testMessageWithLargeFieldNumbers', () => {
    const message = new proto.jspb.test.MessageWithLargeFieldNumbers;

    message.setAString('string');
    expect(message.getAString()).toEqual('string');

    message.setAString('');
    expect(message.getAString()).toEqual('');

    message.setAString('new string');
    expect(message.getAString()).toEqual('new string');

    message.setABoolean(true);
    expect(message.getABoolean()).toBeTrue();

    message.setABoolean(false);
    expect(message.getABoolean()).toBeFalse();

    message.setABoolean(true);
    expect(message.getABoolean()).toBeTrue();

    message.setAInt(42);
    expect(message.getAInt()).toEqual(42);

    message.setAInt(0);
    expect(message.getAInt()).toEqual(0);

    message.setAInt(42);
    expect(message.getAInt()).toEqual(42);
  });
});
