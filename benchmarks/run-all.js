#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

/**
 * Runs all benchmarks sequentially and compares results
 */
class BenchmarkRunner {
    constructor() {
        this.wsUrl = process.env.WS_URL || 'ws://localhost:8090';
        this.socketioUrl = process.env.SOCKETIO_URL || 'http://localhost:3000';
        this.numConnections = process.env.NUM_CONNECTIONS || '100';
        this.numMessages = process.env.NUM_MESSAGES || '1000';
        this.messageSize = process.env.MESSAGE_SIZE || '100';
    }

    async runTest(scriptName, env) {
        return new Promise((resolve, reject) => {
            console.log(`\nStarting ${scriptName}...\n`);

            const proc = spawn('node', [path.join(__dirname, scriptName)], {
                env: { ...process.env, ...env },
                stdio: 'inherit'
            });

            proc.on('exit', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`${scriptName} exited with code ${code}`));
                }
            });

            proc.on('error', (err) => {
                reject(err);
            });
        });
    }

    async run() {
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║          WebSocket Performance Benchmark Suite               ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('Configuration:');
        console.log(`  WebSocket URL:     ${this.wsUrl}`);
        console.log(`  Socket.io URL:     ${this.socketioUrl}`);
        console.log(`  Connections:       ${this.numConnections}`);
        console.log(`  Messages:          ${this.numMessages}`);
        console.log(`  Message size:      ${this.messageSize} bytes`);
        console.log('');
        console.log('Make sure both servers are running before starting the tests!');
        console.log('  - WebSocket server:  cd websocket-server-ws && node server-ssl.js');
        console.log('  - Socket.io server:  cd websocket-server-socketio && node server.js');
        console.log('');

        // Wait for user confirmation
        await new Promise(resolve => {
            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });
            readline.question('Press Enter to continue (or Ctrl+C to abort)...', () => {
                readline.close();
                resolve();
            });
        });

        const env = {
            WS_URL: this.wsUrl,
            SOCKETIO_URL: this.socketioUrl,
            NUM_CONNECTIONS: this.numConnections,
            NUM_MESSAGES: this.numMessages,
            MESSAGE_SIZE: this.messageSize
        };

        try {
            // Run WebSocket benchmark
            await this.runTest('test-ws.js', env);
            console.log('\n✓ WebSocket benchmark completed\n');

            // Wait a bit between tests
            await new Promise(r => setTimeout(r, 2000));

            // Run Socket.io benchmark
            await this.runTest('test-socketio.js', env);
            console.log('\n✓ Socket.io benchmark completed\n');

            // Wait a bit before comparison
            await new Promise(r => setTimeout(r, 1000));

            // Run comparison
            await this.runTest('compare.js', {});
            console.log('\n✓ Comparison completed\n');

            console.log('╔═══════════════════════════════════════════════════════════════╗');
            console.log('║               All benchmarks completed successfully!          ║');
            console.log('╚═══════════════════════════════════════════════════════════════╝\n');

        } catch (err) {
            console.error('\n✗ Benchmark failed:', err.message);
            console.error('\nMake sure both servers are running and accessible.');
            process.exit(1);
        }
    }
}

// Run all benchmarks
if (require.main === module) {
    const runner = new BenchmarkRunner();
    runner.run().catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
}

module.exports = BenchmarkRunner;
