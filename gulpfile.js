const { series } = require('gulp');
const execFile = require('child_process').execFile;
const glob = require('glob');

function exec(command, cb) {
  execFile('sh', ['-c', command], cb);
}

const plugin = '--plugin=protoc-gen-js=bazel-bin/generator/protoc-gen-js';
const protoc = [(process.env.PROTOC || 'protoc'), plugin].join(' ');
const protocInc = process.env.PROTOC_INC || '../src';

// Obtained by running bazel build //conformance:conformance_test_runner in
// https://github.com/protocolbuffers/protobuf under
// bazel-bin/conformance/conformance_test_runner
const protoConfonformanceRunner = process.env.PROTO_CONFORMANCE_RUNNER || 'conformance_test_runner';

// See https://github.com/google/closure-compiler/wiki/Flags-and-Options
let compilationLevel = 'SIMPLE';

const wellKnownTypes = [
  'google/protobuf/any.proto',
  'google/protobuf/api.proto',
  'google/protobuf/compiler/plugin.proto',
  'google/protobuf/descriptor.proto',
  'google/protobuf/duration.proto',
  'google/protobuf/empty.proto',
  'google/protobuf/field_mask.proto',
  'google/protobuf/source_context.proto',
  'google/protobuf/struct.proto',
  'google/protobuf/timestamp.proto',
  'google/protobuf/type.proto',
  'google/protobuf/wrappers.proto',
];

wellKnownTypes.forEach((path) => protocInc + '/' + path);

const group1Protos = [
  'protos/data.proto',
  'protos/test3.proto',
  'protos/test5.proto',
  'commonjs/test6/test6.proto',
  'protos/test8.proto',
  'protos/test11.proto',
  'protos/test12.proto',
  'protos/test13.proto',
  'protos/test14.proto',
  'protos/test15.proto',
  'protos/testbinary.proto',
  'protos/testempty.proto',
  'protos/test.proto',
  'protos/testlargenumbers.proto',
];

const group2Protos = [
  'protos/proto3_test.proto',
  'protos/test2.proto',
  'protos/test4.proto',
  'commonjs/test7/test7.proto',
];

const group3Protos = [
  'protos/test9.proto',
  'protos/test10.proto'
];

const conformanceProtos = [
  'conformance/protos/conformance.proto',
  'conformance/protos/test_messages_proto2.proto',
  'conformance/protos/test_messages_proto3.proto',
  'conformance/protos/test_messages_edition2023.proto',
  'conformance/protos/test_messages_proto2_editions.proto',
  'conformance/protos/test_messages_proto3_editions.proto'
];

function make_exec_logging_callback(cb) {
  return (err, stdout, stderr) => {
    console.log(stdout);
    console.error(stderr);
    cb(err);
  }
}

function enableAdvancedOptimizations(cb) {
  compilationLevel = 'SIMPLE';
  cb();
}

function enableSimpleOptimizations(cb) {
  compilationLevel = 'SIMPLE';
  cb();
}

function genproto_well_known_types_closure(cb) {
  exec(protoc + ' --js_out=one_output_file_per_input_file,binary:. -I ' + protocInc + ' -I . ' + wellKnownTypes.join(' '),
    make_exec_logging_callback(cb));
}

function genproto_group1_closure(cb) {
  exec(protoc + ' --js_out=library=testproto_libs1,binary:.  -I ' + protocInc + ' -I . ' + group1Protos.join(' '),
    make_exec_logging_callback(cb));
}

function genproto_group2_closure(cb) {
  exec(
    protoc +
    ' --experimental_allow_proto3_optional' +
    ' --js_out=library=testproto_libs2,binary:.  -I ' + protocInc + ' -I . -I commonjs ' +
    group2Protos.join(' '),
    make_exec_logging_callback(cb));
}

function genproto_well_known_types_commonjs(cb) {
            exec('mkdir -p commonjs_out && ' + protoc + ' --js_out=import_style=commonjs,binary:commonjs_out -I ' + protocInc + ' ' + wellKnownTypes.join(' '),
                 make_exec_logging_callback(cb));
}

