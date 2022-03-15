#!/bin/bash 
# usage: make <-h> <-d>
# build -h: print message and extension
# build -d: enable debug mode
# NOTE: MUST BE RUN IN THE jupyterlab-universal-extension directory!
mode="deploy"
while getopts ":hd" opt; do
  case ${opt} in
    h )
      echo "Usage:"
      echo "    make.sh -h                      Display this help message."
      echo "    make.sh -d                      Use debug mode."
      echo "NOTE: MUST BE RUN IN THE jupyterlab-universal-extension directory!"
      exit 0
      ;;
    d )
      mode="debug"
      ;;
    \? )
      echo "Invalid Option: -$OPTARG" 1>&2
      echo "Usage:"
      echo "    make.sh -h                      Display this help message."
      echo "    make.sh -d                      Use debug mode."
      echo "NOTE: MUST BE RUN IN THE jupyterlab-universal-extension directory!"
      
      exit 1
      ;;
  esac
done
# Do the build.
# In debug mode, use the debug package file,
# which has the schema for the Galyleo settings.  Also set
# debugMode = true in lib/editor.js.  Note that if we did this in 
# src/editor.ts, we'd screw up git.  So what we need to do is
# overwrite the js file AFTER compilation and BEFORE the extension
# is built
# in deployment mode, use the deployment package file (no Galyleo settings)
# and just do a straight build -- by default, debugMode = false 
if [ "$mode" = "debug" ]; then
   cp package-debug.json package.json
   npm install
   npm run build
   sed "/debugMode/s/false/true/" lib/editor.js > .tmp.js
   mv .tmp.js lib/editor.js
   jupyter labextension install
else
   cp  package-deploy.json package.json
   npm install
   npm run build
   jupyter labextension install
fi
