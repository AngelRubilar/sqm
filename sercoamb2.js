const axios = require('axios');
const fs = require('fs'); // Importar el módulo fs
let data = JSON.stringify({
  "user": "SQM",
  "password": "$sercoamb",
  "Oricod": "010",
  "Ciacod": "3000028966",
  "LocCod": "011-AIRE-300001",
  "LocUbiNum": "100",
  "Fec_Desde": "24-01-2025",
  "Fec_Hasta": "24-01-2025",
  "Frecuencia": "M"
});

let config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://sercoambvm.uc.r.appspot.com/json/ServicioDataSQM',
  headers: { 
    'Content-Type': 'application/json'
  },
  data : data
};

axios.request(config)
.then((response) => {
    const responseData = response.data;
  console.log(JSON.stringify(response.data));
    // Guardar los datos en un archivo JSON
          fs.writeFile('sercoamb2.json', JSON.stringify(responseData, null, 2), (err) => {
            if (err) {
              console.error('Error al guardar los datos en el archivo JSON:', err);
            } else {
              console.log('Datos guardados correctamente en sercoamb.json');
            }
          });

})
.catch((error) => {
  console.log(error);
});
