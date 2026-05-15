import axios from 'axios';
export const API_URL = 'http://10.0.50.10/AereopuertoFrontEndVB/services/ApiMovil.ashx';
axios.defaults.timeout = 10000; // Es bueno agregar un timeout de 10 seg
axios.defaults.headers.post['Content-Type'] = 'multipart/form-data';
// config.js
const CIUDAD_AEROPUERTO = "Guatemala City";
const WEATHER_API_KEY = 'd8ad8d6ddfd4c3102ade73dbd154cab0';
export const API_URL_CLIMA = `https://api.openweathermap.org/data/2.5/weather?q=${CIUDAD_AEROPUERTO}&units=metric&appid=${WEATHER_API_KEY}&lang=es`;
