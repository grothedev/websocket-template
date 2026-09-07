#!/usr/bin/env node
/**
 * Runtime Comparison Tool
 * Compares WebSocket benchmark results across Node.js, Deno, and Bun
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

class RuntimeComparison {
    constructor() {
        this.runtimes = (process.env.RUNTIMES || 'node,deno,bun').split(',');
        this.results = {};
    }

    async loadResults() {
        console.log('Loading benchmark results...\n');

        for (const runtime of this.runtimes) {
            const filename = `results-ws-${runtime}.json`;

            if (!existsSync(filename)) {
                console.log(`⚠ ${filename} not found, skipping ${runtime}`);
                continue;
            }

            try {
                const data = await readFile(filename, 'utf-8');
                this.results[runtime] = JSON.parse(data);
                console.log(`✓ Loaded ${filename}`);
            } catch (err) {
                console.error(`✗ Error loading ${filename}:`, err.message);
            }
        }

        console.log('');

        if (Object.keys(this.results).length < 2) {
            throw new Error('Need at least 2 runtime results to compare');
        }
    }

    formatNumber(num) {
        return num.toFixed(2);
    }

    formatPercentage(percent) {
        const sign = percent > 0 ? '+' : '';
        return `${sign}${percent.toFixed(1)}%`;
    }

    compareMetric(metric, results, lowerIsBetter = true) {
        const values = Object.entries(results).map(([runtime, data]) => ({
            runtime,
            value: data
        }));

        // Find best
        const sorted = [...values].sort((a, b) =>
            lowerIsBetter ? a.value - b.value : b.value - a.value
        );
        const best = sorted[0];

        return {
            values,
            best: best.runtime,
            sorted
        };
    }

    printComparisonTable() {
        console.log('╔═══════════════════════════════════════════════════════════════════╗');
        console.log('║          WebSocket Runtime Performance Comparison                ║');
        console.log('╚═══════════════════════════════════════════════════════════════════╝');
        console.log('');

        // Print configuration
        const firstResult = Object.values(this.results)[0];
        console.log('Test Configuration:');
        console.log(`  Connections: ${firstResult.config.connections}`);
        console.log(`  Messages per connection: ${firstResult.config.messagesPerConnection}`);
        console.log(`  Message size: ${firstResult.config.messageSize} bytes`);
        console.log('');

        // Connection Time
        this.printMetricSection(
            'Connection Establishment Time (ms)',
            ['Average', 'Median', '95th Percentile'],
            [
                runtime => this.results[runtime].stats.connectionTime.avg,
                runtime => this.results[runtime].stats.connectionTime.median,
                runtime => this.results[runtime].stats.connectionTime.p95
            ],
            true
        );

        // Latency
        this.printMetricSection(
            'Round-Trip Latency (ms)',
            ['Average', 'Median', '95th Percentile'],
            [
                runtime => this.results[runtime].stats.latency.avg,
                runtime => this.results[runtime].stats.latency.median,
                runtime => this.results[runtime].stats.latency.p95
            ],
            true
        );

        // Throughput
        this.printMetricSection(
            'Throughput',
            ['Messages/sec', 'Duration (s)'],
            [
                runtime => this.results[runtime].stats.throughput.messagesPerSecond,
                runtime => this.results[runtime].stats.throughput.duration
            ],
            [false, true]
        );

        // Memory
        this.printMetricSection(
            'Memory Usage (MB)',
            ['Before', 'After', 'Used'],
            [
                runtime => this.results[runtime].stats.memory.before,
                runtime => this.results[runtime].stats.memory.after,
                runtime => this.results[runtime].stats.memory.used
            ],
            true
        );

        // Errors
        console.log('━'.repeat(70));
        console.log('Errors');
        console.log('━'.repeat(70));
        Object.entries(this.results).forEach(([runtime, data]) => {
            console.log(`  ${runtime.padEnd(12)} │ ${data.errors}`);
        });
        console.log('');

        this.printSummary();
    }

    printMetricSection(title, metricNames, getters, lowerIsBetter = true) {
        console.log('━'.repeat(70));
        console.log(title);
        console.log('━'.repeat(70));

        const runtimes = Object.keys(this.results);

        metricNames.forEach((metricName, idx) => {
            const getter = getters[idx];
            const isLowerBetter = Array.isArray(lowerIsBetter)
                ? lowerIsBetter[idx]
                : lowerIsBetter;

            const values = {};
            runtimes.forEach(runtime => {
                values[runtime] = getter(runtime);
            });

            const comparison = this.compareMetric(metricName, values, isLowerBetter);

            const parts = [`  ${metricName.padEnd(20)} │`];

            comparison.sorted.forEach((item, i) => {
                const value = this.formatNumber(item.value);
                const winner = item.runtime === comparison.best ? ' ⭐' : '';

                if (i > 0) {
                    const diff = ((item.value - comparison.sorted[0].value) / comparison.sorted[0].value) * 100;
                    const diffStr = isLowerBetter ? this.formatPercentage(diff) : this.formatPercentage(-diff);
                    parts.push(` ${item.runtime}: ${value}${winner} (${diffStr})`);
                } else {
                    parts.push(` ${item.runtime}: ${value}${winner}`);
                }

                if (i < comparison.sorted.length - 1) {
                    parts.push(' │');
                }
            });
            console.log(parts.join(''));
        });

        console.log('');
    }

    printSummary() {
        console.log('═'.repeat(70));
        console.log('Summary');
        console.log('═'.repeat(70));
        console.log('');

        const runtimes = Object.keys(this.results);
        const scores = {};

        runtimes.forEach(runtime => {
            scores[runtime] = 0;
        });

        // Count wins for each runtime
        const metrics = [
            { getter: r => this.results[r].stats.connectionTime.avg, lowerIsBetter: true },
            { getter: r => this.results[r].stats.latency.avg, lowerIsBetter: true },
            { getter: r => this.results[r].stats.throughput.messagesPerSecond, lowerIsBetter: false },
            { getter: r => this.results[r].stats.memory.used, lowerIsBetter: true }
        ];

        metrics.forEach(({ getter, lowerIsBetter }) => {
            const values = {};
            runtimes.forEach(runtime => {
                values[runtime] = getter(runtime);
            });
            const comparison = this.compareMetric('', values, lowerIsBetter);
            scores[comparison.best]++;
        });

        // Print scores
        const sortedByScore = Object.entries(scores).sort((a, b) => b[1] - a[1]);

        sortedByScore.forEach(([runtime, score], idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '  ';
            console.log(`${medal} ${runtime.padEnd(12)} - ${score} wins out of ${metrics.length} key metrics`);
        });

        console.log('');
        this.printRecommendations();
    }

    printRecommendations() {
        const runtimes = Object.keys(this.results);

        console.log('Recommendations:');
        console.log('');

        // Find fastest for latency
        const latencyValues = {};
        runtimes.forEach(runtime => {
            latencyValues[runtime] = this.results[runtime].stats.latency.avg;
        });
        const fastestLatency = this.compareMetric('', latencyValues, true);

        // Find best throughput
        const throughputValues = {};
        runtimes.forEach(runtime => {
            throughputValues[runtime] = this.results[runtime].stats.throughput.messagesPerSecond;
        });
        const bestThroughput = this.compareMetric('', throughputValues, false);

        // Find most memory efficient
        const memoryValues = {};
        runtimes.forEach(runtime => {
            memoryValues[runtime] = this.results[runtime].stats.memory.used;
        });
        const mostMemoryEfficient = this.compareMetric('', memoryValues, true);

        console.log(`  • Lowest Latency: ${fastestLatency.best}`);
        console.log(`  • Highest Throughput: ${bestThroughput.best}`);
        console.log(`  • Most Memory Efficient: ${mostMemoryEfficient.best}`);
        console.log('');
    }

    async saveComparison() {
        const comparison = {
            timestamp: new Date().toISOString(),
            runtimes: Object.keys(this.results),
            results: this.results,
            summary: this.generateSummary()
        };

        await writeFile('comparison-runtimes.json', JSON.stringify(comparison, null, 2));
        console.log('Detailed comparison saved to comparison-runtimes.json');
    }

    generateSummary() {
        const runtimes = Object.keys(this.results);
        const summary = {};

        runtimes.forEach(runtime => {
            summary[runtime] = {
                connectionTime: this.results[runtime].stats.connectionTime.avg,
                latency: this.results[runtime].stats.latency.avg,
                throughput: this.results[runtime].stats.throughput.messagesPerSecond,
                memory: this.results[runtime].stats.memory.used,
                errors: this.results[runtime].errors
            };
        });

        return summary;
    }

    async run() {
        try {
            await this.loadResults();
            this.printComparisonTable();
            await this.saveComparison();
        } catch (err) {
            console.error('Comparison failed:', err.message);
            process.exit(1);
        }
    }
}

// Run comparison
const comparison = new RuntimeComparison();
comparison.run();
