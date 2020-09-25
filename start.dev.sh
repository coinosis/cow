#! /bin/bash

webpack-dev-server --define process.env.CALLBACK="'https://${1}.loclx.io'"
