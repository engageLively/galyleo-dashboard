#!/bin/bash 
# A shell script to build the prebuilt extension, which can be deployed without compilation.
# ATM this is only for deployment mode; we can add debug mode later if desired.  See
# https://jupyterlab.readthedocs.io/en/stable/extension/extension_dev.html
# for a description of prebuilt extensions
cp  package-deploy.json package.json
npm install
npm run build
jupyter labextension build

