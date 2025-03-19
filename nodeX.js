const express = require("express");
const { NODES, leaderId } = require("./config");
const { handleWrite, handleReplica } = require("./leader");
const { startElection, handleElection } = require("./election");
const { startHeartbeat, handleHeartbeat } = require("./heartbeat");

// Configuración del nodo
const PORT = process.argv[2] || 3001;
const NODE_ID = parseInt(PORT) - 3000;

const app = express();
app.use(express.json());

// Rutas
app.post("/write", (req, res) => handleWrite(req, res, leaderId, NODE_ID));
app.post("/replica", (req, res) => handleReplica(req, res, NODE_ID));
app.post("/election", handleElection);
app.get("/heartbeat", handleHeartbeat);

// Iniciar Heartbeat y detección de fallos
startHeartbeat(NODE_ID, leaderId, () => startElection(NODE_ID, (newLeader) => leaderId = newLeader));

app.listen(PORT, () => {
    console.log(`Nodo ${NODE_ID} corriendo en el puerto ${PORT}`);
});
