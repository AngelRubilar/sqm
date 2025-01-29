import axios, { AxiosRequestConfig } from 'axios';
import { promises as fs } from 'fs';
import moment from 'moment-timezone';
import { Pool, PoolConnection } from 'mysql2/promise';
import pool from '../db';
import nombreVariables from '../config/nombreVariables';
import { obtenerTokenayt } from './loginayt';

// Define interfaces for data structures
interface DatosResponse {
  timestamp: string;
  value: number;
}

type DatosTransformados = [string, string, string, number];

// Arrays of tags for each station
const tagsE6: string[] = [
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

const tagsE7: string[] = [
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

const tagsE8: string[] = [
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

async function obtenerDatos(tag: string): Promise<DatosResponse | null> {
  const fechaDesde = moment().format('YYYY-MM-DD');
  const fechaHasta = moment().add(1, 'days').format('YYYY-MM-DD');

  const data = JSON.stringify({
    "usuario": "SQM",
    "password": "kxU84fseJBLC6w7D"
  });

  const config: AxiosRequestConfig = {
    method: 'get',
    maxBodyLength: Infinity,
    url: `http://104.41.40.103:8080/api/Cems/GetBetweenValues?id_cems=01&tag=${tag}&fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`,
    headers: { 
      'Accept': 'application/json;charset=UTF-8', 
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJTUU0iLCJleHAiOjE3MzcyMTQ4NDQsImlzcyI6ImF5dC5jbCIsImF1ZCI6ImF5dC5jbCJ9.QDuiE-Ozz2_P_CjphK2cqyL4ZiHxhYVVPUUG-hFLZy8', 
      'Content-Type': 'application/json'
    },
    data
  };

  try {
    const response = await axios.request(config);
    const datos: DatosResponse[] = response.data;
    return datos[datos.length - 1];
  } catch (error: any) {
    if (error.response?.status === 401) {
      try {
        const nuevoToken = await obtenerTokenayt();
        if (!nuevoToken) {
          throw new Error('No se pudo obtener un nuevo token');
        }
        config.headers['Authorization'] = `Bearer ${nuevoToken}`;
        const response = await axios.request(config);
        const datos: DatosResponse[] = response.data;
        return datos[datos.length - 1];
      } catch (retryError: any) {
        console.error(`Error al reintentar la solicitud para ${tag}:`, retryError.message);
        return null;
      }
    }
    console.error(`Error al obtener datos para ${tag}:`, error.message);
    return null;
  }
}

function transformarRespuesta(tag: string, datos: DatosResponse): DatosTransformados {
  const estampaTiempo = moment(datos.timestamp, 'YYYY/MM/DDTHH:mm:ssZ')
    .tz('America/Santiago')
    .format('YYYY-MM-DD HH:mm:ss');
  const valor = datos.value;
  let estacion = '';

  if (tagsE6.includes(tag)) {
    estacion = 'E6';
  } else if (tagsE7.includes(tag)) {
    estacion = 'E7';
  } else if (tagsE8.includes(tag)) {
    estacion = 'E8';
  }

  const nombreEstandarizado = nombreVariables[tag] || tag;

  return [estampaTiempo, estacion, nombreEstandarizado, valor];
}

async function guardarDatosEnMySQL(datosArray: DatosTransformados[]): Promise<void> {
  const connection: PoolConnection = await pool.getConnection();
  const queryInsert = 'INSERT INTO datos (timestamp, station_name, variable_name, valor) VALUES ?';
  const queryCheck = 'SELECT COUNT(*) as count FROM datos WHERE timestamp = ? AND station_name = ? AND variable_name = ?';

  const datosParaInsertar: DatosTransformados[] = [];

  for (const datos of datosArray) {
    const [timestamp, station_name, variable_name, valor] = datos;
    const [rows] = await connection.query(queryCheck, [timestamp, station_name, variable_name]);
    if (rows[0].count === 0) {
      datosParaInsertar.push(datos);
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

export async function obtenerDatosParaTodosLosTags(): Promise<void> {
  const resultados: DatosTransformados[] = [];
  const allTags = [...tagsE6, ...tagsE7, ...tagsE8];

  for (const tag of allTags) {
    const datos = await obtenerDatos(tag);
    if (datos) {
      const datosTransformados = transformarRespuesta(tag, datos);
      resultados.push(datosTransformados);
    }
  }

  await guardarDatosEnMySQL(resultados);
}
