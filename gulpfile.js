var {series} = require('gulp');
var execFile = require('child_process').execFile;
var glob = require('glob');
var fs = require('fs');

function exec(command, cb) {
  execFile('sh', ['-c', command], cb);
}

var plugin =   '--plugin=protoc-gen-js=bazel-bin/generator/protoc-gen-js';
var protoc = [(process.env.PROTOC || 'protoc'), plugin].join(' ');
var protocInc = process.env.PROTOC_INC || '../src';

var wellKnownTypes = [
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

wellKnownTypes.forEach((path, i) => protocInc + '/' + path);

var group1Protos = [
  'data.proto',
  'test3.proto',
  'test5.proto',
  'commonjs/test6/test6.proto',
  'test8.proto',
  'test11.proto',
  'test12.proto',
  'test13.proto',
  'test14.proto',
  'test15.proto',
  'testbinary.proto',
  'testempty.proto',
  'test.proto',
  'testlargenumbers.proto',
];

var group2Protos = [
  'proto3_test.proto',
  'test2.proto',
  'test4.proto',
  'commonjs/test7/test7.proto',
];

var group3Protos = [
  'test9.proto',
  'test10.proto'
];

function genproto_well_known_types_closure(cb) {
  exec(protoc + ' --js_out=one_output_file_per_input_file,binary:. -I ' + protocInc + ' -I . ' + wellKnownTypes.join(' '),
       function (err, stdout, stderr) {
         console.log(stdout);
         console.log(stderr);
         cb(err);
       });
}

function genproto_group1_closure(cb) {
  exec(protoc + ' --js_out=library=testproto_libs1,binary:.  -I ' + protocInc + ' -I . ' + group1Protos.join(' '),
       function (err, stdout, stderr) {
         console.log(stdout);
         console.log(stderr);
         cb(err);
       });
}

function genproto_group2_closure(cb) {
  exec(
      protoc +
        ' --experimental_allow_proto3_optional' +
        ' --js_out=library=testproto_libs2,binary:.  -I ' + protocInc + ' -I . -I commonjs ' +
        group2Protos.join(' '),
      function(err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
      });
}

function genproto_well_known_types_commonjs(cb) {
            exec('mkdir -p commonjs_out && ' + protoc + ' --js_out=import_style=commonjs,binary:commonjs_out -I ' + protocInc + ' ' + wellKnownTypes.join(' '),
                 function (err, stdout, stderr) {
                   console.log(stdout);
                   console.log(stderr);
                   cb(err);
                 });
}

function genproto_group1_commonjs(cb) {
            exec('mkdir -p commonjs_out && ' + protoc + ' --js_out=import_style=commonjs,binary:commonjs_out -I ' + protocInc + ' -I commonjs -I . ' + group1Protos.join(' '),
                 function (err, stdout, stderr) {
                   console.log(stdout);
                   console.log(stderr);
                   cb(err);
                 });
}

function genproto_group2_commonjs(cb) {
  exec(
      'mkdir -p commonjs_out && ' + protoc +
        ' --experimental_allow_proto3_optional --js_out=import_style=commonjs,binary:commonjs_out -I ' + protocInc + ' -I commonjs -I . ' +
        group2Protos.join(' '),
      function(err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
      });
}

function genproto_commonjs_wellknowntypes(cb) {
            exec('mkdir -p commonjs_out/node_modules/google-protobuf && ' + protoc + ' --js_out=import_style=commonjs,binary:commonjs_out/node_modules/google-protobuf -I ' + protocInc + ' ' + wellKnownTypes.join(' '),
                 function (err, stdout, stderr) {
                   console.log(stdout);
                   console.log(stderr);
                   cb(err);
                 });
}

function genproto_wellknowntypes(cb) {
            exec(protoc + ' --js_out=import_style=commonjs,binary:. -I ' + protocInc + ' ' + wellKnownTypes.join(' '),
                 function (err, stdout, stderr) {
                   console.log(stdout);
                   console.log(stderr);
                   cb(err);
                 });
}

function genproto_group3_commonjs_strict(cb) {
            exec('mkdir -p commonjs_out && ' + protoc + ' --js_out=import_style=commonjs_strict,binary:commonjs_out -I ' + protocInc + ' -I commonjs -I . ' + group3Protos.join(' '),
                 function (err, stdout, stderr) {
                   console.log(stdout);
                   console.log(stderr);
                   cb(err);
                 });
}


function getClosureCompilerCommand(exportsFile, outputFile) {
  const closureLib = 'node_modules/google-closure-library';
  return [
    'node_modules/.bin/google-closure-compiler',
    `--js=${closureLib}/closure/goog/**.js`,
    `--js=${closureLib}/third_party/closure/goog/**.js`, '--js=map.js',
    '--js=message.js', '--js=binary/arith.js', '--js=binary/constants.js',
    '--js=binary/decoder.js', '--js=binary/encoder.js', '--js=binary/reader.js',
    '--js=binary/utils.js', '--js=binary/writer.js', `--js=${exportsFile}`,
    `--entry_point=${exportsFile}`, `> ${outputFile}`
  ].join(' ');
}

function gen_google_protobuf_js(cb) {
  // TODO(haberman): minify this more aggressively.
  // Will require proper externs/exports.
  var log_file = fs.createWriteStream('/usr/local/google/home/dibenede/gulp.log', {flags:'w'});
  exec(
      getClosureCompilerCommand('commonjs/export.js', 'google-protobuf.js'),
      function(err, stdout, stderr) {
        log_file.write('building google-protobuf.js');
        if (err) {
          log_file.write('there was an error:',err);
        }
        log_file.write('done');
        console.log(stdout);
        console.log(stderr);
        cb(err);
      });
}


function commonjs_asserts(cb) {
            exec(
                'mkdir -p commonjs_out/test_node_modules && ' +
                  getClosureCompilerCommand(
                      'commonjs/export_asserts.js',
                      'commonjs_out/test_node_modules/closure_asserts_commonjs.js'),
                function(err, stdout, stderr) {
                  console.log(stdout);
                  console.log(stderr);
                  cb(err);
                });
}

function commonjs_testdeps(cb) {
            exec(
                'mkdir -p commonjs_out/test_node_modules && ' +
                  getClosureCompilerCommand(
                      'commonjs/export_testdeps.js',
                      'commonjs_out/test_node_modules/testdeps_commonjs.js'),
                function(err, stdout, stderr) {
                  console.log(stdout);
                  console.log(stderr);
                  cb(err);
                });
}

function commonjs_out(cb) {
          // TODO(haberman): minify this more aggressively.
          // Will require proper externs/exports.
          var cmd =
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
              function(err, stdout, stderr) {
                console.log(stdout);
                console.log(stderr);
                cb(err);
              });
}



