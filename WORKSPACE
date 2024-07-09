workspace(name = "com_google_protobuf_javascript")

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "com_google_protobuf",
    urls = ["https://github.com/protocolbuffers/protobuf/archive/refs/tags/v27.1.zip"],
    sha256 = "9e6dbaefbfc670037e1a25ac4434adea1403821950444ec40fab8b2a9423c2ea",
    strip_prefix = "protobuf-27.1",
)

load("@com_google_protobuf//:protobuf_deps.bzl", "protobuf_deps")
protobuf_deps()


# Taken from
# https://github.com/bazelbuild/rules_pkg/blob/main/pkg/deps.bzl.
#
# This is required under bazel 6 according to
# https://github.com/bazelbuild/rules_pkg/issues/872, otherwise we
# will see the same error.
http_archive(
    name = "rules_python",
    sha256 = "0a8003b044294d7840ac7d9d73eef05d6ceb682d7516781a4ec62eeb34702578",
    strip_prefix = "rules_python-0.24.0",
    url = "https://github.com/bazelbuild/rules_python/releases/download/0.24.0/rules_python-0.24.0.tar.gz",
)

load("@rules_pkg//:deps.bzl", "rules_pkg_dependencies")
rules_pkg_dependencies()
