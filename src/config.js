import axios from 'axios';
export const API_URL = 'https://tinley-sultanic-brendon.ngrok-free.dev/services/ApiMovil.ashx';
axios.defaults.headers.common['Bypass-Tunnel-Reminder'] = 'true';

// config.js
const CIUDAD_AEROPUERTO = "Guatemala City";
const WEATHER_API_KEY = 'd8ad8d6ddfd4c3102ade73dbd154cab0';
export const API_URL_CLIMA = `https://api.openweathermap.org/data/2.5/weather?q=${CIUDAD_AEROPUERTO}&units=metric&appid=${WEATHER_API_KEY}&lang=es`;
