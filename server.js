const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid'); // Menggunakan UUID untuk ID unik

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map();

wss.on('connection', (ws) => {
    const id = uuidv4();  // Menghasilkan ID unik untuk setiap klien
    const metadata = { id };

    clients.set(id, ws);

    console.log(`Client connected: ${id}`);
    ws.send(JSON.stringify({ id }));  // Mengirim ID ke klien saat koneksi terbuka

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);
        console.log(`Message from ${id}:`, parsedMessage);
    
        const targetClient = clients.get(parsedMessage.targetId); // Pastikan targetId ada
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
