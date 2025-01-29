import axios, { AxiosRequestConfig } from 'axios';

interface LoginData {
  username: string;
  password: string;
  client_name: string;
}

interface LoginResponse {
  token: string;
  [key: string]: any; // for other possible response fields
}

export async function obtenerToken(): Promise<string> {
  const data: LoginData = {
    username: "apisqm@weboard.cl",
    password: "24bb7b76ce34d36a2aa88670cbfdbf88",
    client_name: "esinfa"
  };

  const config: AxiosRequestConfig = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://airsqm.weboard.cl/login',
    headers: { 
      'Content-Type': 'application/json'
    },
    data
  };

  try {
    const response = await axios.request<LoginResponse>(config);
    const token = response.data.token;
    return token;
  } catch (error) {
    console.log('Error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}