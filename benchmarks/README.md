# WebSocket Performance Benchmarks

Performance testing suite for comparing Native WebSocket (ws) and Socket.io implementations.

## Overview

This benchmark suite tests and compares:
- **Connection establishment time** - How quickly connections are established
- **Round-trip latency** - Time for a message to go from client to server and back
- **Throughput** - Messages per second with multiple concurrent connections
- **Memory usage** - Heap memory consumption during load
- **Error rates** - Connection and message failures

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
