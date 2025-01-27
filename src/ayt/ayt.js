const axios = require('axios');
const fs = require('fs').promises;
const moment = require('moment-timezone'); // Importar la biblioteca moment-timezone
const pool = require('../db'); // Importar la configuración de la base de datos
const nombreVariables = require('../config/nombreVariables'); // Importar el mapeo de variables estandarizadas
const { obtenerTokenayt } = require('./loginayt'); // Importar la función para obtener el token

// Arrays de tags para cada estación
const tagsE6 = [
  'VELOCIDAD_DEL_VIENTO_M/S_HUARA_MIN',
  'DIRECCION_DEL_VIENTO_HUARA_MIN',
  'PM10_HUARA_MIN',
  'HUMEDAD_PORCENTAJE_HUARA_MIN',
  'TEMPERATURA_C_HUARA_MIN',
  'RADIACION_W/m2_HUARA_MIN',
  'PLUVIOMETRO_MM_HUARA_MIN',
  'PRESION_ATM_hPa_HUARA_MIN',
  'SO2_PPBV_HUARA_MIN',
  'NO_PPBV_HUARA_MIN',
  'NOX_PPBV_HUARA_MIN',
  'CO_PPMV_HUARA_MIN',
  'O3_HUARA_MIN'
];

const tagsE7 = [
  'VELOCIDAD_DEL_VIENTO_M/S_EXOFVICTORIA_MIN',
  'DIRECCION_DEL_VIENTO_EXOFVICTORIA_MIN',
  'PM10_EXOFVICTORIA_MIN',
  'PM2.5_EXOFVICTORIA_MIN',
  'HUMEDAD_PORCENTAJE_EXOFVICTORIA_MIN',
  'TEMPERATURA_C_EXOFVICTORIA_MIN',
  'PRESION_ATM_hPa_EXOFVICTORIA_MIN',
  'SO2_PPBV_EXOFVICTORIA_MIN',
  'NO_PPBV_EXOFVICTORIA_MIN',
  'NOX_PPBV_EXOFVICTORIA_MIN',
  'CO_PPMV_EXOFVICTORIA_MIN'
];

const tagsE8 = [
  'DIRECCION_DEL_VIENTO_COLPINTADOS_MIN',
  'PM10_COLPINTADOS_MIN',
  'PM2.5_COLPINTADOS_MIN',
  'HUMEDAD_PORCENTAJE_COLPINTADOS_MIN',
  'TEMPERATURA_C_COLPINTADOS_MIN',
  'PRESION_ATM_hPa_COLPINTADOS_MIN',
  'SO2_PPBV_COLPINTADOS_MIN',
  'NO_PPBV_COLPINTADOS_MIN',
  'NOX_PPBV_COLPINTADOS_MIN',
  'CO_PPMV_COLPINTADOS_MIN'
];

// Función para realizar la solicitud para un tag específico
async function obtenerDatos(tag) {
  const fechaDesde = moment().format('YYYY-MM-DD'); // Fecha actual
  const fechaHasta = moment().add(1, 'days').format('YYYY-MM-DD'); // Un día más que la fecha actual

  let data = JSON.stringify({
    "usuario": "SQM",
    "password": "kxU84fseJBLC6w7D"
  });

  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: `http://104.41.40.103:8080/api/Cems/GetBetweenValues?id_cems=01&tag=${tag}&fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`,
    headers: { 
      'Accept': 'application/json;charset=UTF-8', 
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJTUU0iLCJleHAiOjE3MzcyMTQ4NDQsImlzcyI6ImF5dC5jbCIsImF1ZCI6ImF5dC5jbCJ9.QDuiE-Ozz2_P_CjphK2cqyL4ZiHxhYVVPUUG-hFLZy8', 
      'Content-Type': 'application/json'
    },
    data: data
  };

  try {
    let response = await axios.request(config);
    const datos = response.data;
    const ultimoRegistro = datos[datos.length - 1]; // Obtener el último registro
    //console.log(`Timestamp recibido para ${tag}:`, ultimoRegistro.timestamp); // Imprimir el timestamp recibido
    return ultimoRegistro;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      try {
        // Obtener el token actualizado
        const nuevoToken = await obtenerTokenayt();
        if (!nuevoToken) {
          throw new Error('No se pudo obtener un nuevo token');
        }
        // Actualizar el encabezado Authorization con el nuevo token
        config.headers['Authorization'] = `Bearer ${nuevoToken}`;
        // Reintentar la solicitud con el nuevo token
        const response = await axios.request(config);
        const datos = response.data;
        const ultimoRegistro = datos[datos.length - 1]; // Obtener el último registro
        //console.log(`Último dato para ${tag} (reintento):`, JSON.stringify(ultimoRegistro));
        //console.log(`Timestamp recibido para ${tag} (reintento):`, ultimoRegistro.timestamp); // Imprimir el timestamp recibido
        return ultimoRegistro;
      } catch (retryError) {
        console.error(`Error al reintentar la solicitud para ${tag}:`, retryError.message);
        return null;
      }
    } else {
      console.error(`Error al obtener datos para ${tag}:`, error.message);
      return null;
    }
  }
}

