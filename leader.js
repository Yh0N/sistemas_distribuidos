const axios = require("axios");
const { NODES } = require("./config");

let store = new Map();

function handleWrite(req, res, leaderId, NODE_ID) {
    if (NODE_ID !== leaderId) {
        return res.status(403).json({ error: "No soy el líder" });
    }

    const { key, value } = req.body;
    store.set(key, value);
    console.log(`Nodo ${NODE_ID} (Líder) guardó: ${key} -> ${value}`);

    // Replicación en seguidores
    for (const node of NODES) {
        if (node.id !== leaderId) {
            axios.post(`${node.url}/replica`, { key, value }).catch(() => {});
        }
    }
    res.json({ message: "Dato replicado" });
}

function handleReplica(req, res, NODE_ID) {
    const { key, value } = req.body;
    store.set(key, value);
    console.log(`Nodo ${NODE_ID} replicó: ${key} -> ${value}`);
    res.json({ message: "Dato almacenado" });
}

module.exports = { handleWrite, handleReplica };
