const axios = require('axios');

async function obtenerTokenayt() {
  let data = JSON.stringify({
    "usuario": "SQM",
    "password": "kxU84fseJBLC6w7D"
  });

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'http://104.41.40.103:8080/api/Auth/Login',
    headers: { 
      'Content-Type': 'application/json'
    },
    data: data
  };

  try {
    const response = await axios.request(config);
    const token = response.data.authenticationToken; // Extraer el token de la respuesta
    //console.log(response.data);
    //console.log('Token:', token);
    return token; // Devolver el token
  } catch (error) {
    console.error('Error al obtener el token:', error.message);
    throw error; // Lanzar el error para que pueda ser manejado por el llamador
  }
}

module.exports = { obtenerTokenayt };