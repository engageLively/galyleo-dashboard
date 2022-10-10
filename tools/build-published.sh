#!/bin/bash
. ../scripts/lively-next-flatn-env.sh
lively_next_flatn_env "$(dirname "$(pwd)")"
node --inspect --no-warnings --experimental-import-meta-resolve --experimental-loader ../flatn/resolver.mjs ./tools/build-published.mjs
