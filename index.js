const axios = require('axios');


// URL para el login de serpram
const apiUrl = 'https://api.serpram.cl/air_ws/v1/api/login';

// Estos son los datos para el inicio de sesión
const requestBody = {
  username: "sqm.serpram",
  password: "S5t2JK!N6%8!"
};

// Función para obtener el token de la API
async function obtenerDatos() {
  try {
    // Realizamos la solicitud POST con los encabezados y el cuerpo
    const response = await axios.post(apiUrl, requestBody);

    // Verificar si la respuesta contiene el token (ajusta el campo si es necesario)
    const token = response.data.value || response.data.token; // Ajusta el campo según lo que retorne la API
    if (token) {
      console.log('Token recibido:', token);
      // Llamamos a otra función para realizar la solicitud con el token
      obtenerDatosToken(token);
    } else {
      console.error('No se recibió el token');
    }

  } catch (error) {
    if (error.response) {
      // Error del servidor (Respuesta)
      console.error('Error al hacer la solicitud de login:', error.response.status, error.response.data);
    } else if (error.request) {
      // Error de solicitud (No hay respuesta)
      console.error('No se recibió respuesta del servidor:', error.request);
    } else {
      // Error de configuración de solicitud
      console.error('Error en la configuración de la solicitud:', error.message);
    }
  }
}

// Función para obtener los datos utilizando el token
async function obtenerDatosToken(token) {
  const apiUrlDatos = 'https://api.serpram.cl/air_ws/v1/api/getHistorico';

  // Configuración de los parámetros para la solicitud GET (query parameters)
  const params = new URLSearchParams({
    estampaTiempoInicial: "2024-12-02T00:00:00-0300",
    estampaTiempoFinal: "2024-12-02T10:00-0300",
    tipoMedicion: 1,
    consulta: JSON.stringify([
      { dispositivoId: "SQM Mejillones" }
    ])
  });

  // Configuración de los encabezados, aquí incluimos el token
  const config = {
    method: 'get',
    maxBodyLength: Infinity,
    headers: {
      'Authorization': `Bearer ${token}`,  // Añadir el token en el encabezado de la solicitud
      'Content-Type': 'application/json'   // Definir el tipo de contenido
    },
    params: params // Pasamos los parámetros en el formato adecuado
  };

  console.log('Configuración de solicitud:', config);

  try {
    // Realizamos la solicitud GET con los parámetros y el token en los encabezados
    const response = await axios.get(apiUrlDatos, config);
    
    // Imprimir la respuesta de la API con los datos protegidos
    console.log('Datos obtenidos con token:', response.status);

  } catch (error) {
    if (error.response) {
      // Error del servidor (Respuesta)
      console.error('Error al hacer la solicitud con el token:', error.response.status, error.response.data);
    } else if (error.request) {
      // Error de solicitud (No hay respuesta)
      console.error('No se recibió respuesta del servidor:', error.request);
    } else {
      // Error de configuración de solicitud
      console.error('Error en la configuración de la solicitud:', error.message);
    }
  }
}


// Llamamos a la función de login para obtener el token y luego realizar la consulta
obtenerDatos();
