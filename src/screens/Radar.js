import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { WebView } from 'react-native-webview'; 
import axios from 'axios';
import { API_URL } from '../config';

const Radar = ({ navigation }) => {
    const [vuelosCrudos, setVuelosCrudos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [mapaListo, setMapaListo] = useState(false); // 🔥 ESTADO CLAVE: Saber si el HTML ya cargó
    const webviewRef = useRef(null);

    // 1. Cargar datos de Oracle
    useEffect(() => {
        cargarVuelosRadar();
    }, []);

    const cargarVuelosRadar = async () => {
        try {
            const formData = new FormData();
            formData.append('action', 'mapa_coordenadas_radar'); 

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success) {
                setVuelosCrudos(response.data.vuelos_radar);
            }
        } catch (error) {
            console.log("Error cargando radar:", error);
        } finally {
            setCargando(false);
        }
    };

    // 2. Inyectar datos SOLO cuando el mapa esté listo y tengamos vuelos
    useEffect(() => {
        if (mapaListo && vuelosCrudos.length > 0 && webviewRef.current) {
            const iniciarMotorJS = `
                if (typeof window.iniciarRadar === 'function') {
                    window.iniciarRadar(${JSON.stringify(vuelosCrudos)});
                }
                true; 
            `;
            webviewRef.current.injectJavaScript(iniciarMotorJS);
        }
    }, [vuelosCrudos, mapaListo]);

    // 🔥 CÓDIGO HTML BLINDADO CONTRA ERRORES DE ORACLE
    const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { padding: 0; margin: 0; background-color: #0f172a; font-family: sans-serif;}
            html, body, #map { height: 100%; width: 100%; }
            .leaflet-popup-content-wrapper { background: rgba(15, 23, 42, 0.95); color: #38bdf8; border: 1px solid #38bdf8; border-radius: 8px; }
            .btn-radar { background: #38bdf8; color: #0f172a; border: none; padding: 10px; border-radius: 6px; font-weight: 900; width: 100%; margin-top: 10px; font-size: 11px; cursor: pointer; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            // Quitamos límites estrictos para evitar que el mapa colapse
            var map = L.map('map', { zoomControl: false, minZoom: 3 }).setView([15.5, -90.25], 5);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '© CARTO' }).addTo(map);

            var marcadores = {};
            var lineas = {};
            var intervaloRadar;

            var avionIcon = L.divIcon({
                html: '<div style="font-size: 26px; color: #38bdf8; transform: rotate(-45deg); text-shadow: 0 0 10px rgba(56,189,248,0.8);">✈️</div>',
                className: 'dummy', iconSize: [26, 26], iconAnchor: [13, 13]
            });

            // Herramientas para buscar llaves dinámicamente sin importar si son mayúsculas
            function buscarNum(obj, llaves) {
                for (var key in obj) {
                    if (llaves.includes(key.toUpperCase())) {
                        var val = parseFloat(obj[key]);
                        return isNaN(val) ? null : val;
                    }
                }
                return null;
            }

            function buscarStr(obj, llaves) {
                for (var key in obj) {
                    if (llaves.includes(key.toUpperCase())) return obj[key];
                }
                return "";
            }

            function parsearFecha(fechaStr) {
                if (!fechaStr) return new Date().getTime();
                if (fechaStr.toString().indexOf('/Date(') !== -1) {
                    return parseInt(fechaStr.replace(/[^0-9]/g, ''));
                }
                return new Date(fechaStr).getTime();
            }

            window.iniciarRadar = function(vuelos) {
                if(intervaloRadar) clearInterval(intervaloRadar);

                vuelos.forEach(function(v) {
                    var idV = buscarNum(v, ['ID_VUELO', 'IDVUELO', 'ID']);
                    var codV = buscarStr(v, ['CODIGO_VUELO', 'CODIGOVUELO', 'VUELO']);
                    
                    var oLat = buscarNum(v, ['ORIG_LAT', 'ORIGLAT', 'LAT_ORIGEN', 'LATITUD_ORIGEN']);
                    var oLng = buscarNum(v, ['ORIG_LNG', 'ORIGLNG', 'LON_ORIGEN', 'LONGITUD_ORIGEN']);
                    var dLat = buscarNum(v, ['DEST_LAT', 'DESTLAT', 'LAT_DESTINO', 'LATITUD_DESTINO']);
                    var dLng = buscarNum(v, ['DEST_LNG', 'DESTLNG', 'LON_DESTINO', 'LONGITUD_DESTINO']);
                    var eLat = buscarNum(v, ['ESCALA_LAT', 'ESCALALAT']);
                    var eLng = buscarNum(v, ['ESCALA_LNG', 'ESCALALNG']);

                    // Si no encontramos latitud de origen o destino, ignoramos este vuelo para no crashear el mapa
                    if (oLat === null || oLng === null || dLat === null || dLng === null) return;

                    var coords = [[oLat, oLng]];
                    if (eLat !== null && eLng !== null) coords.push([eLat, eLng]);
                    coords.push([dLat, dLng]);

                    lineas[idV] = L.polyline(coords, {
                        color: eLat !== null ? '#f59e0b' : '#38bdf8',
                        dashArray: eLat !== null ? '8, 8' : '4, 4',
                        weight: 1.5, opacity: 0.4
                    }).addTo(map);

                    marcadores[idV] = L.marker([oLat, oLng], { icon: avionIcon }).addTo(map);
                    
                    var popupHtml = "<div style='text-align:center;'><strong style='font-size:16px; color:#f8fafc;'>" + codV + "</strong><br>" +
                                    "<button class='btn-radar' onclick='window.ReactNativeWebView.postMessage(\\"" + idV + "\\")'>VER DETALLES</button></div>";
                    marcadores[idV].bindPopup(popupHtml);
                });

                intervaloRadar = setInterval(function() {
                    var ahora = new Date().getTime();
                    
                    vuelos.forEach(function(v) {
                        var idV = buscarNum(v, ['ID_VUELO', 'IDVUELO', 'ID']);
                        if (!marcadores[idV]) return; 

                        var oLat = buscarNum(v, ['ORIG_LAT', 'ORIGLAT', 'LAT_ORIGEN']);
                        var oLng = buscarNum(v, ['ORIG_LNG', 'ORIGLNG', 'LON_ORIGEN']);
                        var dLat = buscarNum(v, ['DEST_LAT', 'DESTLAT', 'LAT_DESTINO']);
                        var dLng = buscarNum(v, ['DEST_LNG', 'DESTLNG', 'LON_DESTINO']);
                        var eLat = buscarNum(v, ['ESCALA_LAT', 'ESCALALAT']);
                        var eLng = buscarNum(v, ['ESCALA_LNG', 'ESCALALNG']);

                        var strSalida = buscarStr(v, ['FECHA_SALIDA', 'FECHASALIDA']);
                        var strLlegada = buscarStr(v, ['FECHA_LLEGADA', 'FECHALLEGADA']);
                        var idEstado = buscarNum(v, ['ID_ESTADO_VUELO', 'ESTADO_VUELO', 'IDESTADO']);

                        var tSalida = parsearFecha(strSalida);
                        var tLlegada = parsearFecha(strLlegada);
                        
                        var latActual, lngActual;

                        if (ahora < tSalida || idEstado === 1) { 
                            latActual = oLat; lngActual = oLng;
                        } else if (ahora > tLlegada) { 
                            latActual = dLat; lngActual = dLng;
                        } else { 
                            var porcentaje = (ahora - tSalida) / (tLlegada - tSalida);
                            if (eLat !== null && eLng !== null) {
                                if (porcentaje <= 0.5) {
                                    var p1 = porcentaje * 2;
                                    latActual = oLat + ((eLat - oLat) * p1);
                                    lngActual = oLng + ((eLng - oLng) * p1);
                                } else {
                                    var p2 = (porcentaje - 0.5) * 2;
                                    latActual = eLat + ((dLat - eLat) * p2);
                                    lngActual = eLng + ((dLng - eLng) * p2);
                                }
                            } else {
                                latActual = oLat + ((dLat - oLat) * porcentaje);
                                lngActual = oLng + ((dLng - oLng) * porcentaje);
                            }
                        }
                        
                        if (latActual !== null && lngActual !== null) {
                            marcadores[idV].setLatLng([latActual, lngActual]);
                        }
                    });
                }, 1000);
            };
        </script>
    </body>
    </html>
    `;

    const manejarMensajeWebView = (event) => {
        const idVueloTocado = event.nativeEvent.data;
        if (idVueloTocado) {
            // Aseguramos que sea un número para que tu backend no reclame
            navigation.navigate('DetalleVuelo', { id: parseInt(idVueloTocado, 10) });
        }
    };

    if (cargando) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text style={{ color: '#94a3b8', marginTop: 15, fontWeight: 'bold' }}>Conectando con Satélite...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <View style={styles.topBarLeft}>
                    <Image source={require('../../assets/icon.png')} style={styles.brandIconMini} />
                    <Text style={styles.topBarTitle}>Radar de Tráfico en Vivo</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Dashboard</Text>
                </TouchableOpacity>
            </View>

            <WebView
                ref={webviewRef}
                style={styles.map}
                originWhitelist={['*']}
                source={{ html: leafletHTML }}
                onMessage={manejarMensajeWebView}
                javaScriptEnabled={true}
                mixedContentMode="always"
                onLoadEnd={() => setMapaListo(true)} // 🔥 Aquí el mapa nos grita: "¡ESTOY LISTO, MANDÁ LOS AVIONES!"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    topBar: { backgroundColor: '#1e293b', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
    topBarLeft: { flexDirection: 'row', alignItems: 'center' },
    brandIconMini: { width: 28, height: 28, borderRadius: 5, marginRight: 10, backgroundColor: 'white' },
    topBarTitle: { color: 'white', fontSize: 13, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
    btnVolver: { borderColor: '#334155', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#0f172a' },
    btnVolverText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase' },
    map: { flex: 1, backgroundColor: '#0f172a' }
});

export default Radar;