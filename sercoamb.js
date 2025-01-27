const axios = require('axios');
const fs = require('fs'); // Importar el módulo fs

// Función para obtener el `timestamp` de hace tres horas y realizar la solicitud
function obtenerDatos() {
  const timestampActual = Math.floor(Date.now() / 1000); // Obtener el `timestamp` actual en segundos
  console.log('Timestamp actual:', timestampActual); // Imprimir el `timestamp` actual
  const timestampHace3Horas = timestampActual - (10 * 60 * 60); // Restar 3 horas (10800 segundos)
  console.log('Timestamp hace 3 horas:', timestampHace3Horas); // Imprimir el `timestamp` de hace 3 horas
  const data = JSON.stringify({
    terminalID: "02054888SKY54C5",
    timeStampInicio: timestampHace3Horas.toString(),
    usuario: "usr_sercoamb",
    pass: "Sercoamb.2024"
  });

  console.log('Datos enviados en la solicitud:', data); // Imprimir los datos enviados en la solicitud

  const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'http://api.io-sat.cl/IosatApi.asmx/GetData',
    headers: { 
      'Content-Type': 'application/json;charset=utf-8'
    },
    data: data
  };

  axios.request(config)
    .then((response) => {
      const responseData = response.data;
      console.log(JSON.stringify(responseData));

      // Guardar los datos en un archivo JSON
      fs.writeFile('sercoamb.json', JSON.stringify(responseData, null, 2), (err) => {
        if (err) {
          console.error('Error al guardar los datos en el archivo JSON:', err);
        } else {
          console.log('Datos guardados correctamente en sercoamb.json');
        }
      });
    })
    .catch((error) => {
      if (error.response) {
        // El servidor respondió con un código de estado fuera del rango 2xx
        console.error('Error en la respuesta del servidor:', error.response.status);
        console.error('Datos de la respuesta:', error.response.data);
      } else if (error.request) {
        // La solicitud fue hecha pero no se recibió respuesta
        console.error('No se recibió respuesta del servidor:', error.request);
      } else {
        // Algo sucedió al configurar la solicitud que desencadenó un error
        console.error('Error al configurar la solicitud:', error.message);
      }
    });
}

// Ejecutar la función inmediatamente
obtenerDatos();

// Configurar la ejecución periódica cada minuto (60000 milisegundos)
setInterval(obtenerDatos, 60000);