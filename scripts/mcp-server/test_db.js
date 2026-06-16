import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env.local' });

const pool = new pg.Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function run() {
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT current_database();');
        console.log('Connected to:', res.rows[0]);
        client.release();
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}
run();
