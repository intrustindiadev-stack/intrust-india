import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8001;
const API_KEY = process.env.MCP_API_KEY || 'bfa798536875ac602ed859ee37d73c20';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '2782bcf072b1583b818457e2f07a26f49b7625abefaff85d';
const DB_NAME = process.env.DB_NAME || 'postgres';
const DB_PORT = process.env.DB_PORT || 5432;

const pool = new pg.Pool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    keepAlive: true,
});

const server = new Server(
    { name: 'intrust-mcp-server', version: '1.0.0' },
    { capabilities: { tools: {} } }
);

const TOOLS = [
    {
        name: 'query_database',
        description: 'Run a read-only or read-write SQL query against the Intrust India Postgres database.',
        inputSchema: {
            type: 'object',
            properties: {
                sql: { type: 'string', description: 'The SQL query string to execute.' },
            },
            required: ['sql'],
        },
    },
];

async function handleToolCall(name, args) {
    if (name === 'query_database') {
        const { sql } = args || {};
        const client = await pool.connect();
        try {
            const result = await client.query(sql);
            return {
                content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }],
            };
        } finally {
            client.release();
        }
    }
    throw new Error(`Tool not found: ${name}`);
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return await handleToolCall(request.params.name, request.params.arguments);
});

function authMiddleware(req, res, next) {
    let key = req.headers['x-api-key'] || req.query.key;
    const authHeader = req.headers['authorization'];
    if (!key && authHeader && authHeader.startsWith('Bearer ')) {
        key = authHeader.substring(7).trim();
    }
    
    if (!key || key !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }
    next();
}

const transports = new Map();

// SSE Connection endpoint (GET)
app.get(['/mcp/sse', '/mcp'], authMiddleware, async (req, res) => {
    for (const [id, t] of transports) {
        try { t.close(); } catch (e) {}
    }
    transports.clear();

    const transport = new SSEServerTransport('/api/mcp/messages', res);
    const sessionId = Math.random().toString(36).substring(7);
    transports.set(sessionId, transport);
    
    req.on('close', () => {
        transports.delete(sessionId);
    });

    await server.connect(transport);
});

// SSE Message POST endpoint (without express.json)
// SSEServerTransport consumes the stream itself, so we don't parse JSON here
app.post('/mcp/messages', authMiddleware, async (req, res) => {
    const sessionId = req.query.sessionId;
    let transport = sessionId ? transports.get(sessionId) : null;
    if (!transport) {
        const transportArray = Array.from(transports.values());
        transport = transportArray[transportArray.length - 1];
    }
    
    if (transport) {
        try {
            await transport.handlePostMessage(req, res);
        } catch (e) {
            console.error('Transport handlePostMessage error:', e);
            res.status(500).json({ error: 'Transport error' });
        }
    } else {
        res.status(400).json({ error: 'No active SSE connection found' });
    }
});

// Direct HTTP POST / Streamable HTTP endpoint (with express.json)
app.post(['/mcp/sse', '/mcp'], express.json(), authMiddleware, async (req, res) => {
    const body = req.body || {};
    const { jsonrpc, id, method, params } = body;

    if (jsonrpc !== '2.0') {
        return res.status(400).json({ error: 'Invalid JSON-RPC request' });
    }

    try {
        if (method === 'initialize') {
            return res.json({
                jsonrpc: '2.0',
                id,
                result: {
                    protocolVersion: '2024-11-05',
                    capabilities: { tools: {} },
                    serverInfo: { name: 'intrust-mcp-server', version: '1.0.0' }
                }
            });
        }

        if (method === 'notifications/initialized') {
            return res.status(200).end();
        }

        if (method === 'ping') {
            return res.json({ jsonrpc: '2.0', id, result: {} });
        }

        if (method === 'tools/list') {
            return res.json({
                jsonrpc: '2.0',
                id,
                result: { tools: TOOLS }
            });
        }

        if (method === 'tools/call') {
            const toolResult = await handleToolCall(params.name, params.arguments);
            return res.json({
                jsonrpc: '2.0',
                id,
                result: toolResult
            });
        }

        return res.status(400).json({
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Method not found: ${method}` }
        });
    } catch (err) {
        return res.status(500).json({
            jsonrpc: '2.0',
            id,
            error: { code: -32603, message: err.message }
        });
    }
});

app.listen(PORT, () => {
    console.log(`MCP Server running on port ${PORT}`);
});
