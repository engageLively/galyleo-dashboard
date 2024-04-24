#!/bin/bash
. ../../scripts/lively-next-flatn-env.sh
lively_next_flatn_env "$(dirname "$(dirname "$(pwd)")")"
export FLATN_DEV_PACKAGE_DIRS=$FLATN_DEV_PACKAGE_DIRS:$(pwd);


# Set default value for lang
lang="en"

# Parse command line options
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    --lang)
    lang="$2"
    shift
    shift
    ;;
    *)
    echo "Unknown option: $key"
    exit 1
    ;;
esac
done

# Set path based on language
case $lang in
    en)
    path="./tools/build-en.mjs"
    ;;
    jp)
    path="./tools/build-jp.mjs"
    ;;
    *)
    echo "Invalid language option: $lang"
    exit 1
    ;;
esac

echo "Selected language: $lang"
echo "Path: $path"

node --no-warnings --experimental-import-meta-resolve --experimental-loader ../../flatn/resolver.mjs ${path}
