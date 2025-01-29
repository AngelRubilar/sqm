export interface StationData {
    timestamp: Date;
    station_name: string;
    variable_name: string;
    valor: number;
  }
  
export interface ApiConfig {
    baseUrl: string;
    auth: {
      username?: string;
      password?: string;
      token?: string;
    };
  }