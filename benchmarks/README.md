# WebSocket Performance Benchmarks

Performance testing suite for comparing Native WebSocket (ws) and Socket.io implementations, with support for runtime comparisons across Node.js, Deno, and Bun.

## Overview

This benchmark suite tests and compares:
- **Connection establishment time** - How quickly connections are established
- **Round-trip latency** - Time for a message to go from client to server and back
- **Throughput** - Messages per second with multiple concurrent connections
- **Memory usage** - Heap memory consumption during load
- **Error rates** - Connection and message failures
- **Runtime performance** - Compare Node.js vs Deno vs Bun

## Prerequisites

1. Install dependencies:
```bash
cd benchmarks
npm install
```

2. Start both servers in separate terminals:

```bash
# Terminal 1: WebSocket server
cd websocket-server-ws
node server-ssl.js

# Terminal 2: Socket.io server
cd websocket-server-socketio
node server.js
```

## Running the Benchmarks

### Run all benchmarks and compare results:
```bash
npm test
```

### Run individual benchmarks:

Test WebSocket (ws) implementation:
```bash
npm run test:ws
```

Test Socket.io implementation:
```bash
npm run test:socketio
```

Compare existing results:
```bash
npm run compare
```

## Runtime Comparison (Node.js vs Deno vs Bun)

Compare WebSocket performance across different JavaScript runtimes.

### Prerequisites

Install the runtimes you want to test:
- **Node.js**: Already required
- **Deno**: [Install Deno](https://deno.land/#installation)
- **Bun**: [Install Bun](https://bun.sh/)

The benchmark will automatically detect which runtimes are available on your system.

### Run runtime comparison:

```bash
npm run test:runtimes
```

This will:
1. Detect available runtimes (Node.js, Deno, Bun)
2. Run the same WebSocket benchmarks on each runtime
3. Generate comparison report showing performance differences

### Run individual runtime tests:

Test with Node.js:
```bash
npm run test:runtime:node
```

Test with Deno:
```bash
npm run test:runtime:deno
```

Test with Bun:
```bash
npm run test:runtime:bun
```

Compare existing runtime results:
```bash
npm run compare:runtimes
```

### Runtime-specific notes:

- **Node.js**: Uses the `ws` package for WebSocket support
- **Deno**: Uses built-in WebSocket API (no external dependencies needed)
- **Bun**: Uses built-in WebSocket API with optimized native implementation

## Configuration

Configure tests via environment variables:

```bash
# WebSocket server URL (default: ws://localhost:8090)
export WS_URL="ws://localhost:8090"

# Socket.io server URL (default: http://localhost:3000)
export SOCKETIO_URL="http://localhost:3000"

# Number of concurrent connections (default: 100)
export NUM_CONNECTIONS=100

# Messages per connection (default: 1000)
export NUM_MESSAGES=1000

# Message payload size in bytes (default: 100)
export MESSAGE_SIZE=100
```

Example with custom configuration:
```bash
NUM_CONNECTIONS=50 NUM_MESSAGES=500 npm test
```

## Test Scenarios

### 1. Connection Time Test
- Establishes 10 connections sequentially
- Measures time from connection initiation to open
- Reports average, median, and 95th percentile

### 2. Latency Test
- Single connection sending 100 messages
- Measures round-trip time for each message
- Reports average, median, and 95th percentile

### 3. Throughput Test
- Multiple concurrent connections (default: 100)
- Each connection sends messages at high frequency
- Measures total messages per second
- Reports memory usage and duration

## Output

Results are saved as JSON files:
- `results-ws.json` - WebSocket benchmark results
- `results-socketio.json` - Socket.io benchmark results
- `comparison.json` - Side-by-side comparison

The comparison report shows:
- Performance metrics for each implementation
- Percentage differences
- Winner for each metric
- Trade-off analysis and recommendations

## Interpreting Results

**Lower is better:**
- Connection time
- Latency
- Memory usage

**Higher is better:**
- Throughput (messages/sec)

**Consider:**
- Native WebSocket typically shows lower latency and overhead
- Socket.io provides automatic reconnection and fallback transports
- Choose based on your use case requirements

## Example Output

### WebSocket vs Socket.IO Comparison

```
╔═══════════════════════════════════════════════════════════════╗
║          WebSocket Performance Comparison Report             ║
╚═══════════════════════════════════════════════════════════════╝

Test Configuration:
  Connections: 100
  Messages per connection: 1000
  Message size: 100 bytes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Connection Establishment Time (ms)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Average              │ WS:       2.45 │ Socket.io:       5.32 │ ✓ WS faster
  Median               │ WS:       2.21 │ Socket.io:       4.98 │ ✓ WS faster
  95th Percentile      │ WS:       3.89 │ Socket.io:       7.12 │ ✓ WS faster
```

### Runtime Comparison Example

```
╔═══════════════════════════════════════════════════════════════════╗
║          WebSocket Runtime Performance Comparison                ║
╚═══════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Connection Establishment Time (ms)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Average              │ bun: 1.23 ⭐ │ deno: 1.45 (+17.9%) │ node: 2.34 (+90.2%)
  Median               │ bun: 1.15 ⭐ │ deno: 1.38 (+20.0%) │ node: 2.21 (+92.2%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Round-Trip Latency (ms)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Average              │ bun: 0.89 ⭐ │ deno: 1.02 (+14.6%) │ node: 1.23 (+38.2%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🥇 bun          - 4 wins out of 4 key metrics
🥈 deno         - 0 wins out of 4 key metrics
🥉 node         - 0 wins out of 4 key metrics
```

## Troubleshooting

**Connection errors:**
- Verify both servers are running
- Check the URLs match your server configuration
- Ensure firewall allows connections

**High error rates:**
- Reduce NUM_CONNECTIONS
- Reduce NUM_MESSAGES
- Check server logs for issues

**Inconsistent results:**
- Run multiple times and average results
- Close other applications to reduce noise
- Consider system load and network conditions

## Customization

To add custom tests, extend the benchmark classes in `test-ws.js` or `test-socketio.js`:

```javascript
async customTest() {
    // Your test implementation
}
```

Then add the test to the `run()` method.