function genproto_conformance_commonjs(cb) {
  exec(`${protoc} --js_out=import_style=commonjs,binary:conformance/protos -I ${protocInc} -I conformance/protos ${conformanceProtos.join(' ')}`,
    make_exec_logging_callback(cb));
}

function pack_google_protobuf(cb) {
  exec('npm pack',
    make_exec_logging_callback(cb));
}

function install_conformance_test_deps(cb) {
  exec('cd conformance && npm install ../google-protobuf-3.21.4.tgz',
    make_exec_logging_callback(cb));
}

function run_conformance_tests(cb) {
  exec(`${protoConfonformanceRunner} --enforce_recommended --maximum_edition 2023 --output_dir conformance/ conformance/runner.js`,
    make_exec_logging_callback(cb));
}

function genproto_group1_commonjs(cb) {
  exec('mkdir -p commonjs_out && ' + protoc + ' --js_out=import_style=commonjs,binary:commonjs_out -I ' + protocInc + ' -I commonjs -I . ' + group1Protos.join(' '),
    make_exec_logging_callback(cb));
}

function genproto_group2_commonjs(cb) {
  exec(
    'mkdir -p commonjs_out && ' + protoc +
    ' --experimental_allow_proto3_optional --js_out=import_style=commonjs,binary:commonjs_out -I ' + protocInc + ' -I commonjs -I . ' +
    group2Protos.join(' '),
    make_exec_logging_callback(cb));
}

function genproto_commonjs_wellknowntypes(cb) {
  exec('mkdir -p commonjs_out/node_modules/google-protobuf && ' + protoc + ' --js_out=import_style=commonjs,binary:commonjs_out/node_modules/google-protobuf -I ' + protocInc + ' ' + wellKnownTypes.join(' '),
    make_exec_logging_callback(cb));
}

function genproto_wellknowntypes(cb) {
  exec(protoc + ' --js_out=import_style=commonjs,binary:. -I ' + protocInc + ' ' + wellKnownTypes.join(' '),
    make_exec_logging_callback(cb));
}

function genproto_group3_commonjs_strict(cb) {
  exec('mkdir -p commonjs_out && ' + protoc + ' --js_out=import_style=commonjs_strict,binary:commonjs_out -I ' + protocInc + ' -I commonjs -I . ' + group3Protos.join(' '),
    make_exec_logging_callback(cb));
}


function getClosureCompilerCommand(exportsFile, outputFile) {
  const closureLib = 'node_modules/google-closure-library';
  return [
    'node_modules/.bin/google-closure-compiler',
    `--js=${closureLib}/closure/goog/**.js`,
    `--js=${closureLib}/third_party/closure/goog/**.js`,
    '--js=asserts.js',
    '--js=debug.js',
    '--js=internal_bytes.js',
    '--js=internal_options.js',
    '--js=internal_public.js',
    '--js=map.js',
    '--js=message.js',
    '--js=bytestring.js',
    '--js=unsafe_bytestring.js',
    '--js=binary/**.js',
    '--js=!binary/**_test.js',
    `--js=${exportsFile}`,
    '--generate_exports',
    `--compilation_level=${compilationLevel}`,
    '--export_local_property_definitions',
    `--entry_point=${exportsFile}`, `> ${outputFile}`
  ].join(' ');
}


function gen_google_protobuf_js(cb) {
  exec(
    getClosureCompilerCommand('commonjs/export.js', 'google-protobuf.js'),
    make_exec_logging_callback(cb));
}

function commonjs_testdeps(cb) {
  exec(
    'mkdir -p commonjs_out/test_node_modules && ' +
    getClosureCompilerCommand(
      'commonjs/export_testdeps.js',
      'commonjs_out/test_node_modules/testdeps_commonjs.js'),
    make_exec_logging_callback(cb));
}

