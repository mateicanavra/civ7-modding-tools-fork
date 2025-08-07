#!/usr/bin/env node

const path = require("path");

require("@oclif/core")
    .execute({ dir: path.join(__dirname, "..") })
    .catch(require("@oclif/core").handle);
