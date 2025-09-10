#!/usr/bin/env bash

set -euo pipefail

mkdir -p generated

# recursively find all *.crd.yaml files and symlink them to ./openshift-crds directory
rm -rf ./generated/openshift-crds
mkdir -p ./generated/openshift-crds
cd ./generated/openshift-crds
find ../../ -type f -name "*.crd.yaml" -exec ln -sf {} ./ \;
