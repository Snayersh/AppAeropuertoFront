import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import axios from 'axios';
import VueloCard from '../components/VueloCard';

// OJO: Cambia esta IP por la IP de tu computadora (ej. 192.168.1.15)
// El teléfono no reconoce 'localhost'
const API_URL = '192.168.0.27:4000/api'; 

const Inicio = ({ navigation }) => {
    const [estadisticas, setEstadisticas] = useState({ activos: 0, llegadas: 0, salidas: 0 });
    const [vuelos, setVuelos] = useState([]);
    const [cargando, setCargando] = useState(true);

    // Filtros activos (Igual que tus Checkboxes en la web)
    const [filtroTipo, setFiltroTipo] = useState('TODOS'); // 'TODOS', 'Llegada', 'Salida'

    useEffect(() => {
        cargarDatos();
        // Opcional: setInterval para que se actualice solo cada 10 segundos
    }, []);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            // Simulamos la llamada a tus SPs (Puedes conectar esto a tus endpoints reales)
            const resStats = await axios.get(`${API_URL}/radar/estadisticas`);
            if (resStats.data.success) {
                setEstadisticas(resStats.data.data);
            }

            const resRadar = await axios.get(`${API_URL}/radar/vivo`);
            if (resRadar.data.success) {
                // Mapeamos los datos de Oracle al formato de la app
                const vuelosFormateados = resRadar.data.vuelos.map(v => ({
                    id: v.ID_VUELO,
                    numero_vuelo: v.CODIGO_VUELO,
                    aerolinea: v.AEROLINEA || 'La Aurora',
                    tipo: v.ES_LLEGADA ? 'Llegada' : 'Salida',
                    ruta: `${v.ORIGEN_IATA} ➔ ${v.DESTINO_IATA}`,
                    hora: new Date(v.HORA_PROGRAMADA).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    estado: v.ESTADO
                }));
                setVuelos(vuelosFormateados);
            }
        } catch (error) {
            console.log("Error cargando datos:", error);
        } finally {
            setCargando(false);
        }
    };

    // Lógica para filtrar la lista en pantalla
    const vuelosFiltrados = vuelos.filter(v => {
        if (filtroTipo === 'TODOS') return true;
        return v.tipo === filtroTipo;
    });

    return (
        <View style={styles.container}>
            {/* ENCABEZADO Y SALUDO */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Centro de Control GUA</Text>
                    <Text style={styles.subtitle}>Bienvenido, Invitado</Text>
                </View>
                <TouchableOpacity 
                    style={styles.btnLogin} 
                    onPress={() => navigation.navigate('Login')}
                >
                    <Text style={styles.btnLoginText}>Iniciar Sesión</Text>
                </TouchableOpacity>
            </View>

            {/* TARJETAS DE ESTADÍSTICAS (Scroll Horizontal) */}
            <View style={styles.statsContainer}>
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

            {/* FILTROS DE TIPO */}
            <View style={styles.filtrosRow}>
                <TouchableOpacity style={[styles.filtroBtn, filtroTipo === 'TODOS' && styles.filtroActivo]} onPress={() => setFiltroTipo('TODOS')}>
                    <Text style={[styles.filtroTexto, filtroTipo === 'TODOS' && styles.filtroTextoActivo]}>🌍 Todos</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.filtroBtn, filtroTipo === 'Llegada' && styles.filtroActivo]} onPress={() => setFiltroTipo('Llegada')}>
                    <Text style={[styles.filtroTexto, filtroTipo === 'Llegada' && styles.filtroTextoActivo]}>🛬 Llegadas</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.filtroBtn, filtroTipo === 'Salida' && styles.filtroActivo]} onPress={() => setFiltroTipo('Salida')}>
                    <Text style={[styles.filtroTexto, filtroTipo === 'Salida' && styles.filtroTextoActivo]}>🛫 Salidas</Text>
                </TouchableOpacity>
            </View>

            {/* LISTA DE VUELOS (Reemplazo de la tabla) */}
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
                        renderItem={({ item }) => (
                            <VueloCard 
                                vuelo={item} 
                                // onPress={() => navigation.navigate('DetalleVuelo', { id: item.id })} // Para cuando hagamos el detalle
                            />
                        )}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: '#666' }}>No hay vuelos programados</Text>}
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f7f6' },
    header: { backgroundColor: '#0d47a1', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    title: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 5 },
    btnLogin: { backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    btnLoginText: { color: '#0d47a1', fontWeight: 'bold' },
    
    statsContainer: { marginTop: -20, paddingLeft: 15, zIndex: 10 },
    statCard: { width: 160, height: 90, padding: 15, borderRadius: 15, marginRight: 15, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
    statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold', marginBottom: 5, letterSpacing: 1 },
    statValue: { color: 'white', fontSize: 24, fontWeight: 'bold' },

    filtrosRow: { flexDirection: 'row', padding: 15, gap: 10 },
    filtroBtn: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#0d47a1', backgroundColor: 'transparent' },
    filtroActivo: { backgroundColor: '#0d47a1' },
    filtroTexto: { color: '#0d47a1', fontWeight: 'bold' },
    filtroTextoActivo: { color: 'white' },

    listContainer: { flex: 1, paddingHorizontal: 15 },
    listHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    liveIndicator: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#e74c3c', marginRight: 10 },
    listTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' }
});

export default Inicio;