const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Ruta del archivo de estadísticas
const statsFilePath = path.join(__dirname, 'transferStats.json');

// Variable para almacenar estadísticas en memoria antes de escribirlas
let statsInMemory = {};

// Función para escribir las estadísticas en segundo plano
async function writeStatsInBackground() {
  // Verificamos si hay algo para escribir
  if (Object.keys(statsInMemory).length === 0) return;

  // Escribimos las estadísticas en el archivo
  try {
    await fs.writeFile(statsFilePath, JSON.stringify(statsInMemory, null, 2), 'utf8');
    console.log('Estadísticas escritas en el archivo');
  } catch (error) {
    console.error('Error al escribir en el archivo de estadísticas:', error.message);
  }
}

// Ruta dinámica del proxy
app.get('/proxy/*', async (req, res) => {
  const targetUrl = req.params[0];  // URL de destino

  const requestSize = Buffer.byteLength(JSON.stringify(req.body || req.query));

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      params: req.query,
      headers: {
        ...req.headers,
        host: new URL(targetUrl).host,
      }
    });

    const responseSize = Buffer.byteLength(JSON.stringify(response.data));

    // Acumular estadísticas en memoria
    if (!statsInMemory[req.method]) {
      statsInMemory[req.method] = { requestSize: 0, responseSize: 0 };
    }
    statsInMemory[req.method].requestSize += requestSize;
    statsInMemory[req.method].responseSize += responseSize;

    // Escribir las estadísticas en segundo plano sin bloquear la respuesta
    // De forma que las estadísticas se escriban cuando sea conveniente
    writeStatsInBackground();

    // Enviar la respuesta inmediatamente
    res.status(response.status).json(response.data);

  } catch (error) {
    console.error('Error en la solicitud del proxy:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Ruta para obtener las estadísticas de transferencia en MB
app.get('/stats', async (req, res) => {
  try {
    const rawStats = await fs.readFile(statsFilePath, 'utf8');
    const stats = JSON.parse(rawStats);

    const statsInMB = {};
    for (const [method, sizes] of Object.entries(stats)) {
      statsInMB[method] = {
        requestSizeMB: (sizes.requestSize / (1024 * 1024)).toFixed(2),
        responseSizeMB: (sizes.responseSize / (1024 * 1024)).toFixed(2)
      };
    }

    res.json(statsInMB);
  } catch (error) {
    console.error('Error al leer las estadísticas:', error.message);
    res.status(500).json({ error: 'No se pudo obtener las estadísticas.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor proxy en ejecución en http://localhost:${PORT}`);
});
