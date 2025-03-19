const express = require("express");
const axios = require("axios");
const cron = require("node-cron");

const app = express();
app.use(express.json());

const PORT = process.argv[2] || 3001;
const NODE_ID = parseInt(PORT);
const NODES = [3001, 3002, 3003]; 
let dataStore = new Map();
let leader = null;
let lastHeartbeat = Date.now();

/** ✅ Ruta para replicar datos en los nodos seguidores */
app.post("/replicate", (req, res) => {
  const { key, value } = req.body;
  dataStore.set(key, value);
  res.json({ message: "Réplica exitosa" });
});

/** ✅ Leer datos almacenados */
app.get("/read/:key", (req, res) => {
  const value = dataStore.get(req.params.key) || null;
  res.json({ value });
});

/** ✅ Ruta para recibir heartbeat del líder */
app.get("/heartbeat", (req, res) => {
  lastHeartbeat = Date.now();
  leader = parseInt(req.query.leader);
  res.json({ message: `Heartbeat recibido de líder ${leader}` });
});

/** ✅ Ruta para iniciar elección de líder */
app.post("/elect", async (req, res) => {
  const candidateId = req.body.id;
  if (candidateId > NODE_ID) {
    console.log(`Nodo ${NODE_ID} acepta la elección del nodo ${candidateId}`);
    leader = candidateId;
    res.json({ message: "Aceptado" });
  } else {
    res.status(400).json({ message: "Rechazado" });
  }
});

/** ✅ Escribir solo en el líder y replicar en los seguidores */
app.post("/write", async (req, res) => {
  if (leader !== NODE_ID) {
    return res.status(403).json({ message: "Solo el líder puede escribir" });
  }

  const { key, value } = req.body;
  dataStore.set(key, value);

  // Replicar en seguidores
  for (let node of NODES) {
    if (node !== NODE_ID) {
      try {
        await axios.post(`http://localhost:${node}/replicate`, { key, value });
      } catch (err) {
        console.log(`Error replicando en nodo ${node}: ${err.message}`);
      }
    }
  }

  res.json({ message: "Escritura exitosa en líder", data: { key, value } });
});

/** 🔄 Heartbeat y detección de fallos cada 2 segundos */
cron.schedule("*/2 * * * * *", async () => {
  if (NODE_ID === leader) {
    for (let node of NODES) {
      if (node !== NODE_ID) {
        axios.get(`http://localhost:${node}/heartbeat?leader=${NODE_ID}`).catch(() => {});
      }
    }
  }
});

/** ⚠️ Si no se recibe heartbeat en 5 segundos, iniciar elección */
cron.schedule("*/5 * * * * *", async () => {
  if (Date.now() - lastHeartbeat > 5000) {
    console.log(`⚠️ Nodo ${NODE_ID} detecta fallo en el líder. Iniciando elección...`);

    let higherNodes = NODES.filter(id => id > NODE_ID);
    let higherNodeExists = false;

    for (let node of higherNodes) {
      try {
        let response = await axios.post(`http://localhost:${node}/elect`, { id: NODE_ID });
        if (response.data.message === "Aceptado") {
          console.log(`🔄 Nodo ${NODE_ID} espera a que el nodo ${node} tome el liderazgo.`);
          higherNodeExists = true;
          break;
        }
      } catch (err) {
        console.log(`❌ Nodo ${node} no responde.`);
      }
    }

    if (!higherNodeExists) {
      console.log(`👑 Nodo ${NODE_ID} se autoproclama líder.`);
      leader = NODE_ID;
      lastHeartbeat = Date.now();

      for (let node of NODES) {
        if (node !== NODE_ID) {
          axios.get(`http://localhost:${node}/heartbeat?leader=${NODE_ID}`).catch(() => {});
        }
      }
    }
  }
});

/** 🚀 Iniciar servidor */
app.listen(PORT, () => {
  console.log(`🖥️ Nodo ${NODE_ID} corriendo en el puerto ${PORT}`);
});
