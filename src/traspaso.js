const pool = require('./db'); // Importar la configuración de la base de datos
const moment = require('moment'); // Importar la biblioteca moment

async function moverDatosHistoricos() {
  const connection = await pool.getConnection();

  try {
    // Seleccionar los datos que tienen más de 7 días de antigüedad
    const fechaLimite = moment().tz('America/Santiago').subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss');
    console.log('Fecha límite:', fechaLimite);
    const [rows] = await connection.query('SELECT * FROM datos WHERE timestamp <= ?', [fechaLimite]);

    if (rows.length > 0) {
      const datosSerpram = [];
      const datosEsinfa = [];
      const datosAyt = [];

      // Separar los datos según la estación
      for (const row of rows) {
        if (['E1', 'E2', 'E3', 'E4'].includes(row.station_name)) {
          datosSerpram.push([row.timestamp, row.station_name, row.variable_name, row.valor]);
        } else if (row.station_name === 'E5') {
          datosEsinfa.push([row.timestamp, row.station_name, row.variable_name, row.valor]);
        } else if (['E6', 'E7', 'E8'].includes(row.station_name)) {
          datosAyt.push([row.timestamp, row.station_name, row.variable_name, row.valor]);
        }
      }

      // Insertar los datos en las tablas correspondientes
      if (datosSerpram.length > 0) {
        const queryInsertSerpram = 'INSERT INTO serpram (timestamp, station_name, variable_name, valor) VALUES ?';
        await connection.query(queryInsertSerpram, [datosSerpram]);
      }

      if (datosEsinfa.length > 0) {
        const queryInsertEsinfa = 'INSERT INTO esinfa (timestamp, station_name, variable_name, valor) VALUES ?';
        await connection.query(queryInsertEsinfa, [datosEsinfa]);
      }

      if (datosAyt.length > 0) {
        const queryInsertAyt = 'INSERT INTO ayt (timestamp, station_name, variable_name, valor) VALUES ?';
        await connection.query(queryInsertAyt, [datosAyt]);
      }

      // Eliminar los datos antiguos de la tabla original
      const queryDelete = 'DELETE FROM datos WHERE timestamp < ?';
      await connection.query(queryDelete, [fechaLimite]);

      console.log(`=== Datos movidos correctamente a las tablas correspondientes ===`);
    } else {
      console.log('No hay datos antiguos para mover.');
    }
  } catch (error) {
    console.error('Error al mover los datos antiguos:', error.message);
  } finally {
    connection.release();
  }
}

// Ejecutar la función principal 
module.exports = { moverDatosHistoricos };