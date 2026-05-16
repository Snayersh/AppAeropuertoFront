import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import VueloCard from '../components/VueloCard';
import { API_URL, API_URL_CLIMA } from '../config';

const Inicio = ({ navigation }) => {
    // 🔥 ESTADOS
    const [estadisticas, setEstadisticas] = useState({ activos: 0, llegadas: 0, salidas: 0 });
    const [vuelos, setVuelos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [usuario, setUsuario] = useState(null);
    const [clima, setClima] = useState({ temp: '--', condicion: 'Cargando...', icono: '02d' }); // 🌤️ Clima

    // 🔥 FILTROS
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
            cargarClima();
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
            const formData = new FormData();
            formData.append('action', 'radar_vuelos');

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success) {
                setEstadisticas(response.data.estadisticas);

             // 🔥 MAPEO CORREGIDO PARA INICIO
// 🔥 MAPEO CORREGIDO CON ÍNDICES (Igual que en la Web)
const vuelosFormateados = response.data.radar_vuelos.map(v => {
    // Agarramos los valores por su posición (0=ID, 1=Vuelo, 2=Aerolinea, etc.)
    const valores = Object.values(v);

    const idVuelo = valores[0] || 0;
    const numVuelo = valores[1] || 'N/A';
    const aerolinea = valores[2] || 'La Aurora';
    const tipoLlegada = valores[3]; // Puede ser 1/0, true/false, o "Llegada"/"Salida"
    const ruta = valores[4] || 'Ruta Desconocida';
    const fechaRaw = valores[5] || '';
    const estado = valores[6] || '';

    // Formatear la hora
    let horaMostrar = '--:--';
    if (fechaRaw) {
        let d = new Date(fechaRaw);
        // Validar si viene en formato /Date(123456789)/ de C#
        if (fechaRaw.toString().includes('/Date(')) {
            d = new Date(parseInt(fechaRaw.replace(/[^0-9]/g, '')));
        }
        if (!isNaN(d)) {
            horaMostrar = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            horaMostrar = fechaRaw; // Si la API ya te manda "18:30" directo
        }
    }

    // Identificar si es Llegada o Salida
    const esLlegada = String(tipoLlegada).toLowerCase() === 'true' || 
                      String(tipoLlegada) === '1' || 
                      String(tipoLlegada).toLowerCase() === 'llegada';

    return {
        id: idVuelo,
        numero_vuelo: numVuelo,
        aerolinea: aerolinea,
        tipo: esLlegada ? 'Llegada' : 'Salida',
        ruta: ruta,
        hora: horaMostrar,
        estado: String(estado).toUpperCase().trim()
    };
});
                setVuelos(vuelosFormateados);
            }
        } catch (error) {
            console.log("Error cargando datos del radar:", error);
        } finally {
            setCargando(false);
        }
    };
const obtenerClima = async () => {
    try {
      
        const response = await axios.get(API_URL_CLIMA);
        const data = response.data;
        
        console.log("Datos del clima:", data);
    } catch (error) {
        console.error("Error en la API de clima:", error);
    }
};
const cargarClima = async () => {
    try {
        const response = await axios.get(API_URL_CLIMA);
        const { main, weather } = response.data;
        setClima({
            temp: Math.round(main.temp),
            condicion: weather[0].description,
            icono: weather[0].icon
        });
    } catch (error) {
        console.log("Error clima:", error);
        setClima({ temp: '--', condicion: 'Sin conexión', icono: '50d' });
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
            {/* Barra Superior estilo Web */}
            <View style={styles.topBar}>
                <View style={styles.brandContainer}>
                    <Image source={require('../../assets/icon.png')} style={styles.brandLogo} />
                    <Text style={styles.brandText}>LA AURORA</Text>
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

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                
                <View style={styles.contentPadding}>
                    {/* Banner Institucional */}
                    <Image source={require('../../assets/banner.png')} style={styles.bannerImage} />

                    {/* Menú de Usuario */}
                    {usuario && (
                        <View style={styles.menuSeccion}>
                            <Text style={styles.sectionTitle}>MÓDULO PASAJERO</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('MiPerfil')}>
                                    <Text style={styles.menuIcon}>👤</Text>
                                    <Text style={styles.menuText}>Mi Perfil</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('Reservas')}>
                                    <Text style={styles.menuIcon}>🛒</Text>
                                    <Text style={styles.menuText}>Reservar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('MisBoletos')}>
                                    <Text style={styles.menuIcon}>🎫</Text>
                                    <Text style={styles.menuText}>Mis Boletos</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('Pagos')}>
                                    <Text style={styles.menuIcon}>💳</Text>
                                    <Text style={styles.menuText}>Pagar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('Equipaje')}>
                                    <Text style={styles.menuIcon}>🧳</Text>
                                    <Text style={styles.menuText}>Equipaje</Text>
                                </TouchableOpacity>
<TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('Checkin')}>
    <Text style={styles.menuIcon}>📝</Text>
    <Text style={styles.menuText}>Check-In</Text>
</TouchableOpacity>
                                <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('MisFacturas')}>
                                    <Text style={styles.menuIcon}>🧾</Text>
                                    <Text style={styles.menuText}>Facturas</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.menuCard} onPress={() => navigation.navigate('SoporteTickets')}>
                                    <Text style={styles.menuIcon}>🎧</Text>
                                    <Text style={styles.menuText}>Soporte</Text>
                                </TouchableOpacity>
                              tk-46497EDA
                            </ScrollView>
                        </View>
                    )}

                    {/* Tarjetas de Estadísticas Estilo Web */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
                        <View style={styles.statCard}>
                            <View>
                                <Text style={styles.statTitle}>VUELOS ACTIVOS</Text>
                                <Text style={styles.statValue}>{estadisticas.activos}</Text>
                            </View>
                            <Text style={styles.statEmoji}>📡</Text>
                        </View>
                        <View style={styles.statCard}>
                            <View>
                                <Text style={styles.statTitle}>LLEGADAS HOY</Text>
                                <Text style={[styles.statValue, { color: '#0d47a1' }]}>{estadisticas.llegadas}</Text>
                            </View>
                            <Text style={styles.statEmoji}>🛬</Text>
                        </View>
                        <View style={styles.statCard}>
                            <View>
                                <Text style={styles.statTitle}>SALIDAS HOY</Text>
                                <Text style={[styles.statValue, { color: '#e65100' }]}>{estadisticas.salidas}</Text>
                            </View>
                            <Text style={styles.statEmoji}>🛫</Text>
                        </View>
                        
                        {/* 🔥 AQUÍ VA LA NUEVA TARJETA DEL CLIMA 🔥 */}
                        <View style={styles.statCard}>
                            <View style={{ flex: 1, paddingRight: 5 }}>
                                <Text style={styles.statTitle}>CLIMA GUA</Text>
                                <Text style={styles.statValue}>{clima.temp}°C</Text>
                                <Text style={{ color: '#8392a5', fontSize: 10, fontWeight: 'bold', textTransform: 'capitalize' }} numberOfLines={1}>
                                    {clima.condicion}
                                </Text>
                            </View>
                            <Image 
                                source={{ uri: `https://openweathermap.org/img/wn/${clima.icono}@2x.png` }} 
                                style={{ width: 55, height: 55 }} 
                            />
                        </View>

                    </ScrollView>

                    {/* Tarjeta de Monitoreo */}
                    <View style={styles.monitoringCard}>
                        
                        {/* Cabecera del Radar */}
                        <View style={styles.monitoringHeader}>
                            <View style={styles.liveWrapper}>
                                <View style={styles.liveDot} />
                                <Text style={styles.monitoringTitle}>Monitoreo en Tiempo Real</Text>
                            </View>
                            <TouchableOpacity style={styles.btnRadar} onPress={() => navigation.navigate('Radar')}>
                                <Text style={styles.btnRadarText}>🌍 Abrir Radar Completo</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Filtros: Llegadas / Salidas */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosScroll}>
                            <TouchableOpacity style={[styles.chipBase, filtrosTipo.llegada ? styles.chipLlegadaOn : styles.chipOff]} onPress={() => toggleTipo('llegada')}>
                                <Text style={[styles.chipText, filtrosTipo.llegada ? styles.chipTextOn : styles.chipTextOff]}>🛬 Llegadas</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.chipBase, filtrosTipo.salida ? styles.chipSalidaOn : styles.chipOff]} onPress={() => toggleTipo('salida')}>
                                <Text style={[styles.chipText, filtrosTipo.salida ? styles.chipTextOn : styles.chipTextOff]}>🛫 Salidas</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        {/* Filtros: Estados */}
                        <Text style={styles.filtroSubtitle}>FILTRAR ESTADOS:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosScroll}>
                            <TouchableOpacity style={[styles.chipBase, filtrosEstado.programado ? styles.chipBlueOn : styles.chipOff]} onPress={() => toggleEstado('programado')}>
                                <Text style={[styles.chipText, filtrosEstado.programado ? styles.chipTextOn : styles.chipTextOff]}>Programado</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.chipBase, filtrosEstado.abordando_vuelo ? styles.chipBlueOn : styles.chipOff]} onPress={() => toggleEstado('abordando_vuelo')}>
                                <Text style={[styles.chipText, filtrosEstado.abordando_vuelo ? styles.chipTextOn : styles.chipTextOff]}>En Vuelo/Abordando</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.chipBase, filtrosEstado.aterrizado ? styles.chipBlueOn : styles.chipOff]} onPress={() => toggleEstado('aterrizado')}>
                                <Text style={[styles.chipText, filtrosEstado.aterrizado ? styles.chipTextOn : styles.chipTextOff]}>Aterrizado</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.chipBase, filtrosEstado.retrasado ? styles.chipWarningOn : styles.chipOff]} onPress={() => toggleEstado('retrasado')}>
                                <Text style={[styles.chipText, filtrosEstado.retrasado ? styles.chipTextOn : styles.chipTextOff]}>Retrasado</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.chipBase, filtrosEstado.cancelado ? styles.chipDangerOn : styles.chipOff]} onPress={() => toggleEstado('cancelado')}>
                                <Text style={[styles.chipText, filtrosEstado.cancelado ? styles.chipTextOn : styles.chipTextOff]}>Cancelado</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        {/* Lista de Vuelos */}
                        {cargando ? (
                            <ActivityIndicator size="large" color="#0d47a1" style={{ marginVertical: 40 }} />
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
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Text style={{ fontSize: 30, opacity: 0.5, marginBottom: 10 }}>📭</Text>
                                        <Text style={styles.emptyText}>No hay vuelos que coincidan con los filtros.</Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fc' },
    contentPadding: { padding: 20 },
    
    // Top Bar (Estilo Dashboard)
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fc', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15 },
    brandContainer: { flexDirection: 'row', alignItems: 'center' },
    brandLogo: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#edf2f9', marginRight: 10 },
    brandText: { fontSize: 20, fontWeight: '900', color: '#2c3e50', letterSpacing: -0.5 },
    
    // Botones Top Bar
    btnLogin: { backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#edf2f9', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
    btnLoginText: { color: '#0d47a1', fontWeight: '800', fontSize: 12 },
    btnLogout: { backgroundColor: '#e74c3c', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, shadowColor: '#e74c3c', shadowOpacity: 0.3, elevation: 2 },
    btnLogoutText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

    // Banner
    bannerImage: { width: '100%', height: 180, borderRadius: 16, marginBottom: 25, resizeMode: 'cover' },

    // Sección Módulo Pasajero
    menuSeccion: { marginBottom: 25 },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: '#8395a7', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 },
    menuCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#edf2f9', borderRadius: 12, paddingVertical: 15, paddingHorizontal: 20, marginRight: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1, minWidth: 95 },
    menuIcon: { fontSize: 22, marginBottom: 8 },
    menuText: { fontSize: 11, fontWeight: '800', color: '#2c3e50' },

    // Tarjetas Estadísticas Web
    statsScroll: { marginBottom: 25 },
    statCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#edf2f9', padding: 20, width: 170, marginRight: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
    statTitle: { color: '#8392a5', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
    statValue: { color: '#2c3e50', fontSize: 26, fontWeight: '900' },
    statEmoji: { fontSize: 32, opacity: 0.5 },

    // Tarjeta de Monitoreo Central
    monitoringCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#edf2f9', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 3 },
    monitoringHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#edf2f9', paddingBottom: 15, marginBottom: 20, flexWrap: 'wrap', gap: 10 },
    liveWrapper: { flexDirection: 'row', alignItems: 'center' },
    liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#e74c3c', marginRight: 10, shadowColor: '#e74c3c', shadowOpacity: 0.8, shadowRadius: 5 },
    monitoringTitle: { fontSize: 16, fontWeight: '900', color: '#2c3e50', letterSpacing: -0.5 },
    
    // Botón Radar
    btnRadar: { backgroundColor: '#f8f9fc', borderWidth: 1, borderColor: '#edf2f9', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    btnRadarText: { color: '#0d47a1', fontWeight: '800', fontSize: 11 },

    // Filtros
    filtrosScroll: { marginBottom: 15 },
    filtroSubtitle: { fontSize: 10, fontWeight: '800', color: '#8395a7', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
    chipBase: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
    chipOff: { backgroundColor: 'transparent', borderColor: '#0d47a1' },
    chipTextOff: { color: '#0d47a1', fontSize: 11, fontWeight: '800' },
    
    // Colores Activos Filtros
    chipLlegadaOn: { backgroundColor: '#0d47a1', borderColor: '#0d47a1' },
    chipSalidaOn: { backgroundColor: '#e65100', borderColor: '#e65100' },
    chipBlueOn: { backgroundColor: '#0d47a1', borderColor: '#0d47a1' },
    chipWarningOn: { backgroundColor: '#f1c40f', borderColor: '#f1c40f' },
    chipDangerOn: { backgroundColor: '#e74c3c', borderColor: '#e74c3c' },
    chipTextOn: { color: '#fff', fontSize: 11, fontWeight: '800' },

    // Lista vacía
    emptyContainer: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: '#8395a7', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }
});

export default Inicio;