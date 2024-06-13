workspace(name = "com_google_protobuf_javascript")

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "com_google_protobuf",
    urls = ["https://github.com/protocolbuffers/protobuf/archive/refs/tags/v27.1.zip"],
    sha256 = "7d7f2ddccc37e3c1c5dfe65ad69d99923d8fe84beac68ed9cdec489909c4d8d3",
    strip_prefix = "protobuf-27.1",
)

load("@com_google_protobuf//:protobuf_deps.bzl", "protobuf_deps")

protobuf_deps()

load("@rules_pkg//:deps.bzl", "rules_pkg_dependencies")
rules_pkg_dependencies()
