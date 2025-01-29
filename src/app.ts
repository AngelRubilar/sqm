import express, { Request, Response } from 'express';
import { pool } from './db';
import { realizarConsulta } from './serpram/serpram';
import { obtenerDatos } from './esinfa/esinfa';
import { obtenerDatosParaTodosLosTags } from './ayt/ayt';
import { moverDatosHistoricos } from './traspaso';

const app = express();
const port = 3000;

// Middleware para parsear JSON
app.use(express.json());

// Ruta para obtener todos los datos de la tabla
app.get('/api/datos', async (req: Request, res: Response) => {
  try {
    const connection = await pool.getConnection();
    const fechaLimite = moment().tz('America/Santiago').subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss');
    const [rows] = await connection.query('SELECT * FROM datos WHERE timestamp >= ?', [fechaLimite]);
    connection.release();
    console.log('Datos obtenidos:', rows);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener los datos:', error instanceof Error ? error.message : String(error));
    res.status(500).send(`Error al obtener los datos: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// Nuevo endpoint para obtener datos solo del pm10
app.get('/api/datos-PM10', async (req: Request, res: Response) => {
  try {
    const connection = await pool.getConnection();
    const fechaLimite = moment().tz('America/Santiago').subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss');
    
    const [rows] = await connection.query('SELECT * FROM datos WHERE variable_name="PM10" AND timestamp >= ?', [fechaLimite]);
    
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener los datos de PM10:', error instanceof Error ? error.message : String(error));
    res.status(500).send(`Error al obtener los datos de PM10: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

// Ejecutar las consultas automáticamente cada minuto
setInterval(() => {
  console.log('Ejecutando realizarConsulta Serpram');
  realizarConsulta();
  console.log('Ejecutando obtenerDatos Esinfa');
  obtenerDatos();
  console.log('Ejecutando obtenerDatosParaTodosLosTags Ayt');
  obtenerDatosParaTodosLosTags();
}, 60000);

// Ejecutar moverDatosHistoricos cada 10 minutos
setInterval(() => {
  console.log('Ejecutando moverDatosHistoricos');
  moverDatosHistoricos();
}, 60000);