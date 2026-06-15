import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const app = express();
app.use(cors());
// Express must parse JSON bodies
app.use(express.json());

// Load environment variables or use defaults
const PORT = process.env.PORT || 8001;
const API_KEY = process.env.MCP_API_KEY || 'dev-key-123'; // Must be overridden in production
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'postgres';
const DB_PORT = process.env.DB_PORT || 5432;

// Initialize Postgres connection
const pool = new pg.Pool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
    connectionTimeoutMillis: 10000, // wait up to 10 seconds for a connection
    idleTimeoutMillis: 30000,       // close idle clients after 30 seconds
    keepAlive: true,                // enable TCP keep-alive
});

// Create MCP Server
const server = new Server(
    {
        name: 'intrust-mcp-server',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Register Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'query_database',
                description: 'Run a read-only or read-write SQL query against the Intrust India Postgres database.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sql: {
                            type: 'string',
                            description: 'The SQL query string to execute.',
                        },
                    },
                    required: ['sql'],
                },
            },
        ],
    };
});

// Handle Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'query_database') {
        const { sql } = request.params.arguments;
        try {
            const client = await pool.connect();
            try {
                const result = await client.query(sql);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result.rows, null, 2),
                        },
                    ],
                };
            } finally {
                client.release();
            }
        } catch (error) {
            return {
                isError: true,
                content: [
                    {
                        type: 'text',
                        text: `Database Error: ${error.message}`,
                    },
                ],
            };
        }
    }

    throw new Error(`Tool not found: ${request.params.name}`);
});

// Auth Middleware
function authMiddleware(req, res, next) {
    const key = req.headers['x-api-key'] || req.query.key;
    if (!key || key !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }
    next();
}

// Global active transport map
const transports = new Map();

// SSE Endpoint for clients to connect
app.get('/mcp/sse', authMiddleware, async (req, res) => {
    const transport = new SSEServerTransport('/mcp/messages', res);
    const sessionId = Math.random().toString(36).substring(7);
    transports.set(sessionId, transport);
    
    // Cleanup on disconnect
    req.on('close', () => {
        transports.delete(sessionId);
    });

    await server.connect(transport);
});

// Message routing endpoint
app.post('/mcp/messages', authMiddleware, async (req, res) => {
    // Determine the session this message belongs to.
    // In a real multi-client SSE server, you extract session ID from the URL or headers.
    // The @modelcontextprotocol/sdk handles routing internally if properly instantiated.
    // Here we just broadcast it to the first active transport for simplicity in a single-agent scenario.
    const transport = Array.from(transports.values())[0];
    if (!transport) {
        return res.status(400).json({ error: 'No active SSE connection found' });
    }
    
    await transport.handlePostMessage(req, res);
});

app.listen(PORT, () => {
    console.log(`MCP Server running on port ${PORT}`);
    console.log(`SSE Endpoint: http://localhost:${PORT}/mcp/sse`);
});
