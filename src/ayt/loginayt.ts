import axios, { AxiosRequestConfig } from 'axios';

export async function obtenerTokenayt(): Promise<string> {
  const data = JSON.stringify({
    usuario: "SQM",
    password: "kxU84fseJBLC6w7D"
  });

  const config: AxiosRequestConfig = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'http://104.41.40.103:8080/api/Auth/Login',
    headers: { 
      'Content-Type': 'application/json'
    },
    data: data
  };

  try {
    const response = await axios.request(config);
    const token = response.data.authenticationToken;
    return token;
  } catch (error) {
    console.error('Error al obtener el token:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}
