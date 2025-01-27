const axios = require('axios');
const moment = require('moment-timezone');
const fs = require('fs').promises;
const pool = require('../db'); // Importar la configuración de la base de datos
const nombreEstaciones = require('../config/nombreEstaciones'); // Importar el mapeo de nombres de estaciones
const nombreVariables = require('../config/nombreVariables'); // Importar el mapeo de variables estandarizadas

const dispositivos = ["SQM Mejillones", "SQM SierraGorda", "SQM Baquedano", "SQM MariaElena"];

// Función para obtener las marcas de tiempo
function obtenerMarcasDeTiempo() {
  const ahora = moment().tz('America/Santiago').subtract(1, 'hours'); // Hora actual en la zona horaria de Santiago
  const haceUnMinuto = ahora.clone().subtract(1, 'minutes'); // Hace 1 minuto
  /* console.log(`Hora actual: ${ahora.format()}`);
  console.log(`Hace 1 minuto: ${haceUnMinuto.format()}`); */

  const estampaTiempoFinal = ahora.format('YYYY-MM-DDTHH:mm:ss');
  const estampaTiempoInicial = haceUnMinuto.format('YYYY-MM-DDTHH:mm:ss');
  /* console.log(`=== Realizando consulta hora a la API inicio=== ${estampaTiempoInicial}`);
  console.log(`=== Realizando consulta hora a la API termino === ${estampaTiempoFinal}`); */

  return { estampaTiempoInicial, estampaTiempoFinal };
}

// Función para guardar datos en un archivo JSON
/* async function guardarDatosEnJSON(dispositivo, data) {
  const fileName = `${dispositivo.replace(/\s+/g, '_')}.json`;
  await fs.writeFile(fileName, JSON.stringify(data, null, 2));
  console.log(`=== Datos guardados correctamente en ${fileName} ===`);
}  */

// Función para transformar y almacenar la respuesta en un array
async function transformarRespuesta(response, dispositivo) {
  const datosArray = [];
  const nuevoNombreEstacion = nombreEstaciones[dispositivo] || dispositivo;

  for (const resultado of response.data.resultado) {
    for (const parametro of resultado.parametros) {
      const nombreOriginal = parametro.nombre;
      const nombreEstandarizado = nombreVariables[nombreOriginal] || nombreOriginal;
      const valor = parametro.valor;
      const estampaTiempo = moment(parametro.estampaTiempo).tz('America/Santiago').format('YYYY-MM-DD HH:mm:ss'); // Convertir al formato correcto y zona horaria

      datosArray.push([estampaTiempo, nuevoNombreEstacion, nombreEstandarizado, valor]);
      /* console.log(`Nombre: ${nombreEstandarizado}, Valor: ${valor}, EstampaTiempo: ${estampaTiempo}`); */
    }
  }
  return datosArray;
}

// Función para guardar los datos en MySQL
async function guardarDatosEnMySQL(datosArray) {
  const connection = await pool.getConnection();
  const query = 'INSERT INTO datos (timestamp, station_name, variable_name, valor) VALUES ?';
  if (datosArray.length > 0) {
    //console.log('Consulta SQL:', query);
    /* console.log('Valores:', datosArray); */
    //console.log('Datos a insertar:', datosArray); // Imprimir los datos antes de insertarlos
    await connection.query(query, [datosArray]);
    console.log(`=== Datos guardados correctamente en MySQL serpram===`);
  } else {
    console.log('No hay datos para insertar en la base de datos serpram.');
  }
  connection.release();
}

// Función para realizar la consulta a la API
async function consultarAPI(dispositivo, estampaTiempoInicial, estampaTiempoFinal, reintentos = 3) {
  let data = JSON.stringify({
    "estampaTiempoInicial": estampaTiempoInicial,
    "estampaTiempoFinal": estampaTiempoFinal,
    "tipoMedicion": 1,
    "consulta": [
      {
        "dispositivoId": dispositivo
      }
    ]
  });

  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'https://api.serpram.cl/air_ws/v1/api/getHistorico',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzUxMiJ9.eyJtYWlsIjoiIiwic3ViIjoic3FtLnNlcnByYW0iLCJjcmVhdGVkIjoxNzI4NDIwMDY5NDg0LCJ1c2VySWQiOjExMDEsImF1ZCI6IndlYiIsInJvbGUiOlt7ImF1dGhvcml0eSI6IlJPTEVfQ0xJRSJ9XSwiaWF0IjoxNzI4NDIwMDY5fQ.hTKtycJvz4CEQCj19QROwHa1EVOY-KzbnKDnGcdYuyNSjwcPwgb_ePk0nHh6WmGyZ5v8ckiDgTP0PP99wW_apA'
    },
    data: data
  };

  /* console.log('consulta', config);
  console.log('=== Realizando consulta a la API ===');
  console.log(`Parámetros:\n  Inicial: ${estampaTiempoInicial}\n  Final: ${estampaTiempoFinal}\n`); */

  try {
    const response = await axios.request(config);
    //console.log(`=== Datos recibidos correctamente para ${dispositivo} ===`);
    //console.log(JSON.stringify(response.data)); // Mostrar todos los datos en la consola

    if (response.data.resultado.length === 0 && reintentos > 0) {
      console.log(`=== No se encontraron datos, reintentando... (${reintentos} reintentos restantes) ===`);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Esperar 3 segundos antes de reintentar
      return await consultarAPI(dispositivo, estampaTiempoInicial, estampaTiempoFinal, reintentos - 1);
    }

    // Guardar la respuesta en un archivo JSON
    //await guardarDatosEnJSON(dispositivo, response.data);

    // Transformar y almacenar la respuesta en un array
    const datosArray = await transformarRespuesta(response, dispositivo);

    // Guardar los datos en MySQL
    await guardarDatosEnMySQL(datosArray);
  } catch (error) {
    console.error(`=== Error al realizar la consulta para ${dispositivo} ===`);
    console.error(error.message);
  }
}

// Función principal para realizar la consulta de los dispositivos
async function realizarConsulta() {
  const { estampaTiempoInicial, estampaTiempoFinal } = obtenerMarcasDeTiempo();

  for (let i = 0; i < dispositivos.length; i++) {
    await consultarAPI(dispositivos[i], estampaTiempoInicial, estampaTiempoFinal);
  }
}
/* setInterval(realizarConsulta, 60000); */
// Ejecutar la consulta inmediatamente al iniciar el programa
module.exports = { realizarConsulta };