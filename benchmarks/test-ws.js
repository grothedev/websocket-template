const WebSocket = require('ws');
const { performance } = require('perf_hooks');

// Test configuration
const SERVER_URL = process.env.WS_URL || 'ws://localhost:8090';
const NUM_CONNECTIONS = parseInt(process.env.NUM_CONNECTIONS) || 100;
const NUM_MESSAGES = parseInt(process.env.NUM_MESSAGES) || 1000;
const MESSAGE_SIZE = parseInt(process.env.MESSAGE_SIZE) || 100; // bytes

class WSBenchmark {
    constructor() {
        this.results = {
            implementation: 'Native WebSocket (ws)',
            serverUrl: SERVER_URL,
            config: {
                connections: NUM_CONNECTIONS,
                messagesPerConnection: NUM_MESSAGES,
                messageSize: MESSAGE_SIZE
            },
            connectionTime: [],
            latencies: [],
            errors: 0,
            memoryBefore: 0,
            memoryAfter: 0,
            startTime: 0,
            endTime: 0
        };
    }

    async testConnectionTime() {
        console.log('Testing connection establishment time...');
        const times = [];

        for (let i = 0; i < 10; i++) {
            const start = performance.now();
            const ws = new WebSocket(SERVER_URL);

            await new Promise((resolve, reject) => {
                ws.on('open', () => {
                    const end = performance.now();
                    times.push(end - start);
                    ws.close();
                    resolve();
                });
                ws.on('error', (err) => {
                    this.results.errors++;
                    ws.close();
                    reject(err);
                });
            }).catch(() => {});
        }

        this.results.connectionTime = times;
        console.log(`Average connection time: ${this.average(times).toFixed(2)}ms`);
    }

    async testLatency() {
        console.log('Testing message round-trip latency...');
        const ws = new WebSocket(SERVER_URL);
        const latencies = [];

        await new Promise((resolve, reject) => {
            ws.on('open', async () => {
                for (let i = 0; i < 100; i++) {
                    const start = performance.now();
                    const testData = { action: 'echo', data: 'x'.repeat(MESSAGE_SIZE) };

                    ws.send(JSON.stringify(testData));

                    await new Promise(resolveMsg => {
                        const handler = (msg) => {
                            try {
                                const parsed = JSON.parse(msg.toString());
                                if (parsed.action === 'echo') {
                                    const end = performance.now();
                                    latencies.push(end - start);
                                    ws.off('message', handler);
                                    resolveMsg();
                                }
                            } catch (e) {
                                this.results.errors++;
                            }
                        };
                        ws.on('message', handler);
                    });
                }
                ws.close();
                resolve();
            });

            ws.on('error', (err) => {
                this.results.errors++;
                reject(err);
            });
        }).catch(() => {});

        this.results.latencies = latencies;
        console.log(`Average latency: ${this.average(latencies).toFixed(2)}ms`);
    }

    async testThroughput() {
        console.log(`Testing throughput with ${NUM_CONNECTIONS} connections...`);
        this.results.memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;
        this.results.startTime = performance.now();

        const connections = [];
        const promises = [];

        // Create multiple connections
        for (let i = 0; i < NUM_CONNECTIONS; i++) {
            const promise = new Promise((resolve, reject) => {
                const ws = new WebSocket(SERVER_URL);
                let messagesSent = 0;
                let messagesReceived = 0;

                ws.on('open', () => {
                    connections.push(ws);

                    // Send messages
                    const sendInterval = setInterval(() => {
                        if (messagesSent >= NUM_MESSAGES) {
                            clearInterval(sendInterval);
                            return;
                        }

                        const msg = {
                            action: 'update_pos',
                            data: {
                                pos: [Math.random() * 1000, Math.random() * 1000],
                                nick: `client_${i}`
                            }
                        };
                        ws.send(JSON.stringify(msg));
                        messagesSent++;
                    }, 10);

                    ws.on('message', (msg) => {
                        messagesReceived++;
                        if (messagesReceived >= NUM_MESSAGES) {
                            ws.close();
                            resolve({ sent: messagesSent, received: messagesReceived });
                        }
                    });
                });

                ws.on('error', (err) => {
                    this.results.errors++;
                    ws.close();
                    reject(err);
                });

                ws.on('close', () => {
                    if (messagesReceived < NUM_MESSAGES) {
                        resolve({ sent: messagesSent, received: messagesReceived });
                    }
                });

                // Timeout after 30 seconds
                setTimeout(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.close();
                        resolve({ sent: messagesSent, received: messagesReceived });
                    }
                }, 30000);
            });

