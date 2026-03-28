import axios from 'axios';
export const API_URL = 'https://tinley-sultanic-brendon.ngrok-free.dev/ApiMovil.ashx';
axios.defaults.headers.common['Bypass-Tunnel-Reminder'] = 'true';