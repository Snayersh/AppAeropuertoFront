import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { WebView } from 'react-native-webview'; 
import axios from 'axios';
import { API_URL } from '../config';

const Radar = ({ navigation }) => {
    const [vuelosCrudos, setVuelosCrudos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const webviewRef = useRef(null);

    // 1. Cargar los datos desde el Backend al abrir la pantalla
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

    // 2. Motor de Movimiento (Se inyecta al WebView)
    useEffect(() => {
        if (vuelosCrudos.length === 0 || !webviewRef.current) return;

        const iniciarMotorJS = `
            if (typeof window.iniciarRadar === 'function') {
                window.iniciarRadar(${JSON.stringify(vuelosCrudos)});
            }
            true; 
        `;
        webviewRef.current.injectJavaScript(iniciarMotorJS);
    }, [vuelosCrudos]);

    // 🔥 EL CÓDIGO HTML/JS DEL MAPA LEAFLET ESTILIZADO (Torre de Control)
    const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { padding: 0; margin: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            html, body, #map { height: 100%; width: 100%; }
            
            /* Estilos del Popup tipo Radar para Móvil */
            .leaflet-popup-content-wrapper { 
                background: rgba(15, 23, 42, 0.95); 
                color: #38bdf8; 
                border: 1px solid #38bdf8; 
                border-radius: 8px; 
                box-shadow: 0 4px 15px rgba(0,0,0,0.6); 
            }
            .leaflet-popup-tip { background: #38bdf8; }
            .leaflet-popup-content { margin: 12px; }
            .leaflet-container a.leaflet-popup-close-button { color: #38bdf8; }
            
            .btn-radar { 
                background: #38bdf8; 
                color: #0f172a; 
                border: none; 
                padding: 10px; 
                border-radius: 6px; 
                font-weight: 900; 
                width: 100%; 
                margin-top: 10px; 
                cursor: pointer; 
                text-transform: uppercase; 
                font-size: 11px;
                letter-spacing: 0.5px;
            }
            .clic-texto { color: #94a3b8; font-size: 9px; display: block; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;}
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            // Inicializar Mapa centrado en Guatemala con estilo Oscuro CARTO
            var limitesMundo = [[-90, -180], [90, 180]];
            var map = L.map('map', { 
                zoomControl: false,
                maxBounds: limitesMundo,
                maxBoundsViscosity: 1.0,
                minZoom: 3
            }).setView([15.5, -90.25], 5);
            
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '© CARTO',
                noWrap: true,
                bounds: limitesMundo
            }).addTo(map);

            var marcadores = {};
            var lineas = {};
            var intervaloRadar;

            // Icono Neón
            var avionIcon = L.divIcon({
                html: '<div style="font-size: 26px; color: #38bdf8; transform: rotate(-45deg); text-shadow: 0 0 10px rgba(56,189,248,0.8);">✈️</div>',
                className: 'dummy',
                iconSize: [26, 26],
                iconAnchor: [13, 13]
            });

            window.iniciarRadar = function(vuelos) {
                if(intervaloRadar) clearInterval(intervaloRadar);

                // Dibujar rutas iniciales
                vuelos.forEach(function(v) {
                    var coords = [[v.orig_lat, v.orig_lng]];
                    if (v.escala_lat) coords.push([v.escala_lat, v.escala_lng]);
                    coords.push([v.dest_lat, v.dest_lng]);

                    lineas[v.id_vuelo] = L.polyline(coords, {
                        color: v.escala_lat ? '#f59e0b' : '#38bdf8',
                        dashArray: v.escala_lat ? '8, 8' : '4, 4',
                        weight: 1.5,
                        opacity: 0.4
                    }).addTo(map);

                    marcadores[v.id_vuelo] = L.marker([v.orig_lat, v.orig_lng], { icon: avionIcon }).addTo(map);
                    
                    var textoRuta = v.escala_iata ? v.origen_iata + ' ➔ ' + v.escala_iata + ' ➔ ' + v.destino_iata : v.origen_iata + ' ➔ ' + v.destino_iata;
                    
                    // Popup interactivo
                    var popupHtml = "<div style='text-align:center;'><strong style='font-size:16px; letter-spacing:1px; color:#f8fafc;'>" + v.codigo_vuelo + "</strong><br><span style='color:#38bdf8; font-size:12px; font-weight:bold;'>" + textoRuta + "</span><br><span class='clic-texto'>SISTEMA DE MONITOREO</span><button class='btn-radar' onclick='window.ReactNativeWebView.postMessage(" + v.id_vuelo + ")'>VER DETALLES</button></div>";
                    
                    marcadores[v.id_vuelo].bindPopup(popupHtml);
                });

                // Motor de movimiento cinemático (Alta frecuencia 500ms)
                intervaloRadar = setInterval(function() {
                    var ahora = new Date().getTime();
                    
                    vuelos.forEach(function(v) {
                        var tSalida = new Date(v.fecha_salida).getTime();
                        var tLlegada = new Date(v.fecha_llegada).getTime();
                        var latActual, lngActual;

                        if (ahora < tSalida || v.id_estado_vuelo === 1) { 
                            latActual = v.orig_lat; lngActual = v.orig_lng;
                        } else if (ahora > tLlegada) { 
                            latActual = v.dest_lat; lngActual = v.dest_lng;
                        } else { 
                            var duracionTotal = tLlegada - tSalida;
                            var tiempoTranscurrido = ahora - tSalida;
                            var porcentaje = tiempoTranscurrido / duracionTotal;

                            if (v.escala_lat !== null) {
                                if (porcentaje <= 0.5) {
                                    var pctTramo1 = porcentaje * 2;
                                    latActual = v.orig_lat + ((v.escala_lat - v.orig_lat) * pctTramo1);
                                    lngActual = v.orig_lng + ((v.escala_lng - v.orig_lng) * pctTramo1);
                                } else {
                                    var pctTramo2 = (porcentaje - 0.5) * 2;
                                    latActual = v.escala_lat + ((v.dest_lat - v.escala_lat) * pctTramo2);
                                    lngActual = v.escala_lng + ((v.dest_lng - v.escala_lng) * pctTramo2);
                                }
                            } else {
                                latActual = v.orig_lat + ((v.dest_lat - v.orig_lat) * porcentaje);
                                lngActual = v.orig_lng + ((v.dest_lng - v.orig_lng) * porcentaje);
                            }
                        }
                        
                        marcadores[v.id_vuelo].setLatLng([latActual, lngActual]);
                    });
                }, 500); // <-- Suavidad de movimiento como en la web
            };
        </script>
    </body>
    </html>
    `;

    // 3. Recibir mensajes desde el WebView (Botón "Ver Detalles")
    const manejarMensajeWebView = (event) => {
        const idVueloTocado = event.nativeEvent.data;
        if (idVueloTocado) {
            navigation.navigate('DetalleVuelo', { id: idVueloTocado });
        }
    };

    if (cargando) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text style={{ color: '#94a3b8', marginTop: 15, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>Conectando con Satélite...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Top Bar Carbón Operativo */}
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
                scrollEnabled={false} 
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    
    // Top Bar (Estilo Torre de Control)
    topBar: { backgroundColor: '#1e293b', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, borderBottomWidth: 1, borderBottomColor: '#334155', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
    topBarLeft: { flexDirection: 'row', alignItems: 'center' },
    brandIconMini: { width: 28, height: 28, borderRadius: 5, marginRight: 10, backgroundColor: 'white' },
    topBarTitle: { color: 'white', fontSize: 13, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
    
    btnVolver: { borderColor: '#334155', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#0f172a' },
    btnVolverText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase' },
    
    map: { flex: 1, backgroundColor: '#0f172a' }
});

export default Radar;