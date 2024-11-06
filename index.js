const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para permitir CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Ruta dinámica del proxy
app.get('/proxy/*', async (req, res) => {
  // Extraemos la URL de destino de la ruta
  const targetUrl = req.params[0];  // Obtiene "https://test.com/api/get" desde la URL "/proxy/https://test.com/api/get"
    console.log(targetUrl)
  try {
    // Realizamos la solicitud a la URL de destino con los mismos parámetros de la solicitud original
    const response = await axios({
      method: req.method,
      url: targetUrl,
      params: req.query,
      headers: {
        ...req.headers,
        host: new URL(targetUrl).host // Ajusta el host a la URL de destino
      }
    });
    
    // Enviamos la respuesta de vuelta al cliente
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error en la solicitud del proxy:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor proxy en ejecución en http://localhost:${PORT}`);
});
