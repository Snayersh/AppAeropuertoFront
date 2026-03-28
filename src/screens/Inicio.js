import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import VueloCard from '../components/VueloCard';
import { API_URL } from '../config'

const Inicio = ({ navigation }) => {
    const [estadisticas, setEstadisticas] = useState({ activos: 0, llegadas: 0, salidas: 0 });
    const [vuelos, setVuelos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [usuario, setUsuario] = useState(null);

    // 🔥 TUS FILTROS (Mantenidos idénticos)
    const [filtrosTipo, setFiltrosTipo] = useState({ llegada: true, salida: true });
    const [filtrosEstado, setFiltrosEstado] = useState({
        programado: true,
        abordando_vuelo: true,
        aterrizado: true,
        retrasado: true,
        cancelado: true
    });

    useFocusEffect(
        useCallback(() => {
            verificarSesion();
            cargarDatos();
        }, [])
    );

    const verificarSesion = async () => {
        try {
            const nombre = await AsyncStorage.getItem('UserName');
            const rol = await AsyncStorage.getItem('UserRole');
            if (nombre) {
                setUsuario({ nombre, rol });
            } else {
                setUsuario(null);
            }
        } catch (error) {
            console.log("Error leyendo sesión", error);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            "Cerrar Sesión",
            "¿Estás seguro que deseas salir?",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Sí, salir", 
                    onPress: async () => {
                        await AsyncStorage.clear();
                        setUsuario(null);
                    } 
                }
            ]
        );
    };

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const resStats = await axios.post(API_URL, { accion: 'radar_estadisticas' });
            if (resStats.data.success) setEstadisticas(resStats.data.data);

            const resRadar = await axios.post(API_URL, { accion: 'radar_vivo' });    
            if (resRadar.data.success) {
                const vuelosFormateados = resRadar.data.vuelos.map(v => {
                    
                    let fechaRaw = v.fecha_salida || v.horaprogramada || v.hora_programada || '';
                    let horaMostrar = '--:--';
                    
                    if (fechaRaw) {
                        const d = new Date(fechaRaw);
                        if (!isNaN(d)) {
                            horaMostrar = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        }
                    }

                    return {
                        // 🔥 ÚNICO CAMBIO: Aseguramos que el ID se capture de cualquier variante de Oracle
                        id: v.id_vuelo || v.ID_VUELO || v.idvuelo || v.IDVUELO || v.id || 0, 
                        numero_vuelo: v.codigo_vuelo || v.CODIGO_VUELO || v.numerovuelo || 'N/A',
                        aerolinea: v.aerolinea || v.AEROLINEA || 'La Aurora',
                        tipo: (String(v.es_llegada || v.esllegada || v.ES_LLEGADA) === '1') ? 'Llegada' : 'Salida',
                        ruta: v.origendestino || v.ORIGENDESTINO || (v.origen_iata ? `${v.origen_iata} ➔ ${v.destino_iata}` : 'Ruta'),
                        hora: horaMostrar, 
                        estado: String(v.estado_vuelo || v.ESTADO_VUELO || v.estado || v.ESTADO || '').toUpperCase().trim() 
                    };
                });
                setVuelos(vuelosFormateados);
            }
        } catch (error) {
            console.log("Error cargando datos:", error);
        } finally {
            setCargando(false);
        }
    };

    const vuelosFiltrados = vuelos.filter(v => {
        const isLlegada = v.tipo === 'Llegada';
        const isSalida = v.tipo === 'Salida';
        const cumpleTipo = (isLlegada && filtrosTipo.llegada) || (isSalida && filtrosTipo.salida);

        let cumpleEstado = false;
        const est = String(v.estado || '').toUpperCase().trim();

        if (est.includes("PROGRAMADO") && filtrosEstado.programado) cumpleEstado = true;
        if ((est.includes("ABORDANDO") || est.includes("EN VUELO")) && filtrosEstado.abordando_vuelo) cumpleEstado = true;
        if ((est.includes("ATERRIZA") || est.includes("ATERRIZÓ") || est.includes("FINALIZADO")) && filtrosEstado.aterrizado) cumpleEstado = true;
        if (est.includes("RETRASADO") && filtrosEstado.retrasado) cumpleEstado = true;
        if (est.includes("CANCELADO") && filtrosEstado.cancelado) cumpleEstado = true;

        if (!est.includes("PROGRAMADO") && !est.includes("ABORDANDO") && !est.includes("EN VUELO") && 
            !est.includes("ATERRIZA") && !est.includes("FINALIZADO") && !est.includes("RETRASADO") && !est.includes("CANCELADO")) {
            cumpleEstado = true; 
        }

        return cumpleTipo && cumpleEstado;
    });

    const toggleTipo = (tipo) => setFiltrosTipo(prev => ({ ...prev, [tipo]: !prev[tipo] }));
    const toggleEstado = (estado) => setFiltrosEstado(prev => ({ ...prev, [estado]: !prev[estado] }));

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Centro de Control GUA</Text>
                    <Text style={styles.subtitle}>
                        {usuario ? `Hola, ${usuario.nombre}` : 'Bienvenido, Invitado'}
                    </Text>
                </View>

                {usuario ? (
                    <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
                        <Text style={styles.btnLogoutText}>Cerrar Sesión</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.btnLogin} onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.btnLoginText}>Iniciar Sesión</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.generalMenuContainer}>
                    <TouchableOpacity style={styles.btnRadarGiga} onPress={() => navigation.navigate('Radar')}>
                        <Text style={styles.radarIcon}>🌍</Text>
                        <Text style={styles.radarText}>Abrir Radar en Vivo</Text>
                    </TouchableOpacity>
                </View>

                {usuario && (
                    <View style={styles.menuClienteContainer}>
                        <Text style={styles.sectionTitle}>Mi Cuenta</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.menuScroll}>
                            <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('MiPerfil')}>
                                <Text style={styles.menuIcon}>👤</Text>
                                <Text style={styles.menuText}>Mi Perfil</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.menuBtn, { borderColor: '#f39c12' }]} onPress={() => navigation.navigate('Reservas')}>
                                <Text style={styles.menuIcon}>🛒</Text>
                                <Text style={[styles.menuText, { color: '#f39c12' }]}>Reservar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('MisBoletos')}>
                                <Text style={styles.menuIcon}>🎫</Text>
                                <Text style={styles.menuText}>Mis Boletos</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.menuBtn, { borderColor: '#27ae60' }]} onPress={() => navigation.navigate('Pagos')}>
                                <Text style={styles.menuIcon}>💳</Text>
                                <Text style={[styles.menuText, { color: '#27ae60' }]}>Pagar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Equipaje')}>
                                <Text style={styles.menuIcon}>🧳</Text>
                                <Text style={styles.menuText}>Equipaje</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('MisFacturas')}>
                                <Text style={styles.menuIcon}>🧾</Text>
                                <Text style={styles.menuText}>Facturas</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                )}

                <View style={[styles.statsContainer, { marginTop: 15 }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={[styles.statCard, { backgroundColor: '#2c3e50' }]}>
                            <Text style={styles.statLabel}>VUELOS ACTIVOS</Text>
                            <Text style={styles.statValue}>{estadisticas.activos} 📡</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#27ae60' }]}>
                            <Text style={styles.statLabel}>LLEGADAS HOY</Text>
                            <Text style={styles.statValue}>{estadisticas.llegadas} 🛬</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#f1c40f' }]}>
                            <Text style={[styles.statLabel, { color: '#333' }]}>SALIDAS HOY</Text>
                            <Text style={[styles.statValue, { color: '#000' }]}>{estadisticas.salidas} 🛫</Text>
                        </View>
                    </ScrollView>
                </View>

                <View style={styles.filtrosAvanzadosContainer}>
                    <Text style={styles.filtroLabel}>Filtros de Tablero:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                        <TouchableOpacity style={[styles.chipBase, filtrosTipo.llegada ? styles.chipLlegadaOn : styles.chipOff]} onPress={() => toggleTipo('llegada')}>
                            <Text style={[styles.chipText, filtrosTipo.llegada ? styles.chipTextOn : styles.chipTextOff]}>🛬 Llegadas</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.chipBase, filtrosTipo.salida ? styles.chipSalidaOn : styles.chipOff]} onPress={() => toggleTipo('salida')}>
                            <Text style={[styles.chipText, filtrosTipo.salida ? styles.chipTextDarkOn : styles.chipTextOff]}>🛫 Salidas</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity style={[styles.chipBase, filtrosEstado.programado ? styles.chipEstadoOn : styles.chipOff]} onPress={() => toggleEstado('programado')}>
                            <Text style={[styles.chipText, filtrosEstado.programado ? styles.chipTextOn : styles.chipTextOff]}>Programado</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.chipBase, filtrosEstado.abordando_vuelo ? styles.chipEstadoOn : styles.chipOff]} onPress={() => toggleEstado('abordando_vuelo')}>
                            <Text style={[styles.chipText, filtrosEstado.abordando_vuelo ? styles.chipTextOn : styles.chipTextOff]}>En Vuelo/Abordando</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.chipBase, filtrosEstado.aterrizado ? styles.chipEstadoOn : styles.chipOff]} onPress={() => toggleEstado('aterrizado')}>
                            <Text style={[styles.chipText, filtrosEstado.aterrizado ? styles.chipTextOn : styles.chipTextOff]}>Aterrizado</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.chipBase, filtrosEstado.retrasado ? styles.chipRetrasoOn : styles.chipOff]} onPress={() => toggleEstado('retrasado')}>
                            <Text style={[styles.chipText, filtrosEstado.retrasado ? styles.chipTextDarkOn : styles.chipTextOff]}>Retrasado</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.chipBase, filtrosEstado.cancelado ? styles.chipCancelaOn : styles.chipOff]} onPress={() => toggleEstado('cancelado')}>
                            <Text style={[styles.chipText, filtrosEstado.cancelado ? styles.chipTextOn : styles.chipTextOff]}>Cancelado</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                <View style={styles.listContainer}>
                    <View style={styles.listHeader}>
                        <View style={styles.liveIndicator} />
                        <Text style={styles.listTitle}>Monitoreo en Tiempo Real</Text>
                    </View>
                    {cargando ? (
                        <ActivityIndicator size="large" color="#0d47a1" style={{ marginTop: 50 }} />
                    ) : (
                        <FlatList
                            data={vuelosFiltrados}
                            keyExtractor={(item) => item.id.toString()}
                            scrollEnabled={false}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    activeOpacity={0.8} 
                                    onPress={() => navigation.navigate('DetalleVuelo', { id: item.id })}
                                >
                                    <VueloCard vuelo={item} />
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: '#666' }}>No hay vuelos que coincidan.</Text>}
                        />
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f7f6' },
    header: { backgroundColor: '#0d47a1', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, zIndex: 10 },
    title: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 5 },
    btnLogin: { backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    btnLoginText: { color: '#0d47a1', fontWeight: 'bold' },
    btnLogout: { backgroundColor: '#e74c3c', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#c0392b' },
    btnLogoutText: { color: 'white', fontWeight: 'bold' },
    generalMenuContainer: { padding: 15, marginTop: -15, zIndex: 9 },
    btnRadarGiga: { backgroundColor: '#1e272e', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
    radarIcon: { fontSize: 24, marginRight: 10 },
    radarText: { color: '#4bcffa', fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
    menuClienteContainer: { paddingBottom: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#666', marginLeft: 15, marginBottom: 10, marginTop: 10, textTransform: 'uppercase' },
    menuScroll: { paddingLeft: 15 },
    menuBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 15, marginRight: 10, minWidth: 90, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    menuIcon: { fontSize: 24, marginBottom: 5 },
    menuText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
    statsContainer: { paddingLeft: 15, zIndex: 10, marginBottom: 15 },
    statCard: { width: 160, height: 90, padding: 15, borderRadius: 15, marginRight: 15, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
    statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold', marginBottom: 5, letterSpacing: 1 },
    statValue: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    filtrosAvanzadosContainer: { paddingHorizontal: 15, marginBottom: 20, backgroundColor: '#fff', paddingVertical: 15, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee' },
    filtroLabel: { fontSize: 12, fontWeight: 'bold', color: '#888', marginBottom: 10, textTransform: 'uppercase' },
    chipBase: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 10 },
    chipOff: { backgroundColor: '#f8f9fa', borderColor: '#ddd' },
    chipLlegadaOn: { backgroundColor: '#0d47a1', borderColor: '#0d47a1' },
    chipSalidaOn: { backgroundColor: '#f39c12', borderColor: '#f39c12' },
    chipEstadoOn: { backgroundColor: '#1565c0', borderColor: '#1565c0' },
    chipRetrasoOn: { backgroundColor: '#f1c40f', borderColor: '#f1c40f' },
    chipCancelaOn: { backgroundColor: '#e74c3c', borderColor: '#e74c3c' },
    chipText: { fontSize: 12, fontWeight: 'bold' },
    chipTextOff: { color: '#666' },
    chipTextOn: { color: '#fff' },
    chipTextDarkOn: { color: '#333' },
    listContainer: { paddingHorizontal: 15, paddingBottom: 30 },
    listHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    liveIndicator: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#e74c3c', marginRight: 10 },
    listTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' }
});

export default Inicio;