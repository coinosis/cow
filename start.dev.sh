#! /bin/bash

webpack-dev-server --define process.env.CALLBACK="'${1}'"
