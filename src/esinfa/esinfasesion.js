const axios = require('axios');

async function obtenerToken() {
  let data = JSON.stringify({
    "username": "apisqm@weboard.cl",
    "password": "24bb7b76ce34d36a2aa88670cbfdbf88",
    "client_name": "esinfa"
  });

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://airsqm.weboard.cl/login',
    headers: { 
      'Content-Type': 'application/json'
    },
    data: data
  };

  try {
    const response = await axios.request(config);
    const token = response.data.token; // Extraer el token de la respuesta
    /* console.log('Token:', token);
    console.log('=== Token obtenido correctamente ===',response.data); */
    return token; // Devolver el token
  } catch (error) {
    console.log('Error:', error.message);
    throw error; // Lanzar el error para que pueda ser manejado por el llamador
  }
}

module.exports = { obtenerToken };