function closure_make_deps(cb) {
  exec(
      './node_modules/.bin/closure-make-deps --closure-path=. --file=node_modules/google-closure-library/closure/goog/deps.js binary/arith.js binary/constants.js binary/decoder.js binary/encoder.js binary/reader.js binary/utils.js binary/writer.js debug.js map.js message.js node_loader.js test_bootstrap.js > deps.js',
      function(err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
      });
}

function test_closure(cb) {
  exec(
      'JASMINE_CONFIG_PATH=jasmine.json ./node_modules/.bin/jasmine',
      function(err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
      });
}

function test_commonjs(cb) {
  exec('cd commonjs_out && JASMINE_CONFIG_PATH=jasmine.json NODE_PATH=test_node_modules ../node_modules/.bin/jasmine',
       function (err, stdout, stderr) {
         console.log(stdout);
         console.log(stderr);
         cb(err);
       });
}

exports.build_protoc_plugin = function (cb) {
  exec('bazel build generator:protoc-gen-js',
       function (err, stdout, stderr) {
         console.log(stdout);
         console.log(stderr);
         cb(err);
       });
}

exports.dist = series(exports.build_protoc_plugin,
                      genproto_wellknowntypes,
                      gen_google_protobuf_js);

exports.make_commonjs_out = series(
    exports.dist,
    genproto_well_known_types_commonjs,
    genproto_group1_commonjs, genproto_group2_commonjs,
    genproto_commonjs_wellknowntypes, commonjs_asserts,
    commonjs_testdeps, genproto_group3_commonjs_strict,
    commonjs_out);

exports.deps = series(exports.build_protoc_plugin,
                      genproto_well_known_types_closure,
                      genproto_group1_closure,
                      genproto_group2_closure,
                      closure_make_deps);

exports.test_closure = series(exports.deps,
                              test_closure);

exports.test_commonjs = series(exports.make_commonjs_out,
                               test_commonjs);

exports.test = series(exports.test_closure,
                      exports.test_commonjs);
