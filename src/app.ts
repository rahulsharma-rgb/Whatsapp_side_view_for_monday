import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import routes from './routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Enable CORS for local development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    console.log(`📨 ${req.method} ${req.path}`);
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(bodyParser.json());

// Test endpoint to verify server is running
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

app.use(routes);

app.listen(port, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`${'='.repeat(50)}\n`);
});
export default app;
