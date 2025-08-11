#!/usr/bin/env -S bun run

import { run, handle } from '@oclif/core'

const argv = process.argv.slice(2)

;(async () => {
  try {
    // Use this module's URL so oclif can resolve the package root (dev from src)
    await run(argv, import.meta.url)
  } catch (err) {
    handle(err)
  }
})()


