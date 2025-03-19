const axios = require("axios");
const cron = require("node-cron");
const { NODES } = require("./config");

function startHeartbeat(NODE_ID, leaderId, startElection) {
    cron.schedule("*/2 * * * * *", async () => {
        if (NODE_ID === leaderId) return; // Si este nodo es el líder, no necesita chequear latidos.

        const leaderNode = NODES.find(n => n.id === leaderId);
        if (!leaderNode) {
            console.log(`Nodo ${NODE_ID}: No se encontró al líder en la lista de nodos, iniciando elección...`);
            startElection();
            return;
        }

        try {
            await axios.get(`${leaderNode.url}/heartbeat`);
        } catch {
            console.log(`Nodo ${NODE_ID}: Líder no responde, iniciando elección...`);
            startElection();
        }
    });
}

function handleHeartbeat(req, res) {
    res.json({ status: "alive" });
}

module.exports = { startHeartbeat, handleHeartbeat };
