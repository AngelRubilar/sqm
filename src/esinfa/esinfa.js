const axios = require('axios');
const fs = require('fs').promises;
const moment = require('moment-timezone'); // Importar la biblioteca moment-timezone
const pool = require('../db'); // Importar la configuración de la base de datos
const nombreEstaciones = require('../config/nombreEstaciones'); // Importar el mapeo de nombres de estaciones
const nombreVariables = require('../config/nombreVariables'); // Importar el mapeo de variables estandarizadas
const { obtenerToken } = require('./esinfasesion');

async function obtenerDatos() {
  console.log('Obteniendo datos de la estacion de esinfa');
  let data = '';

  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'https://airsqm.weboard.cl/station/',
    headers: { 
      'Authorization': 'Bearer '
    },
    data: data
  };

  try {
    let response = await axios.request(config);

    if (response.status === 500) {
      // Obtener el token y actualizar el encabezado Authorization
      const token = await obtenerToken();
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('Token:', token);

      // Reintentar la solicitud con el token actualizado
      response = await axios.request(config);
    }

    console.log(response.status);

    // Transformar y estandarizar la respuesta
    const datosArray = await transformarRespuesta(response.data);

    // Guardar los datos en MySQL
    await guardarDatosEnMySQL(datosArray);

  } catch (error) {
    if (error.response && error.response.status === 500) {
      try {
        // Obtener el token y actualizar el encabezado Authorization
        const token = await obtenerToken();
        config.headers['Authorization'] = `Bearer ${token}`;

        // Reintentar la solicitud con el token actualizado
        const response = await axios.request(config);

        console.log(response.status);

        // Transformar y estandarizar la respuesta
        const datosArray = await transformarRespuesta(response.data);

        // Guardar los datos en MySQL
        await guardarDatosEnMySQL(datosArray);
      } catch (retryError) {
        console.error('Error al reintentar la solicitud:', retryError.message);
      }
    } else {
      console.error('Error al obtener los datos:', error.message);
    }
  }
}

// Función para transformar y estandarizar la respuesta
async function transformarRespuesta(data) {
  const datosArray = [];
  for (const resultado of data) {
    const dispositivo = resultado.station;
    const nuevoNombreEstacion = nombreEstaciones[dispositivo] || dispositivo;
    const estampaTiempo = moment.tz(resultado.date_capture, 'America/Santiago').add(1, 'hours').format('YYYY-MM-DD HH:mm:ss'); // Convertir al formato correcto y zona horaria y agregar una hora
    console.log(`Estación: ${nuevoNombreEstacion}, Fecha: ${estampaTiempo}`);
    for (const parametro of resultado.data) {
      const nombreOriginal = parametro.name;
      const nombreEstandarizado = nombreVariables[nombreOriginal] || nombreOriginal;
      const valor = parametro.value;

      if (estampaTiempo === 'Invalid date') {
        console.error(`Fecha inválida para el parámetro: ${JSON.stringify(parametro)}`);
        continue; // Saltar este registro si la fecha es inválida
      }

      datosArray.push([estampaTiempo, nuevoNombreEstacion, nombreEstandarizado, valor]);
      //console.log(`Nombre: ${nombreEstandarizado}, Valor: ${valor}, EstampaTiempo: ${estampaTiempo}`);
    }
  }
  return datosArray;
}

// Función para guardar los datos en MySQL
async function guardarDatosEnMySQL(datosArray) {
  const connection = await pool.getConnection();
  const queryInsert = 'INSERT INTO datos (timestamp, station_name, variable_name, valor) VALUES ?';
  const queryCheck = 'SELECT COUNT(*) as count FROM datos WHERE timestamp = ? AND station_name = ? AND variable_name = ?';

  const datosParaInsertar = [];

  for (const datos of datosArray) {
    const [timestamp, station_name, variable_name, valor] = datos;
    const [rows] = await connection.query(queryCheck, [timestamp, station_name, variable_name]);
    if (rows[0].count === 0) {
      datosParaInsertar.push(datos);
    } else {
      console.log(`Registro ya existe para ${timestamp}, ${station_name}, ${variable_name}`);
    }
  }

  if (datosParaInsertar.length > 0) {
    await connection.query(queryInsert, [datosParaInsertar]);
    console.log(`=== Datos guardados correctamente en MySQL estacion de esinfa ===`);
  } else {
    console.log('No hay datos nuevos para insertar en la base de datos de esinfa.');
  }

  connection.release();
}

// Ejecutar la función principal
module.exports = { obtenerDatos };