function commonjs_out(cb) {
  let cmd =
    'mkdir -p commonjs_out/binary && mkdir -p commonjs_out/test_node_modules && ';
  function addTestFile(file) {
    cmd += 'node commonjs/rewrite_tests_for_commonjs.js < ' + file +
      ' > commonjs_out/' + file + '&& ';
  }

  glob.sync('*_test.js').forEach(addTestFile);
  glob.sync('binary/*_test.js').forEach(addTestFile);

  exec(
    cmd + 'cp commonjs/jasmine.json commonjs_out/jasmine.json && ' +
    'cp google-protobuf.js commonjs_out/test_node_modules && ' +
    'cp commonjs/strict_test.js commonjs_out/strict_test.js &&' +
    'cp commonjs/import_test.js commonjs_out/import_test.js',
    make_exec_logging_callback(cb));
}



function closure_make_deps(cb) {
  exec(
    './node_modules/.bin/closure-make-deps --closure-path=. --file=node_modules/google-closure-library/closure/goog/deps.js bytestring.js internal_bytes.js internal_options.js internal_public.js binary/arith.js binary/bytesource.js binary/binary_constants.js binary/decoder.js binary/decoder_alias.js binary/encoder.js binary/encoder_alias.js binary/errors.js binary/internal_buffer.js binary/reader.js binary/reader_alias.js binary/test_utils.js binary/utf8.js binary/utils.js binary/writer.js binary/writer_alias.js asserts.js debug.js map.js message.js node_loader.js test_bootstrap.js unsafe_bytestring.js > deps.js',
    make_exec_logging_callback(cb));
}

function test_closure(cb) {
  exec(
    'JASMINE_CONFIG_PATH=jasmine.json ./node_modules/.bin/jasmine --random=false',
    make_exec_logging_callback(cb));
}

function test_commonjs(cb) {
  exec('cd commonjs_out && JASMINE_CONFIG_PATH=jasmine.json NODE_PATH=test_node_modules ../node_modules/.bin/jasmine --random=false',
    make_exec_logging_callback(cb));
}

function remove_gen_files(cb) {
  exec('rm -rf commonjs_out google-protobuf.js deps.js google-protobuf-*.tgz conformance/protos/*.js',
       make_exec_logging_callback(cb));
}

exports.build_protoc_plugin = function (cb) {
  exec('bazel build generator:protoc-gen-js',
    make_exec_logging_callback(cb));
}

const dist = series(exports.build_protoc_plugin,
  genproto_wellknowntypes,
  gen_google_protobuf_js);

exports.dist = series(enableAdvancedOptimizations, dist);

exports.build_commonjs = series(
  dist,
  genproto_well_known_types_commonjs,
  genproto_group1_commonjs, genproto_group2_commonjs,
  genproto_commonjs_wellknowntypes,
  commonjs_testdeps, genproto_group3_commonjs_strict,
  commonjs_out);

exports.build_closure = series(exports.build_protoc_plugin,
  genproto_well_known_types_closure,
  genproto_group1_closure,
  genproto_group2_closure,
  closure_make_deps);

const test_closure_series = series(
  exports.build_closure,
  test_closure);

exports.test_closure = series(enableSimpleOptimizations,
  test_closure_series);

exports.test_closure_opt = series(enableAdvancedOptimizations,
  test_closure_series);

const test_commonjs_series = series(
  exports.build_commonjs,
  test_commonjs);


exports.test_commonjs = series(enableSimpleOptimizations,
  test_commonjs_series);
exports.test_commonjs_opt = series(enableAdvancedOptimizations,
  test_commonjs_series);

const test_series = series(test_closure_series,
  test_commonjs_series);

exports.test = series(enableSimpleOptimizations,
  test_series);

exports.test_opt = series(enableAdvancedOptimizations,
  test_series);

exports.test_conformance = series(dist, genproto_conformance_commonjs, pack_google_protobuf, install_conformance_test_deps, run_conformance_tests);

exports.clean = series(remove_gen_files);
