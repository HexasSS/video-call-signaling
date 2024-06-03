const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map();

const getClientId = (req) => {
    const xForwardedFor = req.headers['x-forwarded-for'];
    const clientIp = xForwardedFor ? xForwardedFor.split(',')[0].trim() : req.socket.remoteAddress;
    return clientIp;
};

wss.on('connection', (ws, req) => {
    const id = getClientId(req);
    const metadata = { id };

    clients.set(id, ws);

    console.log(`Client connected: ${id}`);
    ws.send(JSON.stringify({ id }));

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);
        console.log(`Message from ${id}:`, parsedMessage);

        const targetClient = clients.get(parsedMessage.targetId);
        if (targetClient) {
            targetClient.send(JSON.stringify({ ...parsedMessage, fromId: id }));
            console.log(`Message sent to ${parsedMessage.targetId}`);
        } else {
            console.log(`Target client not found for ID: ${parsedMessage.targetId}`);
        }
    });

    ws.on('close', () => {
        clients.delete(id);
        console.log(`Client disconnected: ${id}`);
    });
});

app.use(express.static('public'));

server.listen(3000, '0.0.0.0', () => {
    console.log('Server is listening on port 3000');
});
