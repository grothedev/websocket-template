const fs = require('fs');
const path = require('path');

/**
 * Compares benchmark results from both WebSocket implementations
 */
class BenchmarkComparison {
    constructor() {
        this.wsResults = null;
        this.socketioResults = null;
    }

    loadResults() {
        try {
            this.wsResults = JSON.parse(
                fs.readFileSync(path.join(__dirname, 'results-ws.json'), 'utf8')
            );
        } catch (err) {
            console.error('Failed to load WebSocket results:', err.message);
        }

        try {
            this.socketioResults = JSON.parse(
                fs.readFileSync(path.join(__dirname, 'results-socketio.json'), 'utf8')
            );
        } catch (err) {
            console.error('Failed to load Socket.io results:', err.message);
        }

        if (!this.wsResults && !this.socketioResults) {
            console.error('No results found. Run benchmarks first.');
            process.exit(1);
        }
    }

    compare() {
        console.log('\n╔═══════════════════════════════════════════════════════════════╗');
        console.log('║          WebSocket Performance Comparison Report             ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝\n');

        const comparison = {
            timestamp: new Date().toISOString(),
            implementations: []
        };

        if (this.wsResults) {
            comparison.implementations.push({
                name: 'Native WebSocket (ws)',
                results: this.wsResults.stats
            });
        }

        if (this.socketioResults) {
            comparison.implementations.push({
                name: 'Socket.io',
                results: this.socketioResults.stats
            });
        }

        // Configuration
        console.log('Test Configuration:');
        const config = this.wsResults?.config || this.socketioResults?.config;
        console.log(`  Connections: ${config.connections}`);
        console.log(`  Messages per connection: ${config.messagesPerConnection}`);
        console.log(`  Message size: ${config.messageSize} bytes`);
        console.log('');

        // Connection Time Comparison
        if (this.wsResults && this.socketioResults) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('Connection Establishment Time (ms)');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            this.printComparison('Average',
                this.wsResults.stats.connectionTime.avg,
                this.socketioResults.stats.connectionTime.avg
            );
            this.printComparison('Median',
                this.wsResults.stats.connectionTime.median,
                this.socketioResults.stats.connectionTime.median
            );
            this.printComparison('95th Percentile',
                this.wsResults.stats.connectionTime.p95,
                this.socketioResults.stats.connectionTime.p95
            );
            console.log('');

            // Latency Comparison
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('Round-trip Latency (ms)');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            this.printComparison('Average',
                this.wsResults.stats.latency.avg,
                this.socketioResults.stats.latency.avg
            );
            this.printComparison('Median',
                this.wsResults.stats.latency.median,
                this.socketioResults.stats.latency.median
            );
            this.printComparison('95th Percentile',
                this.wsResults.stats.latency.p95,
                this.socketioResults.stats.latency.p95
            );
            console.log('');

            // Throughput Comparison
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('Throughput');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            this.printComparison('Messages/sec',
                this.wsResults.stats.throughput.messagesPerSecond,
                this.socketioResults.stats.throughput.messagesPerSecond,
                true
            );
            this.printComparison('Duration (s)',
                this.wsResults.stats.throughput.duration,
                this.socketioResults.stats.throughput.duration
            );
            console.log('');

            // Memory Comparison
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('Memory Usage (MB)');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            this.printComparison('Memory Used',
                this.wsResults.stats.memory.used,
                this.socketioResults.stats.memory.used
            );
            console.log('');

            // Errors
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('Errors');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`  Native WebSocket: ${this.wsResults.errors}`);
            console.log(`  Socket.io:        ${this.socketioResults.errors}`);
            console.log('');

            // Summary
            this.printSummary();
        } else {
            // Just print individual results
            if (this.wsResults) {
                this.printIndividualResults('Native WebSocket (ws)', this.wsResults);
            }
            if (this.socketioResults) {
                this.printIndividualResults('Socket.io', this.socketioResults);
            }
        }

        // Save comparison
        fs.writeFileSync(
            path.join(__dirname, 'comparison.json'),
            JSON.stringify(comparison, null, 2)
        );
        console.log('Comparison saved to benchmarks/comparison.json\n');
    }

    printComparison(metric, wsValue, socketioValue, higherIsBetter = false) {
        const diff = ((socketioValue - wsValue) / wsValue) * 100;
        let winner = '';

        if (Math.abs(diff) < 5) {
            winner = '≈ Similar';
        } else if (higherIsBetter) {
            winner = wsValue > socketioValue ? '✓ WS faster' : '✓ Socket.io faster';
        } else {
            winner = wsValue < socketioValue ? '✓ WS faster' : '✓ Socket.io faster';
        }

        console.log(`  ${metric.padEnd(20)} │ WS: ${wsValue.toFixed(2).padStart(10)} │ Socket.io: ${socketioValue.toFixed(2).padStart(10)} │ ${winner}`);
    }

    printIndividualResults(name, results) {
        console.log(`\n${name} Results:`);
        console.log('─'.repeat(60));
        console.log(`Connection Time (avg): ${results.stats.connectionTime.avg.toFixed(2)}ms`);
        console.log(`Latency (avg): ${results.stats.latency.avg.toFixed(2)}ms`);
        console.log(`Throughput: ${results.stats.throughput.messagesPerSecond.toFixed(2)} msgs/sec`);
        console.log(`Memory Used: ${results.stats.memory.used.toFixed(2)}MB`);
        console.log(`Errors: ${results.errors}`);
    }

    printSummary() {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Summary & Recommendations');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const wsLatency = this.wsResults.stats.latency.avg;
        const socketioLatency = this.socketioResults.stats.latency.avg;
        const wsThroughput = this.wsResults.stats.throughput.messagesPerSecond;
        const socketioThroughput = this.socketioResults.stats.throughput.messagesPerSecond;
        const wsMemory = this.wsResults.stats.memory.used;
        const socketioMemory = this.socketioResults.stats.memory.used;

        console.log('');

        // Performance winner
        if (wsLatency < socketioLatency * 0.9) {
            console.log('  Performance: Native WebSocket shows significantly lower latency');
        } else if (socketioLatency < wsLatency * 0.9) {
            console.log('  Performance: Socket.io shows significantly lower latency');
        } else {
            console.log('  Performance: Both implementations show similar latency');
        }

        // Throughput winner
        if (wsThroughput > socketioThroughput * 1.1) {
            console.log('  Throughput:  Native WebSocket handles more messages per second');
        } else if (socketioThroughput > wsThroughput * 1.1) {
            console.log('  Throughput:  Socket.io handles more messages per second');
        } else {
            console.log('  Throughput:  Both implementations show similar throughput');
        }

        // Memory winner
        if (wsMemory < socketioMemory * 0.9) {
            console.log('  Memory:      Native WebSocket uses less memory');
        } else if (socketioMemory < wsMemory * 0.9) {
            console.log('  Memory:      Socket.io uses less memory');
        } else {
            console.log('  Memory:      Both implementations show similar memory usage');
        }

        console.log('');
        console.log('  Trade-offs:');
        console.log('  - Native WebSocket: Lower-level control, lighter weight, manual protocol handling');
        console.log('  - Socket.io:        Auto-reconnection, fallback transports, built-in rooms/namespaces');
        console.log('');
    }
}

// Run comparison
if (require.main === module) {
    const comparison = new BenchmarkComparison();
    comparison.loadResults();
    comparison.compare();
}

module.exports = BenchmarkComparison;
