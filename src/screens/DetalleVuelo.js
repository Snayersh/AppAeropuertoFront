import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { API_URL } from '../config'

const DetalleVuelo = ({ route, navigation }) => {
    const { id } = route.params;
    const [vuelo, setVuelo] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [progreso, setProgreso] = useState(0);
    const [txtTranscurrido, setTxtTranscurrido] = useState('');
    const [txtRestante, setTxtRestante] = useState('');

    useEffect(() => {
        cargarVuelo();
    }, []);

    useEffect(() => {
        if (vuelo) {
            calcularProgreso();
            const interval = setInterval(calcularProgreso, 10000);
            return () => clearInterval(interval);
        }
    }, [vuelo]);

    const cargarVuelo = async () => {
        try {
            // 🔥 Ajuste 1 y 2: FormData y nombre correcto de la acción
            const formData = new FormData();
            formData.append('action', 'detalle_vuelo');
            formData.append('id', id);

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success) {
                // 🔥 Ajuste 3: Leemos "datos" porque así lo manda el DashboardService.vb
                setVuelo(response.data.datos);
            }
        } catch (error) {
            console.log("Error cargando vuelo:", error);
        } finally {
            setCargando(false);
        }
    };

    const calcularProgreso = () => {
        if (!vuelo) return;
        
        const tSalida = new Date(vuelo.fecha_salida).getTime();
        const tLlegada = new Date(vuelo.fecha_llegada).getTime();
        const ahora = new Date().getTime();
        const estado = String(vuelo.estado_vuelo || '').toUpperCase();

        const formatMsToHM = (ms) => {
            if (ms < 0) return "0h 0m";
            const totalMinutos = Math.floor(ms / 60000);
            return `${Math.floor(totalMinutos / 60)}h ${totalMinutos % 60}m`;
        };

        if (estado === "CANCELADO") {
            setProgreso(0);
            setTxtTranscurrido("Vuelo Cancelado");
            setTxtRestante("--");
            return;
        }

        if (ahora < tSalida || estado.includes("PROGRAMADO")) {
            setProgreso(0);
            setTxtTranscurrido("Aún no despega");
            const diff = tSalida - ahora;
            if (diff > 0) setTxtRestante(`Despega en: ${formatMsToHM(diff)}`);
            else setTxtRestante("Retrasado en tierra");
        } else if (ahora > tLlegada || ["ATERRIZÓ", "ATERRIZADO", "FINALIZADO"].includes(estado)) {
            setProgreso(100);
            setTxtTranscurrido("Vuelo Finalizado");
            setTxtRestante("¡Aterrizó con éxito!");
        } else {
            const duracionTotal = tLlegada - tSalida;
            const tiempoPasado = ahora - tSalida;
            setProgreso((tiempoPasado / duracionTotal) * 100);
            setTxtTranscurrido(`En aire: ${formatMsToHM(tiempoPasado)}`);
            setTxtRestante(`Aterriza en: ${formatMsToHM(tLlegada - ahora)}`);
        }
    };

    if (cargando) return <ActivityIndicator size="large" color="#0d47a1" style={{ flex: 1, backgroundColor: '#f4f7f6' }} />;
    if (!vuelo) return <Text style={{ textAlign: 'center', marginTop: 50 }}>Vuelo no encontrado.</Text>;

    const escalaIata = vuelo.escala_iata;

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>Detalles del Vuelo</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Volver</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <View style={styles.card}>
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={styles.label}>Operado por {vuelo.aerolinea || 'N/A'}</Text>
                            <Text style={styles.flightCode}>{vuelo.codigo_vuelo || 'N/A'}</Text>
                        </View>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{String(vuelo.estado_vuelo || 'DESCONOCIDO').toUpperCase()}</Text>
                        </View>
                    </View>

                    {/* RUTA Y PROGRESO */}
                    <View style={styles.routeBox}>
                        <View style={styles.routeRow}>
                            <View>
                                <Text style={styles.iata}>{vuelo.origen_iata || '---'}</Text>
                                <Text style={styles.city}>{vuelo.origen_ciudad || 'Origen'}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.iata}>{vuelo.destino_iata || '---'}</Text>
                                <Text style={styles.city}>{vuelo.destino_ciudad || 'Destino'}</Text>
                            </View>
                        </View>

                        {/* Barra de progreso */}
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { width: `${progreso}%` }]} />
                            <Text style={[styles.planeIcon, { left: `${progreso}%`, transform: [{ translateX: -15 }] }]}>✈️</Text>
                        </View>

                        <View style={styles.timeRow}>
                            <Text style={styles.timeText}>{txtTranscurrido}</Text>
                            <Text style={[styles.timeText, { color: '#e74c3c' }]}>{txtRestante}</Text>
                        </View>
                    </View>

                    {/* ESCALA */}
                    {escalaIata && (
                        <View style={styles.escalaBox}>
                            <Text style={{ fontWeight: 'bold', color: '#f57c00' }}>⚠️ Escala Técnica: {escalaIata}</Text>
                            <Text style={{ fontSize: 12, color: '#666' }}>{vuelo.escala_ciudad}</Text>
                        </View>
                    )}

                    {/* ITINERARIO */}
                    <Text style={styles.sectionTitle}>🕒 Itinerario</Text>
                    <View style={styles.itinerarioRow}>
                        <View>
                            <Text style={styles.label}>Salida</Text>
                            <Text style={styles.dateVal}>{new Date(vuelo.fecha_salida).toLocaleString()}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.label}>Llegada Estimada</Text>
                            <Text style={[styles.dateVal, { color: '#0d47a1' }]}>{new Date(vuelo.fecha_llegada).toLocaleString()}</Text>
                        </View>
                    </View>

                    {/* NAVE */}
                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>⚙️ Datos Operativos</Text>
                    <Text style={styles.label}>Aeronave: <Text style={{ color: '#333' }}>{vuelo.aeronave_modelo || 'N/A'}</Text></Text>
                    <Text style={styles.label}>Capacidad: <Text style={{ color: '#333' }}>{vuelo.aeronave_capacidad || 0} pasajeros</Text></Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f7f6' },
    topBar: { backgroundColor: '#0d47a1', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    topBarTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    btnVolver: { borderColor: 'white', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    btnVolverText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    
    card: { backgroundColor: 'white', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, borderTopWidth: 8, borderTopColor: '#0d47a1' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    label: { fontSize: 12, color: '#90a4ae', fontWeight: 'bold', textTransform: 'uppercase' },
    flightCode: { fontSize: 32, fontWeight: '900', color: '#0d47a1' },
    badge: { backgroundColor: '#e3f2fd', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    badgeText: { color: '#0d47a1', fontWeight: 'bold' },

    routeBox: { backgroundColor: '#f8f9fa', borderRadius: 15, padding: 20, borderWidth: 1, borderColor: '#cfd8dc', borderStyle: 'dashed', marginBottom: 20 },
    routeRow: { flexDirection: 'row', justifyContent: 'space-between' },
    iata: { fontSize: 30, fontWeight: '900', color: '#2c3e50' },
    city: { fontSize: 14, color: '#7f8c8d', fontWeight: 'bold' },
    
    progressContainer: { height: 10, backgroundColor: '#e9ecef', borderRadius: 5, marginVertical: 20, position: 'relative' },
    progressBar: { height: '100%', backgroundColor: '#4fc3f7', borderRadius: 5 },
    planeIcon: { position: 'absolute', top: -12, fontSize: 24 },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
    timeText: { fontSize: 12, fontWeight: 'bold', color: '#27ae60' },

    escalaBox: { backgroundColor: '#fff8e1', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#ffb300', borderStyle: 'dashed', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1976d2', textTransform: 'uppercase', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
    itinerarioRow: { flexDirection: 'row', justifyContent: 'space-between' },
    dateVal: { fontSize: 16, fontWeight: 'bold', color: '#333' }
});

export default DetalleVuelo;