import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview'; // 🔥 LA MAGIA: WebView para Leaflet
import axios from 'axios';
import { API_URL } from '../config';

const Radar = ({ navigation }) => {
    const [vuelosCrudos, setVuelosCrudos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const webviewRef = useRef(null);

    // 1. Cargar los datos desde Oracle al abrir la pantalla
    useEffect(() => {
        cargarVuelosRadar();
    }, []);

    const cargarVuelosRadar = async () => {
        try {
            // 🔥 Ajuste: FormData y acción calibrada
            const formData = new FormData();
            formData.append('action', 'mapa_coordenadas_radar'); // La acción que creamos en ApiMovil.ashx

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success) {
                // Ya no necesitamos mapear mayúsculas, .NET lo hizo por nosotros
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

        // Inyectamos un script al WebView que inicializa el motor de movimiento DENTRO del HTML de Leaflet
        const iniciarMotorJS = `
            if (typeof window.iniciarRadar === 'function') {
                window.iniciarRadar(${JSON.stringify(vuelosCrudos)});
            }
            true; // Obligatorio para react-native-webview
        `;
        webviewRef.current.injectJavaScript(iniciarMotorJS);
    }, [vuelosCrudos]);

    // 🔥 EL CÓDIGO HTML/JS DEL MAPA LEAFLET (Idéntico a tu Web)
    const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { padding: 0; margin: 0; background-color: #121212; }
            html, body, #map { height: 100%; width: 100%; }
            /* Estilo oscuro para el mapa */
            .leaflet-layer, .leaflet-control-zoom-in, .leaflet-control-zoom-out, .leaflet-control-attribution { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
            .avion-icon { font-size: 24px; text-align: center; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            // Inicializar Mapa centrado en Guatemala
            var map = L.map('map', { zoomControl: false }).setView([15.5, -90.25], 5);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(map);

            var marcadores = {};
            var lineas = {};
            var intervaloRadar;

            // Función principal expuesta para que React Native la llame
            window.iniciarRadar = function(vuelos) {
                if(intervaloRadar) clearInterval(intervaloRadar);

                // Dibujar rutas iniciales
                vuelos.forEach(function(v) {
                    var coords = [[v.orig_lat, v.orig_lng]];
                    if (v.escala_lat) coords.push([v.escala_lat, v.escala_lng]);
                    coords.push([v.dest_lat, v.dest_lng]);

                    lineas[v.id_vuelo] = L.polyline(coords, {
                        color: v.escala_lat ? '#ffb300' : '#1e88e5',
                        dashArray: '5, 5',
                        weight: 2
                    }).addTo(map);

                    var icon = L.divIcon({ className: 'avion-icon', html: '✈️', iconSize: [24, 24], iconAnchor: [12, 12] });
                    marcadores[v.id_vuelo] = L.marker([v.orig_lat, v.orig_lng], { icon: icon }).addTo(map);
                    
                    var textoRuta = v.escala_iata ? v.origen_iata + ' ➔ ' + v.escala_iata + ' ➔ ' + v.destino_iata : v.origen_iata + ' ➔ ' + v.destino_iata;
                    
                    // Al tocar el avión, avisamos a React Native para que abra el Detalle
                    marcadores[v.id_vuelo].bindPopup("<b>" + v.codigo_vuelo + "</b><br>" + textoRuta + "<br><button onclick='window.ReactNativeWebView.postMessage(" + v.id_vuelo + ")' style='margin-top:5px; padding:5px; background:#0d47a1; color:white; border:none; border-radius:3px; cursor:pointer;'>Ver Detalles</button>");
                });

                // Motor de movimiento
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
                }, 1000);
            };
        </script>
    </body>
    </html>
    `;

    // 3. Recibir mensajes desde el WebView (Cuando tocan el botón "Ver Detalles")
    const manejarMensajeWebView = (event) => {
        const idVueloTocado = event.nativeEvent.data;
        if (idVueloTocado) {
            navigation.navigate('DetalleVuelo', { id: idVueloTocado });
        }
    };

    if (cargando) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#4fc3f7" />
                <Text style={{ color: 'white', marginTop: 10 }}>Conectando al satélite...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>📡 Radar Abierto (Leaflet)</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Volver</Text>
                </TouchableOpacity>
            </View>

            <WebView
                ref={webviewRef}
                style={styles.map}
                originWhitelist={['*']}
                source={{ html: leafletHTML }}
                onMessage={manejarMensajeWebView}
                javaScriptEnabled={true}
                scrollEnabled={false} // Evita que se haga scroll vertical en la pantalla
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    topBar: { backgroundColor: '#0d47a1', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
    topBarTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    btnVolver: { borderColor: 'white', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    btnVolverText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    map: { flex: 1, backgroundColor: '#121212' }
});

export default Radar;