cc_binary(
    name = "protoc-gen-js",
    srcs = [
        "js_generator.cc",
        "js_generator.h",
        "protoc-gen-js.cc",
        "well_known_types_embed.cc",
        "well_known_types_embed.h",
    ],
    visibility = ["//visibility:public"],
    deps = [
        #"@com_google_absl//absl/base:core_headers",
        #"@com_google_absl//absl/container:flat_hash_map",
        #"@com_google_absl//absl/container:flat_hash_set",
        #"@com_google_absl//absl/strings",
        "@com_google_protobuf//:protobuf",
        "@com_google_protobuf//:protoc_lib",
    ],
)
