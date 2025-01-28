import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from './db';
import moment from 'moment-timezone';

interface DataRow extends RowDataPacket {
  timestamp: string;
  station_name: string;
  variable_name: string;
  valor: number;
}

type DataArray = [string, string, string, number][];

export async function moverDatosHistoricos(): Promise<void> {
  let connection!: PoolConnection;
  
  try {
    connection = await pool.getConnection();

    // Select data older than 7 days
    const fechaLimite: string = moment().tz('America/Santiago').subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss');
    console.log('Fecha límite:', fechaLimite);
    
    const [rows] = await connection.query<DataRow[]>('SELECT * FROM datos WHERE timestamp <= ?', [fechaLimite]);

    if (rows.length > 0) {
      const datosSerpram: DataArray = [];
      const datosEsinfa: DataArray = [];
      const datosAyt: DataArray = [];

      // Separate data by station
      for (const row of rows) {
        const dataPoint: [string, string, string, number] = [
          row.timestamp,
          row.station_name,
          row.variable_name,
          row.valor
        ];

        if (['E1', 'E2', 'E3', 'E4'].includes(row.station_name)) {
          datosSerpram.push(dataPoint);
        } else if (row.station_name === 'E5') {
          datosEsinfa.push(dataPoint);
        } else if (['E6', 'E7', 'E8'].includes(row.station_name)) {
          datosAyt.push(dataPoint);
        }
      }

      // Insert data into corresponding tables
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

      // Delete old data from original table
      const queryDelete = 'DELETE FROM datos WHERE timestamp < ?';
      await connection.query(queryDelete, [fechaLimite]);

      console.log('=== Datos movidos correctamente a las tablas correspondientes ===');
    } else {
      console.log('No hay datos antiguos para mover.');
    }
  } catch (error) {
    console.error('Error al mover los datos antiguos:', error instanceof Error ? error.message : String(error));
  } finally {
    if (connection) {
      connection.release();
    }
  }
}