            promises.push(promise);
        }

        await Promise.allSettled(promises);

        this.results.endTime = performance.now();
        this.results.memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;

        const duration = (this.results.endTime - this.results.startTime) / 1000;
        const totalMessages = NUM_CONNECTIONS * NUM_MESSAGES;
        const throughput = totalMessages / duration;

        console.log(`Duration: ${duration.toFixed(2)}s`);
        console.log(`Throughput: ${throughput.toFixed(2)} messages/sec`);
        console.log(`Memory used: ${(this.results.memoryAfter - this.results.memoryBefore).toFixed(2)}MB`);
    }

    async run() {
        console.log('\n=== WebSocket (ws) Performance Benchmark ===\n');

        try {
            await this.testConnectionTime();
            await new Promise(r => setTimeout(r, 1000));

            await this.testLatency();
            await new Promise(r => setTimeout(r, 1000));

            await this.testThroughput();

            this.printResults();
        } catch (err) {
            console.error('Benchmark failed:', err.message);
        }
    }

    average(arr) {
        return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    }

    median(arr) {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }

    percentile(arr, p) {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    printResults() {
        const duration = (this.results.endTime - this.results.startTime) / 1000;
        const totalMessages = NUM_CONNECTIONS * NUM_MESSAGES;
        const throughput = totalMessages / duration;

        console.log('\n=== Results Summary ===\n');
        console.log('Connection Time:');
        console.log(`  Average: ${this.average(this.results.connectionTime).toFixed(2)}ms`);
        console.log(`  Median: ${this.median(this.results.connectionTime).toFixed(2)}ms`);
        console.log(`  95th percentile: ${this.percentile(this.results.connectionTime, 95).toFixed(2)}ms`);

        console.log('\nLatency (Round-trip):');
        console.log(`  Average: ${this.average(this.results.latencies).toFixed(2)}ms`);
        console.log(`  Median: ${this.median(this.results.latencies).toFixed(2)}ms`);
        console.log(`  95th percentile: ${this.percentile(this.results.latencies, 95).toFixed(2)}ms`);

        console.log('\nThroughput:');
        console.log(`  Total messages: ${totalMessages}`);
        console.log(`  Duration: ${duration.toFixed(2)}s`);
        console.log(`  Messages/sec: ${throughput.toFixed(2)}`);

        console.log('\nResource Usage:');
        console.log(`  Memory before: ${this.results.memoryBefore.toFixed(2)}MB`);
        console.log(`  Memory after: ${this.results.memoryAfter.toFixed(2)}MB`);
        console.log(`  Memory used: ${(this.results.memoryAfter - this.results.memoryBefore).toFixed(2)}MB`);

        console.log(`\nErrors: ${this.results.errors}`);

        // Save results to JSON
        const fs = require('fs');
        fs.writeFileSync(
            'benchmarks/results-ws.json',
            JSON.stringify({
                ...this.results,
                stats: {
                    connectionTime: {
                        avg: this.average(this.results.connectionTime),
                        median: this.median(this.results.connectionTime),
                        p95: this.percentile(this.results.connectionTime, 95)
                    },
                    latency: {
                        avg: this.average(this.results.latencies),
                        median: this.median(this.results.latencies),
                        p95: this.percentile(this.results.latencies, 95)
                    },
                    throughput: {
                        messagesPerSecond: throughput,
                        totalMessages: totalMessages,
                        duration: duration
                    },
                    memory: {
                        before: this.results.memoryBefore,
                        after: this.results.memoryAfter,
                        used: this.results.memoryAfter - this.results.memoryBefore
                    }
                }
            }, null, 2)
        );
        console.log('\nResults saved to benchmarks/results-ws.json');
    }
}

// Run benchmark
if (require.main === module) {
    const benchmark = new WSBenchmark();
    benchmark.run().then(() => {
        console.log('\nBenchmark complete.');
        process.exit(0);
    }).catch(err => {
        console.error('Benchmark error:', err);
        process.exit(1);
    });
}

module.exports = WSBenchmark;
