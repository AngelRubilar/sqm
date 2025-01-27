const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 3306, // Cambiar el puerto a 3307
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'datos_api',
  connectTimeout: 10000
});

module.exports = pool;