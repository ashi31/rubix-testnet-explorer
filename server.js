const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');

const app = express();
const wss = new WebSocket.Server({ port: 2002 });
const port = 2001;

const db = new sqlite3.Database('transDetail.db')

db.run(`CREATE TABLE IF NOT EXISTS TransDetails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL,
    sender_did TEXT NOT NULL,
    receiver_did TEXT NOT NULL,
    token_time REAL NOT NULL,
    token_id TEXT NOT NULL,
    amount REAL NOT NULL,
    transaction_type INTEGER NOT NULL,
    quorum_list TEXT NOT NULL
)`);

app.use(express.json());

app.post('/api/v2/services/app/Rubix/CreateOrUpdateRubixTransaction', (req, res) => {
    console.log("accessed")
    const {
        transaction_id,
        sender_did,
        receiver_did,
        token_time,
        token_id,
        amount,
        transaction_type,
        quorum_list
    } = req.body;

    if (!transaction_id || !sender_did || !receiver_did || !token_time || !token_id || !amount || !transaction_type || !quorum_list) {
        return res.status(400).send('Field values missing. All fields are required');
    }

    const query = `INSERT INTO TransDetails (transaction_id, sender_did, receiver_did, token_time, token_id, amount, transaction_type, quorum_list) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [
        transaction_id,
        sender_did,
        receiver_did,
        token_time,
        JSON.stringify(token_id),
        amount,
        transaction_type,
        JSON.stringify(quorum_list)
    ], function(err) {
        if (err) {
            return res.status(500).send('Error saving data');
        }
        
        const newTransaction = {
            id: this.lastID,
            transaction_id,
            sender_did,
            receiver_did,
            token_time,
            token_id,
            amount,
            transaction_type,
            quorum_list
        };

        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(newTransaction));
            }
        });

        res.send({ success: true, id: this.lastID });
    });
});

// API to get data from TransDetails table
app.get('/get-trans-data', (req, res) => {
    db.all(`SELECT * FROM TransDetails`, (err, rows) => {
        if (err) {
            return res.status(500).send('Error fetching data');
        }

        res.json(rows);
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});