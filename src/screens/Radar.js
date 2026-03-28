import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import axios from 'axios';
import { API_URL } from '../config'


const Radar = ({ navigation }) => {
    const [vuelosCrudos, setVuelosCrudos] = useState([]);
    const [avionesPosiciones, setAvionesPosiciones] = useState([]);
    const [cargando, setCargando] = useState(true);

    // 1. Cargar los datos desde Oracle al abrir la pantalla
    useEffect(() => {
        cargarVuelosRadar();
    }, []);

 const cargarVuelosRadar = async () => {
        try {
            // 🔥 CAMBIO: Apuntamos al puente con la acción 'radar_vivo'
            const response = await axios.post(API_URL, { 
                accion: 'radar_mapa' 
            });
            
            if (response.data.success) {
                // Adaptamos las claves de Oracle (que vienen en mayúsculas) a minúsculas
                const vuelosMap = response.data.vuelos.map(v => ({
                    id_vuelo: v.ID_VUELO || v.id_vuelo,
                    codigo_vuelo: v.CODIGO_VUELO || v.codigo_vuelo,
                    origen_iata: v.ORIGEN_IATA || v.origen_iata,
                    destino_iata: v.DESTINO_IATA || v.destino_iata,
                    orig_lat: v.ORIG_LAT || v.orig_lat, 
                    orig_lng: v.ORIG_LNG || v.orig_lng,
                    dest_lat: v.DEST_LAT || v.dest_lat, 
                    dest_lng: v.DEST_LNG || v.dest_lng,
                    escala_iata: v.ESCALA_IATA || v.escala_iata || null,
                    escala_lat: v.ESCALA_LAT || v.escala_lat || null,
                    escala_lng: v.ESCALA_LNG || v.escala_lng || null,
                    fecha_salida: v.FECHA_SALIDA || v.fecha_salida,
                    fecha_llegada: v.FECHA_LLEGADA || v.fecha_llegada,
                    id_estado_vuelo: v.ID_ESTADO_VUELO || v.id_estado_vuelo
                }));
                setVuelosCrudos(vuelosMap);
            }
        } catch (error) {
            console.log("Error cargando radar:", error);
        } finally {
            setCargando(false);
        }
    };

    // 2. Motor de Movimiento (Se ejecuta cada segundo para mover los aviones)
    useEffect(() => {
        if (vuelosCrudos.length === 0) return;

        const interval = setInterval(() => {
            const ahora = new Date().getTime();
            const nuevasPosiciones = vuelosCrudos.map(v => {
                const tSalida = new Date(v.fecha_salida).getTime();
                const tLlegada = new Date(v.fecha_llegada).getTime();
                let latActual, lngActual;

                // Lógica de Movimiento idéntica a tu VB
                if (ahora < tSalida || v.id_estado_vuelo === 1) { // Programado
                    latActual = v.orig_lat; lngActual = v.orig_lng;
                } else if (ahora > tLlegada) { // Ya llegó
                    latActual = v.dest_lat; lngActual = v.dest_lng;
                } else { // En el aire
                    const duracionTotal = tLlegada - tSalida;
                    const tiempoTranscurrido = ahora - tSalida;
                    const porcentaje = tiempoTranscurrido / duracionTotal;

                    if (v.escala_lat !== null) {
                        if (porcentaje <= 0.5) {
                            const pctTramo1 = porcentaje * 2;
                            latActual = v.orig_lat + ((v.escala_lat - v.orig_lat) * pctTramo1);
                            lngActual = v.orig_lng + ((v.escala_lng - v.orig_lng) * pctTramo1);
                        } else {
                            const pctTramo2 = (porcentaje - 0.5) * 2;
                            latActual = v.escala_lat + ((v.dest_lat - v.escala_lat) * pctTramo2);
                            lngActual = v.escala_lng + ((v.dest_lng - v.escala_lng) * pctTramo2);
                        }
                    } else {
                        latActual = v.orig_lat + ((v.dest_lat - v.orig_lat) * porcentaje);
                        lngActual = v.orig_lng + ((v.dest_lng - v.orig_lng) * porcentaje);
                    }
                }

                return { ...v, latActual, lngActual };
            });

            setAvionesPosiciones(nuevasPosiciones);
        }, 1000); // Se actualiza cada 1000 milisegundos (1 segundo)

        return () => clearInterval(interval);
    }, [vuelosCrudos]);

    if (cargando) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }]}>
                <ActivityIndicator size="large" color="#4fc3f7" />
                <Text style={{ color: 'white', marginTop: 10 }}>Conectando al satélite...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>📡 Radar de Vuelos (Live)</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Volver</Text>
                </TouchableOpacity>
            </View>

           <MapView
                style={styles.map}
                userInterfaceStyle="dark"
                maxZoomLevel={15} // No permite acercarse demasiado (opcional)
                minZoomLevel={3}  // EVITA QUE EL MAPA SE VEA REPETIDO (Zoom fuera máximo)
                moveOnMarkerPress={false} 
                initialRegion={{
                    latitude: 15.5,
                    longitude: -90.25,
                    latitudeDelta: 20, // Nivel de Zoom inicial
                    longitudeDelta: 20,
                }}
            >
                {avionesPosiciones.map((avion, index) => {
                    const textoRuta = avion.escala_iata 
                        ? `${avion.origen_iata} ➔ ${avion.escala_iata} ➔ ${avion.destino_iata}` 
                        : `${avion.origen_iata} ➔ ${avion.destino_iata}`;

                    return (
                        <React.Fragment key={index}>
                            {/* Línea de la ruta */}
                            <Polyline
                                coordinates={[
                                    { latitude: avion.orig_lat, longitude: avion.orig_lng },
                                    ...(avion.escala_lat ? [{ latitude: avion.escala_lat, longitude: avion.escala_lng }] : []),
                                    { latitude: avion.dest_lat, longitude: avion.dest_lng }
                                ]}
                                strokeColor={avion.escala_lat ? '#ffb300' : '#1e88e5'}
                                strokeWidth={2}
                                lineDashPattern={[5, 5]}
                            />

                            {/* El Avioncito */}
      <Marker
    key={index}
    coordinate={{ latitude: avion.latActual, longitude: avion.lngActual }}
    title={`${avion.codigo_vuelo}`}
    description={textoRuta}
    // 🔥 Usamos avion.id_vuelo que ya mapeamos arriba
    onPress={() => navigation.navigate('DetalleVuelo', { id: avion.id_vuelo })} 
>
    <Text style={{ fontSize: 24 }}>✈️</Text>
</Marker>             </React.Fragment>
                    );
                })}
            </MapView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    topBar: { backgroundColor: '#0d47a1', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
    topBarTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    btnVolver: { borderColor: 'white', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    btnVolverText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    map: { flex: 1, width: '100%' }
});

export default Radar;