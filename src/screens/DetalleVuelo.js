import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { API_URL } from '../config';

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
            const formData = new FormData();
            formData.append('action', 'detalle_vuelo');
            formData.append('id', id);

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success) {
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
            if (ms < 0) return "0H 0M";
            const totalMinutos = Math.floor(ms / 60000);
            return `${Math.floor(totalMinutos / 60)}H ${totalMinutos % 60}M`;
        };

        if (estado === "CANCELADO") {
            setProgreso(0);
            setTxtTranscurrido("SERVICIO CANCELADO");
            setTxtRestante("--");
            return;
        }

        if (ahora < tSalida || estado.includes("PROGRAMADO")) {
            setProgreso(0);
            setTxtTranscurrido("EN TIERRA / PRE-SALIDA");
            const diff = tSalida - ahora;
            if (diff > 0) setTxtRestante(`DESPEGUE EN: ${formatMsToHM(diff)}`);
            else setTxtRestante("RETRASO EN PLATAFORMA");
        } else if (ahora > tLlegada || ["ATERRIZÓ", "ATERRIZADO", "FINALIZADO"].includes(estado)) {
            setProgreso(100);
            setTxtTranscurrido("OPERACIÓN FINALIZADA");
            setTxtRestante("¡ARRIBO EXITOSO!");
        } else {
            const duracionTotal = tLlegada - tSalida;
            const tiempoPasado = ahora - tSalida;
            setProgreso((tiempoPasado / duracionTotal) * 100);
            setTxtTranscurrido(`TIEMPO EN VUELO: ${formatMsToHM(tiempoPasado)}`);
            setTxtRestante(`ARRIBO EN: ${formatMsToHM(tLlegada - ahora)}`);
        }
    };

    // Función para replicar los colores exactos de los estados de la Web
    const getEstadoStyles = (estado) => {
        const stateStr = String(estado).toUpperCase();
        if (stateStr === 'CANCELADO') return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
        if (stateStr.includes('RETRASADO')) return { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa' };
        if (stateStr.includes('ATERRIZADO') || stateStr.includes('ATERRIZÓ') || stateStr.includes('FINALIZADO')) return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
        if (stateStr.includes('PROGRAMADO')) return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
        return { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' }; // Por defecto / ACTIVO
    };

    if (cargando) return <ActivityIndicator size="large" color="#2c3e50" style={{ flex: 1, backgroundColor: '#f8f9fc', justifyContent: 'center' }} />;
    if (!vuelo) return <Text style={{ textAlign: 'center', marginTop: 50, color: '#2c3e50', fontWeight: 'bold' }}>Sincronización Interrumpida. Vuelo no encontrado.</Text>;

    const escalaIata = vuelo.escala_iata;
    const badgeStyles = getEstadoStyles(vuelo.estado_vuelo);

    return (
        <View style={styles.container}>
            {/* Top Bar Carbón */}
            <View style={styles.topBar}>
                <View>
                    <Text style={styles.topBarTitle}>Radar Operativo GUA</Text>
                    <Text style={styles.topBarSub}>Monitoreo de Vuelo</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Radar</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                <View style={styles.card}>
                    
                    {/* Header de la Tarjeta */}
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Operador Responsable</Text>
                            <Text style={styles.airlineHead}>{vuelo.aerolinea || 'N/A'}</Text>
                            <Text style={styles.flightCode}>{vuelo.codigo_vuelo || 'N/A'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.label, { marginBottom: 5 }]}>Estado del Servicio</Text>
                            <View style={[styles.badge, { backgroundColor: badgeStyles.bg, borderColor: badgeStyles.border }]}>
                                <Text style={[styles.badgeText, { color: badgeStyles.text }]}>{String(vuelo.estado_vuelo || 'DESCONOCIDO').toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>

                    {/* CAJA DE RUTA Y PROGRESO */}
                    <View style={styles.routeBox}>
                        <View style={styles.routeRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.iata}>{vuelo.origen_iata || '---'}</Text>
                                <Text style={styles.city}>{vuelo.origen_ciudad || 'Origen'}</Text>
                            </View>
                            
                            <View style={styles.timeBadgeContainer}>
                                <View style={styles.timeBadge}>
                                    <Text style={styles.timeBadgeText}>ESTIMADO</Text>
                                </View>
                            </View>

                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                <Text style={styles.iata}>{vuelo.destino_iata || '---'}</Text>
                                <Text style={styles.city}>{vuelo.destino_ciudad || 'Destino'}</Text>
                            </View>
                        </View>

                        {/* ESCALA (Si existe) */}
                        {escalaIata && (
                            <View style={{ alignItems: 'center', marginVertical: 10 }}>
                                <View style={styles.escalaPill}>
                                    <Text style={styles.escalaLabel}>Escala:</Text>
                                    <Text style={styles.escalaIataText}>{escalaIata}</Text>
                                    <Text style={styles.escalaCityText}> {vuelo.escala_ciudad}</Text>
                                </View>
                            </View>
                        )}

                        {/* Barra de progreso */}
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { width: `${progreso}%` }]} />
                            <Text style={[styles.planeIcon, { left: `${progreso}%`, transform: [{ translateX: -12 }] }]}>✈️</Text>
                        </View>

                        <View style={styles.timeRow}>
                            <Text style={styles.timeTextSuccess}>{txtTranscurrido}</Text>
                            <Text style={styles.timeTextDanger}>{txtRestante}</Text>
                        </View>
                    </View>

                    {/* SECCIÓN: ITINERARIO */}
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionAccent} />
                        <Text style={styles.sectionTitle}>Cronograma de Itinerario</Text>
                    </View>
                    
                    <View style={styles.dataRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Salida Programada</Text>
                            <Text style={styles.dataValue}>{new Date(vuelo.fecha_salida).toLocaleString()}</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={styles.label}>Arribo Estimado</Text>
                            <Text style={[styles.dataValue, { color: '#0d47a1' }]}>{new Date(vuelo.fecha_llegada).toLocaleString()}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* SECCIÓN: ESPECIFICACIONES TÉCNICAS */}
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionAccent} />
                        <Text style={styles.sectionTitle}>Especificaciones Técnicas</Text>
                    </View>

                    <Text style={styles.label}>Empresa Transportista</Text>
                    <Text style={styles.dataValue}>{vuelo.aerolinea || 'N/A'}</Text>

                    <Text style={styles.label}>Equipo Asignado / Modelo</Text>
                    <Text style={styles.dataValue}>{vuelo.aeronave_modelo || 'N/A'}</Text>

                    <Text style={styles.label}>Configuración de Pasajeros</Text>
                    <Text style={[styles.dataValue, { marginBottom: 5 }]}><Text style={{ fontSize: 18 }}>{vuelo.aeronave_capacidad || 0}</Text> Plazas Disponibles</Text>

                    <View style={styles.footerNoteBox}>
                        <Text style={styles.footerNoteText}>Información actualizada por el Centro de Control de Operaciones Aéreas (CCO) La Aurora GUA.</Text>
                    </View>

                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fc' },
    
    // Top Bar Carbón
    topBar: { backgroundColor: '#2c3e50', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, elevation: 4 },
    topBarTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    topBarSub: { color: '#bdc3c7', fontSize: 12 },
    btnVolver: { borderColor: '#bdc3c7', borderWidth: 1, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
    btnVolverText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    
    // Tarjeta Principal
    card: { backgroundColor: 'white', borderRadius: 20, padding: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 3, borderWidth: 1, borderColor: '#edf2f9' },
    
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    label: { fontSize: 10, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 },
    airlineHead: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
    flightCode: { fontSize: 36, fontWeight: '900', color: '#0f172a', letterSpacing: -1, lineHeight: 40 },
    
    // Badges dinámicos
    badge: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 30, borderWidth: 1 },
    badgeText: { fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },

    // Caja de Ruta
    routeBox: { backgroundColor: '#f8fafc', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 30 },
    routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    iata: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
    city: { fontSize: 12, color: '#64748b', fontWeight: 'bold' },
    
    timeBadgeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    timeBadge: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 15 },
    timeBadgeText: { color: 'white', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

    // Escala Pill
    escalaPill: { backgroundColor: '#fffbeb', borderColor: '#fef3c7', borderWidth: 1, borderRadius: 30, paddingHorizontal: 15, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' },
    escalaLabel: { fontSize: 11, color: '#b45309', fontWeight: 'bold', marginRight: 5 },
    escalaIataText: { fontSize: 13, color: '#b45309', fontWeight: '900' },
    escalaCityText: { fontSize: 11, color: '#92400e' },

    // Progreso
    progressContainer: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 5, marginVertical: 25, position: 'relative' },
    progressBar: { height: '100%', backgroundColor: '#0d47a1', borderRadius: 5 }, // RN no maneja gradients nativos fácil, usamos el Azul Institucional
    planeIcon: { position: 'absolute', top: -11, fontSize: 22 },
    
    timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
    timeTextSuccess: { fontSize: 11, fontWeight: 'bold', color: '#16a085', letterSpacing: 0.5 },
    timeTextDanger: { fontSize: 11, fontWeight: 'bold', color: '#e74c3c', letterSpacing: 0.5 },

    // Secciones
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    sectionAccent: { width: 4, height: 16, backgroundColor: '#0d47a1', borderRadius: 2, marginRight: 8 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#0d47a1', textTransform: 'uppercase', letterSpacing: 1.5 },
    
    dataRow: { flexDirection: 'row', justifyContent: 'space-between' },
    dataValue: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 15 },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 20 },

    // Footer
    footerNoteBox: { marginTop: 20, backgroundColor: '#f8f9fc', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#edf2f9' },
    footerNoteText: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }
});

export default DetalleVuelo;