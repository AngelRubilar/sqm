import axios from 'axios';
import moment from 'moment-timezone';
import { promises as fs } from 'fs';
import { pool } from '../db';
import { nombreEstaciones } from '../config/nombreEstaciones';
import { nombreVariables } from '../config/nombreVariables';

interface Parametro {
  nombre: string;
  valor: number;
  estampaTiempo: string;
}

interface Resultado {
  parametros: Parametro[];
}

interface APIResponse {
  resultado: Resultado[];
}

const dispositivos: string[] = ["SQM Mejillones", "SQM SierraGorda", "SQM Baquedano", "SQM MariaElena"];

function obtenerMarcasDeTiempo(): { estampaTiempoInicial: string; estampaTiempoFinal: string } {
  const ahora = moment().tz('America/Santiago').subtract(1, 'hours');
  const haceUnMinuto = ahora.clone().subtract(1, 'minutes');

  const estampaTiempoFinal = ahora.format('YYYY-MM-DDTHH:mm:ss');
  const estampaTiempoInicial = haceUnMinuto.format('YYYY-MM-DDTHH:mm:ss');

  return { estampaTiempoInicial, estampaTiempoFinal };
}

async function transformarRespuesta(response: { data: APIResponse }, dispositivo: string): Promise<[string, string, string, number][]> {
  const datosArray: [string, string, string, number][] = [];
  const nuevoNombreEstacion = nombreEstaciones[dispositivo] || dispositivo;

  for (const resultado of response.data.resultado) {
    for (const parametro of resultado.parametros) {
      const nombreOriginal = parametro.nombre;
      const nombreEstandarizado = nombreVariables[nombreOriginal] || nombreOriginal;
      const valor = parametro.valor;
      const estampaTiempo = moment(parametro.estampaTiempo).tz('America/Santiago').format('YYYY-MM-DD HH:mm:ss');

      datosArray.push([estampaTiempo, nuevoNombreEstacion, nombreEstandarizado, valor]);
    }
  }
  return datosArray;
}

async function guardarDatosEnMySQL(datosArray: [string, string, string, number][]): Promise<void> {
  const connection = await pool.getConnection();
  const query = 'INSERT INTO datos (timestamp, station_name, variable_name, valor) VALUES ?';
  
  try {
    if (datosArray.length > 0) {
      await connection.query(query, [datosArray]);
      console.log(`=== Datos guardados correctamente en MySQL serpram===`);
    } else {
      console.log('No hay datos para insertar en la base de datos serpram.');
    }
  } finally {
    connection.release();
  }
}

async function consultarAPI(
  dispositivo: string, 
  estampaTiempoInicial: string, 
  estampaTiempoFinal: string, 
  reintentos: number = 3
): Promise<void> {
  const data = JSON.stringify({
    estampaTiempoInicial,
    estampaTiempoFinal,
    tipoMedicion: 1,
    consulta: [{ dispositivoId: dispositivo }]
  });

  const config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'https://api.serpram.cl/air_ws/v1/api/getHistorico',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzUxMiJ9.eyJtYWlsIjoiIiwic3ViIjoic3FtLnNlcnByYW0iLCJjcmVhdGVkIjoxNzI4NDIwMDY5NDg0LCJ1c2VySWQiOjExMDEsImF1ZCI6IndlYiIsInJvbGUiOlt7ImF1dGhvcml0eSI6IlJPTEVfQ0xJRSJ9XSwiaWF0IjoxNzI4NDIwMDY5fQ.hTKtycJvz4CEQCj19QROwHa1EVOY-KzbnKDnGcdYuyNSjwcPwgb_ePk0nHh6WmGyZ5v8ckiDgTP0PP99wW_apA'
    },
    data
  };

  try {
    const response = await axios.request<APIResponse>(config);

    if (response.data.resultado.length === 0 && reintentos > 0) {
      console.log(`=== No se encontraron datos, reintentando... (${reintentos} reintentos restantes) ===`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return await consultarAPI(dispositivo, estampaTiempoInicial, estampaTiempoFinal, reintentos - 1);
    }

    const datosArray = await transformarRespuesta(response, dispositivo);
    await guardarDatosEnMySQL(datosArray);
  } catch (error) {
    console.error(`=== Error al realizar la consulta para ${dispositivo} ===`);
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
}

async function realizarConsulta(): Promise<void> {
  const { estampaTiempoInicial, estampaTiempoFinal } = obtenerMarcasDeTiempo();

  for (const dispositivo of dispositivos) {
    await consultarAPI(dispositivo, estampaTiempoInicial, estampaTiempoFinal);
  }
}

export { realizarConsulta };
