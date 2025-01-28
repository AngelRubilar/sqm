import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import moment from 'moment-timezone';
import { readFile, writeFile } from 'fs/promises';
import { pool } from '../db';
import { nombreEstaciones } from '../config/nombreEstaciones';
import {nombreVariables} from '../config/nombreVariables';
import { obtenerToken } from './esinfasesion';

interface EstacionData {
  station: string;
  date_capture: string;
  data: ParametroData[];
}

interface ParametroData {
  name: string;
  value: number;
}

type DatosArray = [string, string, string, number][];

async function obtenerDatos(): Promise<void> {
  console.log('Obteniendo datos de la estacion de esinfa');

  const config: AxiosRequestConfig = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'https://airsqm.weboard.cl/station/',
    headers: { 
      'Authorization': 'Bearer '
    }
  };

  try {
    let response: AxiosResponse = await axios.request(config);

    if (response.status === 500) {
      const token = await obtenerToken();
      config.headers!['Authorization'] = `Bearer ${token}`;
      console.log('Token:', token);
      response = await axios.request(config);
    }

    console.log(response.status);
    const datosArray = await transformarRespuesta(response.data);
    await guardarDatosEnMySQL(datosArray);

  } catch (error: any) {
    if (error.response?.status === 500) {
      try {
        const token = await obtenerToken();
        config.headers!['Authorization'] = `Bearer ${token}`;
        const response = await axios.request(config);
        console.log(response.status);
        const datosArray = await transformarRespuesta(response.data);
        await guardarDatosEnMySQL(datosArray);
      } catch (retryError: any) {
        console.error('Error al reintentar la solicitud:', retryError.message);
      }
    } else {
      console.error('Error al obtener los datos:', error.message);
    }
  }
}

async function transformarRespuesta(data: EstacionData[]): Promise<DatosArray> {
  const datosArray: DatosArray = [];
  
  for (const resultado of data) {
    const dispositivo = resultado.station;
    const nuevoNombreEstacion = nombreEstaciones[dispositivo] || dispositivo;
    const estampaTiempo = moment.tz(resultado.date_capture, 'America/Santiago')
      .add(1, 'hours')
      .format('YYYY-MM-DD HH:mm:ss');

    console.log(`Estación: ${nuevoNombreEstacion}, Fecha: ${estampaTiempo}`);

    for (const parametro of resultado.data) {
      const nombreOriginal = parametro.name;
      const nombreEstandarizado = nombreVariables[nombreOriginal] || nombreOriginal;
      const valor = parametro.value;

      if (estampaTiempo === 'Invalid date') {
        console.error(`Fecha inválida para el parámetro: ${JSON.stringify(parametro)}`);
        continue;
      }

      datosArray.push([estampaTiempo, nuevoNombreEstacion, nombreEstandarizado, valor]);
    }
  }
  return datosArray;
}

async function guardarDatosEnMySQL(datosArray: DatosArray): Promise<void> {
  const connection = await pool.getConnection();
  const queryInsert = 'INSERT INTO datos (timestamp, station_name, variable_name, valor) VALUES ?';
  const queryCheck = 'SELECT COUNT(*) as count FROM datos WHERE timestamp = ? AND station_name = ? AND variable_name = ?';

  const datosParaInsertar: DatosArray = [];

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

export { obtenerDatos };
