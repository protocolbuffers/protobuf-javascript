#!/usr/bin/env -S node

const { ConformanceRequest, ConformanceResponse, WireFormat } = require('./protos/conformance_pb.js');
const { TestAllTypesProto2 } = require('./protos/test_messages_proto2_pb.js');
const { TestAllTypesProto3 } = require('./protos/test_messages_proto3_pb.js');
const { TestAllTypesEdition2023 } = require('./protos/test_messages_edition2023_pb.js');
const { TestAllTypesProto2: TestAllTypesProto2Edition2023 } = require('./protos/test_messages_proto2_editions_pb.js');
const { TestAllTypesProto3: TestAllTypesProto3Edition2023 } = require('./protos/test_messages_proto3_editions_pb.js');

const fs = require('fs');

/**
 * Creates a `proto.conformance.ConformanceResponse` response according to the
 * `proto.conformance.ConformanceRequest` request.
 * @param {!ConformanceRequest} request
 * @return {!ConformanceResponse} response
 */
function doTest(request) {
  const response = new ConformanceResponse();

  if (request.getPayloadCase() === ConformanceRequest.PayloadCase.JSON_PAYLOAD) {
    response.setSkipped('Json is not supported as input format.');
    return response;
  }

  if (request.getPayloadCase() === ConformanceRequest.PayloadCase.TEXT_PAYLOAD) {
    response.setSkipped('Text format is not supported as input format.');
    return response;
  }

  if (request.getPayloadCase() === ConformanceRequest.PayloadCase.PAYLOAD_NOT_SET) {
    response.setRuntimeError('Request didn\'t have payload.');
    return response;
  }

  if (request.getPayloadCase() !== ConformanceRequest.PayloadCase.PROTOBUF_PAYLOAD) {
    throw new Error('Request didn\'t have accepted input format.');
  }

  if (request.getRequestedOutputFormat() === WireFormat.JSON) {
    response.setSkipped('Json is not supported as output format.');
    return response;
  }

  if (request.getRequestedOutputFormat() === WireFormat.TEXT_FORMAT) {
    response.setSkipped('Text format is not supported as output format.');
    return response;
  }

  if (request.getRequestedOutputFormat() === WireFormat.TEXT_FORMAT) {
    response.setRuntimeError('Unspecified output format');
    return response;
  }

  if (request.getRequestedOutputFormat() !== WireFormat.PROTOBUF) {
    throw new Error('Request didn\'t have accepted output format.');
  }

  if (request.getMessageType() === 'conformance.FailureSet') {
    response.setProtobufPayload(new ArrayBuffer(0));
  } else if (
    request.getMessageType() ===
    'protobuf_test_messages.proto2.TestAllTypesProto2') {
    try {
      const testMessage =
        TestAllTypesProto2.deserializeBinary(request.getProtobufPayload());
      response.setProtobufPayload(testMessage.serializeBinary());
    } catch (err) {
      response.setParseError(err.toString());
    }
  } else if (
    request.getMessageType() ===
    'protobuf_test_messages.proto3.TestAllTypesProto3') {
    try {
      const testMessage =
        TestAllTypesProto3.deserializeBinary(request.getProtobufPayload());
      response.setProtobufPayload(testMessage.serializeBinary());
    } catch (err) {
      response.setParseError(err.toString());
    }
  } else if (
    request.getMessageType() ===
    'protobuf_test_messages.editions.TestAllTypesEdition2023') {
    try {
      const testMessage =
        TestAllTypesEdition2023.deserializeBinary(request.getProtobufPayload());
      response.setProtobufPayload(testMessage.serializeBinary());
    } catch (err) {
      response.setParseError(err.toString());
    }
  } else if (
    request.getMessageType() ===
    'protobuf_test_messages.editions.proto2.TestAllTypesProto2') {
    try {
      const testMessage =
        TestAllTypesProto2Edition2023.deserializeBinary(request.getProtobufPayload());
      response.setProtobufPayload(testMessage.serializeBinary());
    } catch (err) {
      response.setParseError(err.toString());
    }
  } else if (
    request.getMessageType() ===
    'protobuf_test_messages.editions.proto3.TestAllTypesProto3') {
    try {
      const testMessage =
        TestAllTypesProto3Edition2023.deserializeBinary(request.getProtobufPayload());
      response.setProtobufPayload(testMessage.serializeBinary());
    } catch (err) {
      response.setParseError(err.toString());
    }
  } else {
    throw new Error(
      `Payload message not supported: ${request.getMessageType()}.`);
  }

  return response;
}

/**
 * Reads a buffer of N bytes.
 * @param {number} bytes Number of bytes to read.
 * @return {!Buffer} Buffer which contains data.
 */
function readBuffer(bytes) {
  // Linux cannot use process.stdin.fd (which isn't set up as sync)
  const buf = new Buffer.alloc(bytes);
  const fd = fs.openSync('/dev/stdin', 'r');
  fs.readSync(fd, buf, 0, bytes);
  fs.closeSync(fd);
  return buf;
}

/**
 * Writes all data in buffer.
 * @param {!Buffer} buffer Buffer which contains data.
 */
function writeBuffer(buffer) {
  // Under linux, process.stdout.fd is async. Needs to open stdout in a synced
  // way for sync write.
  const fd = fs.openSync('/dev/stdout', 'w');
  fs.writeSync(fd, buffer, 0, buffer.length);
  fs.closeSync(fd);
}

/**
 * Returns true if the test ran successfully, false on legitimate EOF.
 * @return {boolean} Whether to continue test.
 */
function runConformanceTest() {
  const requestLengthBuf = readBuffer(4);
  const requestLength = requestLengthBuf.readInt32LE(0);
  if (!requestLength) {
    return false;
  }

  const serializedRequest = readBuffer(requestLength);
  const array = new Uint8Array(serializedRequest);
  const request = ConformanceRequest.deserializeBinary(array.buffer);
  const response = doTest(request);

  const serializedResponse = response.serializeBinary();

  const responseLengthBuf = new Buffer.alloc(4);
  responseLengthBuf.writeInt32LE(serializedResponse.byteLength, 0);
  writeBuffer(responseLengthBuf);
  writeBuffer(new Buffer.from(serializedResponse));

  return true;
}

while (true) {
  if (!runConformanceTest()) {
    break;
  }
}
