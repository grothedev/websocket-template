#!/usr/bin/env node
/**
 * Runtime Comparison Runner
 * Runs WebSocket benchmarks across Node.js, Deno, and Bun
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class RuntimeComparisonRunner {
    constructor() {
        this.wsUrl = process.env.WS_URL || 'ws://localhost:8090';
        this.numConnections = process.env.NUM_CONNECTIONS || '100';
        this.numMessages = process.env.NUM_MESSAGES || '1000';
        this.messageSize = process.env.MESSAGE_SIZE || '100';

        // Detect which runtimes are available
        this.runtimes = [];
    }

    async checkRuntime(command, name) {
        return new Promise((resolve) => {
            const proc = spawn(command, ['--version'], {
                stdio: 'pipe',
                shell: true
            });

            let output = '';
            proc.stdout?.on('data', (data) => {
                output += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    const version = output.trim().split('\n')[0];
                    resolve({ available: true, version });
                } else {
                    resolve({ available: false, version: null });
                }
            });

            proc.on('error', () => {
                resolve({ available: false, version: null });
            });
        });
    }

    async detectRuntimes() {
        console.log('Detecting available JavaScript runtimes...\n');

        const checks = [
            { cmd: 'node', name: 'Node.js', runtime: 'node' },
            { cmd: 'deno', name: 'Deno', runtime: 'deno' },
            { cmd: 'bun', name: 'Bun', runtime: 'bun' }
        ];

        for (const { cmd, name, runtime } of checks) {
            const result = await this.checkRuntime(cmd, name);
            if (result.available) {
                console.log(`✓ ${name} detected: ${result.version}`);
                this.runtimes.push({ name, cmd, runtime, version: result.version });
            } else {
                console.log(`✗ ${name} not found`);
            }
        }

        console.log('');

        if (this.runtimes.length === 0) {
            throw new Error('No JavaScript runtimes detected. Please install Node.js, Deno, or Bun.');
        }

        return this.runtimes;
    }

    async runTest(runtime, env) {
        return new Promise((resolve, reject) => {
            console.log(`\n${'='.repeat(70)}`);
            console.log(`Running benchmark with ${runtime.name}`);
            console.log(`${'='.repeat(70)}\n`);

            let proc;
            const testFile = join(__dirname, 'test-ws.mjs');

            if (runtime.runtime === 'node') {
                proc = spawn('node', [testFile], {
                    env: { ...process.env, ...env },
                    stdio: 'inherit'
                });
            } else if (runtime.runtime === 'deno') {
                proc = spawn('deno', ['run', '--allow-net', '--allow-env', '--allow-write', '--allow-read', testFile], {
                    env: { ...process.env, ...env },
                    stdio: 'inherit'
                });
            } else if (runtime.runtime === 'bun') {
                proc = spawn('bun', ['run', testFile], {
                    env: { ...process.env, ...env },
                    stdio: 'inherit'
                });
            }

            proc.on('exit', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`${runtime.name} benchmark exited with code ${code}`));
                }
            });

            proc.on('error', (err) => {
                reject(err);
            });
        });
    }

    async run() {
        console.log('╔═══════════════════════════════════════════════════════════════════╗');
        console.log('║        WebSocket Runtime Comparison Benchmark Suite              ║');
        console.log('╚═══════════════════════════════════════════════════════════════════╝');
        console.log('');

        // Detect available runtimes
        await this.detectRuntimes();

        console.log('Configuration:');
        console.log(`  WebSocket URL:     ${this.wsUrl}`);
        console.log(`  Connections:       ${this.numConnections}`);
        console.log(`  Messages:          ${this.numMessages}`);
        console.log(`  Message size:      ${this.messageSize} bytes`);
        console.log('');
        console.log(`Detected runtimes: ${this.runtimes.map(r => r.name).join(', ')}`);
        console.log('');
        console.log('Make sure the WebSocket server is running before starting!');
        console.log('  cd websocket-server-ws && node server-ssl.js');
        console.log('');

        // Wait for user confirmation
        await new Promise(resolve => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl.question('Press Enter to continue (or Ctrl+C to abort)... ', () => {
                rl.close();
                resolve();
            });
        });

        const env = {
            WS_URL: this.wsUrl,
            NUM_CONNECTIONS: this.numConnections,
            NUM_MESSAGES: this.numMessages,
            MESSAGE_SIZE: this.messageSize
        };

        try {
            for (const runtime of this.runtimes) {
                await this.runTest(runtime, env);
                console.log(`\n✓ ${runtime.name} benchmark completed\n`);

                // Wait between tests
                if (this.runtimes.indexOf(runtime) < this.runtimes.length - 1) {
                    console.log('Waiting 2 seconds before next test...\n');
                    await new Promise(r => setTimeout(r, 2000));
                }
            }

            console.log('\n' + '='.repeat(70));
            console.log('Running comparison...');
            console.log('='.repeat(70) + '\n');

            // Run comparison
            await this.runComparison();

            console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
            console.log('║            All runtime benchmarks completed successfully!         ║');
            console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

        } catch (err) {
            console.error('\n✗ Benchmark failed:', err.message);
            console.error('\nMake sure the WebSocket server is running and accessible.');
            process.exit(1);
        }
    }

    async runComparison() {
        return new Promise((resolve, reject) => {
            const proc = spawn('node', [join(__dirname, 'compare-runtimes.mjs')], {
                env: {
                    ...process.env,
                    RUNTIMES: this.runtimes.map(r => r.runtime).join(',')
                },
                stdio: 'inherit'
            });

            proc.on('exit', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Comparison exited with code ${code}`));
                }
            });

            proc.on('error', (err) => {
                reject(err);
            });
        });
    }
}

// Run all benchmarks
const runner = new RuntimeComparisonRunner();
runner.run().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