// Función para transformar y estandarizar la respuesta
function transformarRespuesta(tag, datos) {
  const estampaTiempo = moment(datos.timestamp, 'YYYY/MM/DDTHH:mm:ssZ').tz('America/Santiago').format('YYYY-MM-DD HH:mm:ss'); // Convertir al formato correcto en la zona horaria de Santiago
  //console.log(`Timestamp transformado para ${tag}:`, estampaTiempo); // Imprimir el timestamp transformado
  const valor = datos.value;
  let estacion = '';

  if (tagsE6.includes(tag)) {
    estacion = 'E6';
  } else if (tagsE7.includes(tag)) {
    estacion = 'E7';
  } else if (tagsE8.includes(tag)) {
    estacion = 'E8';
  }

  const nombreEstandarizado = nombreVariables[tag] || tag; // Cambiar el tag por el nombre estandarizado

  return [estampaTiempo, estacion, nombreEstandarizado, valor]; // Asegúrate de devolver un array
}

// Función principal para iterar sobre los tags y obtener los datos
async function obtenerDatosParaTodosLosTags() {
  const resultados = [];

  const allTags = [...tagsE6, ...tagsE7, ...tagsE8];

  for (const tag of allTags) {
    const datos = await obtenerDatos(tag);
    if (datos) {
      const datosTransformados = transformarRespuesta(tag, datos);
      resultados.push(datosTransformados);
    }
  }

  // Guardar los datos en MySQL
  await guardarDatosEnMySQL(resultados);

  // Escribir los resultados en un archivo JSON
 /*  try {
    console.log('Guardando resultados en JSON...');
    await fs.writeFile('resultados.json', JSON.stringify(resultados, null, 2));
    console.log('Resultados guardados en resultados.json');
  } catch (error) {
    console.error('Error al guardar los resultados en el archivo JSON:', error.message);
  } */
}

// Función para guardar los datos en MySQL
async function guardarDatosEnMySQL(datosArray) {
  const connection = await pool.getConnection();
  const queryInsert = 'INSERT INTO datos (timestamp, station_name, variable_name, valor) VALUES ?';
  const queryCheck = 'SELECT COUNT(*) as count FROM datos WHERE timestamp = ? AND station_name = ? AND variable_name = ?';

  const datosParaInsertar = [];

  for (const datos of datosArray) {
    if (!Array.isArray(datos)) {
     // console.error('Datos no es un array:', datos);
      continue;
    }
    const [timestamp, station_name, variable_name, valor] = datos;
    //console.log(`Timestamp enviado a la base de datos para ${station_name}, ${variable_name}:`, timestamp); // Imprimir el timestamp enviado a la base de datos
    const [rows] = await connection.query(queryCheck, [timestamp, station_name, variable_name]);
    if (rows[0].count === 0) {
      datosParaInsertar.push(datos);
    } else {
     // console.log(`Registro ya existe para ${timestamp}, ${station_name}, ${variable_name}`);
    }
  }

  if (datosParaInsertar.length > 0) {
    await connection.query(queryInsert, [datosParaInsertar]);
    console.log(`=== Datos guardados correctamente en MySQL Ayt ===`);
  } else {
    console.log('No hay datos nuevos para insertar en la base de datos.');
  }

  connection.release();
}

// Exportar la función principal
module.exports = { obtenerDatosParaTodosLosTags };