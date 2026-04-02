"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = __importDefault(require("body-parser"));
const routes_1 = __importDefault(require("./routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
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
app.use(body_parser_1.default.json());
// Test endpoint to verify server is running
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});
app.use(routes_1.default);
app.listen(port, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`${'='.repeat(50)}\n`);
});
exports.default = app;
