const axios = require("axios");
const { NODES } = require("./config");

async function startElection(NODE_ID, setLeader) {
    let higherNodes = NODES.filter(n => n.id > NODE_ID);
    let newLeader = NODE_ID;

    for (let node of higherNodes) {
        try {
            let response = await axios.post(`${node.url}/election`, { id: NODE_ID });
            if (response.data.success) {
                return;
            }
        } catch {
            continue;
        }
    }

    setLeader(newLeader);
    console.log(`Nodo ${NODE_ID}: Soy el nuevo líder`);
}

function handleElection(req, res) {
    res.json({ success: true });
}

module.exports = { startElection, handleElection };
