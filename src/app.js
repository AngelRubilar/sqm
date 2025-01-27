const express = require('express');
const pool = require('./db'); // Importar la configuración de la base de datos
const { realizarConsulta } = require('./serpram/serpram'); // Importar la función realizarConsulta
const { obtenerDatos } = require('./esinfa/esinfa'); // Importar la función obtenerDatos
const { obtenerDatosParaTodosLosTags } = require('./ayt/ayt'); // Importar la función obtenerDatosParaTodosLosTags
const { moverDatosHistoricos } = require('./traspaso'); // Importar la función moverDatosHistoricos
const moment = require('moment'); // Importar la biblioteca moment
const app = express();
const port = 3000; // Puedes cambiar el puerto si es necesario

// Middleware para parsear JSON
app.use(express.json());

// Ruta para obtener todos los datos de la tabla
app.get('/api/datos', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const fechaLimite = moment().tz('America/Santiago').subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss');
    const [rows] = await connection.query('SELECT * FROM datos WHERE timestamp >= ?', [fechaLimite]);
    connection.release();
    console.log('Datos obtenidos:', rows); // Imprimir los resultados de la consulta
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener los datos:', error.message);
    res.status(500).send(`Error al obtener los datos: ${error.message}`);
  }
});

// Nuevo endpoint para obtener datos solo del pm10
app.get('/api/datos-PM10', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const fechaLimite = moment().tz('America/Santiago').subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss');
    
    const [rows] = await connection.query('SELECT * FROM datos WHERE variable_name="PM10" AND timestamp >= ?', [fechaLimite]);
    
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener los datos de PM10:', error.message);
    res.status(500).send(`Error al obtener los datos de PM10: ${error.message}`);
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