#!/bin/bash 
# usage: build <-h> <-d>
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