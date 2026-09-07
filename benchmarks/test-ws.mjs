// Runtime-agnostic WebSocket benchmark
// Compatible with Node.js, Deno, and Bun

// Detect runtime
const runtime = (() => {
    if (typeof Deno !== 'undefined') return 'deno';
    if (typeof Bun !== 'undefined') return 'bun';
    return 'node';
})();

// Get WebSocket implementation based on runtime
async function getWebSocket() {
    if (runtime === 'node') {
        const { default: WS } = await import('ws');
        return WS;
    }
    // Deno and Bun have built-in WebSocket
    return WebSocket;
}

// Get environment variable helper
function getEnv(key, defaultValue) {
    if (runtime === 'deno') {
        return Deno.env.get(key) || defaultValue;
    }
    return process.env[key] || defaultValue;
}

// Get memory usage helper
function getMemoryUsage() {
    if (runtime === 'deno') {
        return Deno.memoryUsage().heapUsed / 1024 / 1024;
    }
    if (runtime === 'bun') {
        return process.memoryUsage().heapUsed / 1024 / 1024;
    }
    return process.memoryUsage().heapUsed / 1024 / 1024;
}

// File system helper
async function writeResults(filename, data) {
    const content = JSON.stringify(data, null, 2);
    if (runtime === 'deno') {
        await Deno.writeTextFile(filename, content);
    } else if (runtime === 'bun') {
        await Bun.write(filename, content);
    } else {
        const fs = await import('fs/promises');
        await fs.writeFile(filename, content);
    }
}

// Test configuration
const SERVER_URL = getEnv('WS_URL', 'ws://localhost:8090');
const NUM_CONNECTIONS = parseInt(getEnv('NUM_CONNECTIONS', '100'));
const NUM_MESSAGES = parseInt(getEnv('NUM_MESSAGES', '1000'));
const MESSAGE_SIZE = parseInt(getEnv('MESSAGE_SIZE', '100')); // bytes

class WSBenchmark {
    constructor(WebSocketImpl) {
        this.WebSocket = WebSocketImpl;
        this.results = {
            implementation: 'Native WebSocket (ws)',
            runtime: runtime,
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
            const ws = new this.WebSocket(SERVER_URL);

            await new Promise((resolve, reject) => {
                ws.onopen = () => {
                    const end = performance.now();
                    times.push(end - start);
                    ws.close();
                    resolve();
                };
                ws.onerror = (err) => {
                    this.results.errors++;
                    ws.close();
                    reject(err);
                };
            }).catch(() => {});
        }

        this.results.connectionTime = times;
        console.log(`Average connection time: ${this.average(times).toFixed(2)}ms`);
    }

    async testLatency() {
        console.log('Testing message round-trip latency...');
        const ws = new this.WebSocket(SERVER_URL);
        const latencies = [];

        await new Promise((resolve, reject) => {
            ws.onopen = async () => {
                for (let i = 0; i < 100; i++) {
                    const start = performance.now();
                    const testData = { action: 'echo', data: 'x'.repeat(MESSAGE_SIZE) };

                    ws.send(JSON.stringify(testData));

                    await new Promise(resolveMsg => {
                        const handler = (event) => {
                            try {
                                const msg = typeof event.data === 'string' ? event.data : event.data.toString();
                                const parsed = JSON.parse(msg);
                                if (parsed.action === 'echo') {
                                    const end = performance.now();
                                    latencies.push(end - start);
                                    ws.removeEventListener('message', handler);
                                    resolveMsg();
                                }
                            } catch (e) {
                                this.results.errors++;
                            }
                        };
                        ws.addEventListener('message', handler);
                    });
                }
                ws.close();
                resolve();
            };

            ws.onerror = (err) => {
                this.results.errors++;
                reject(err);
            };
        }).catch(() => {});

        this.results.latencies = latencies;
        console.log(`Average latency: ${this.average(latencies).toFixed(2)}ms`);
    }

    async testThroughput() {
        console.log(`Testing throughput with ${NUM_CONNECTIONS} connections...`);
        this.results.memoryBefore = getMemoryUsage();
        this.results.startTime = performance.now();

        const connections = [];
        const promises = [];

        // Create multiple connections
        for (let i = 0; i < NUM_CONNECTIONS; i++) {
            const promise = new Promise((resolve, reject) => {
                const ws = new this.WebSocket(SERVER_URL);
                let messagesSent = 0;
                let messagesReceived = 0;
                let sendInterval;

                ws.onopen = () => {
                    connections.push(ws);

                    // Send messages
                    sendInterval = setInterval(() => {
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

                    ws.onmessage = (event) => {
                        messagesReceived++;
                        if (messagesReceived >= NUM_MESSAGES) {
                            clearInterval(sendInterval);
                            ws.close();
                            resolve({ sent: messagesSent, received: messagesReceived });
                        }
                    };
                };

                ws.onerror = (err) => {
                    this.results.errors++;
                    if (sendInterval) clearInterval(sendInterval);
                    ws.close();
                    reject(err);
                };

                ws.onclose = () => {
                    if (sendInterval) clearInterval(sendInterval);
                    if (messagesReceived < NUM_MESSAGES) {
                        resolve({ sent: messagesSent, received: messagesReceived });
                    }
                };

                // Timeout after 30 seconds
                setTimeout(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        if (sendInterval) clearInterval(sendInterval);
                        ws.close();
                        resolve({ sent: messagesSent, received: messagesReceived });
                    }
                }, 30000);
            });

            promises.push(promise);
        }

        await Promise.allSettled(promises);

        this.results.endTime = performance.now();
        this.results.memoryAfter = getMemoryUsage();

        const duration = (this.results.endTime - this.results.startTime) / 1000;
        const totalMessages = NUM_CONNECTIONS * NUM_MESSAGES;
        const throughput = totalMessages / duration;

        console.log(`Duration: ${duration.toFixed(2)}s`);
        console.log(`Throughput: ${throughput.toFixed(2)} messages/sec`);
        console.log(`Memory used: ${(this.results.memoryAfter - this.results.memoryBefore).toFixed(2)}MB`);
    }

    async run() {
        console.log(`\n=== WebSocket (ws) Performance Benchmark [${runtime}] ===\n`);

        try {
            await this.testConnectionTime();
            await new Promise(r => setTimeout(r, 1000));

            await this.testLatency();
            await new Promise(r => setTimeout(r, 1000));

            await this.testThroughput();

            await this.printResults();
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

    async printResults() {
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
        const resultsData = {
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
        };

        await writeResults(`results-ws-${runtime}.json`, resultsData);
        console.log(`\nResults saved to results-ws-${runtime}.json`);
    }
}

// Run benchmark
if (import.meta.url === `file://${runtime === 'deno' ? Deno.cwd() : process.cwd()}/test-ws.mjs` ||
    import.meta.url.endsWith('test-ws.mjs')) {
    const WebSocketImpl = await getWebSocket();
    const benchmark = new WSBenchmark(WebSocketImpl);
    await benchmark.run();
    console.log('\nBenchmark complete.');
    if (runtime === 'deno') {
        Deno.exit(0);
    } else {
        process.exit(0);
    }
}

export default WSBenchmark;
