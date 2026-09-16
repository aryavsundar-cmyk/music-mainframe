#!/usr/bin/env node
/**
 * watch-server.mjs — keeps the local news backend alive during a working session.
 * Restarts it if it exits, with backoff, and gives up after too many crashes in a row so a real fault is visible.
 *
 *   npm run server:watch
 *
 * Production does not need this: Render runs one service with a health check and restarts it itself.
 */
import { spawn } from 'node:child_process'

const MAX_FAST_CRASHES = 5
const FAST_MS = 10000
let fastCrashes = 0

function start() {
  const started = Date.now()
  const child = spawn(process.execPath, ['server/index.js'], { stdio: 'inherit', env: process.env })
  child.on('exit', (code, signal) => {
    const alive = Date.now() - started
    if (signal === 'SIGINT' || signal === 'SIGTERM') { process.exit(0); return }
    fastCrashes = alive < FAST_MS ? fastCrashes + 1 : 0
    if (fastCrashes >= MAX_FAST_CRASHES) {
      console.error(`\nwatch-server: ${MAX_FAST_CRASHES} crashes inside ${FAST_MS / 1000}s each — stopping so the fault is visible.`)
      process.exit(1)
    }
    const wait = Math.min(1000 * 2 ** fastCrashes, 30000)
    console.error(`\nwatch-server: server exited (${code ?? signal}) after ${Math.round(alive / 1000)}s — restarting in ${wait / 1000}s`)
    setTimeout(start, wait)
  })
  process.on('SIGINT', () => { child.kill('SIGINT'); process.exit(0) })
  process.on('SIGTERM', () => { child.kill('SIGTERM'); process.exit(0) })
}

console.log('watch-server: supervising server/index.js — Ctrl-C to stop')
start()
