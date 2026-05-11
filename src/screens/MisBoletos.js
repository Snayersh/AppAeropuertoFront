import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, FlatList, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { API_URL } from '../config';
import { useGuardia } from '../hooks/useGuardia'; 

const MisBoletos = ({ navigation }) => {
    const { correoAuth, tokenAuth, verificandoGuardia } = useGuardia(navigation);

    const [boletos, setBoletos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [filtroEstado, setFiltroEstado] = useState(1); 

    useFocusEffect(
        useCallback(() => {
            if (!verificandoGuardia && correoAuth && tokenAuth) {
                cargarBoletos(correoAuth, tokenAuth, filtroEstado);
            }
        }, [verificandoGuardia, correoAuth, tokenAuth, filtroEstado])
    );

    const cargarBoletos = async (emailUsuario, tokenUsuario, estado) => {
        setCargando(true);
        try {
            const formData = new FormData();
            formData.append('action', 'mis_boletos');
            formData.append('email', emailUsuario);
            formData.append('filtro', estado); 
            formData.append('token', tokenUsuario);

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success) {
                setBoletos(response.data.boletos);
            } else {
                setBoletos([]);
                if (response.data.mensaje === "SESION_EXPIRADA") {
                    navigation.replace('Login');
                }
            }
        } catch (error) {
            console.log("Error al cargar boletos:", error);
            setBoletos([]);
        } finally {
            setCargando(false);
        }
    };

    const confirmarCancelacion = (codigoReserva) => {
        Alert.alert(
            "Cancelar Reserva",
            "¿Estás seguro que deseas cancelar esta reserva? El asiento será liberado.",
            [
                { text: "No, volver", style: "cancel" },
                { text: "Sí, cancelar", style: "destructive", onPress: () => procesarCancelacion(codigoReserva) }
            ]
        );
    };

    const procesarCancelacion = async (codigoReserva) => {
        try {
            setCargando(true);
            const formData = new FormData();
            formData.append('action', 'cancelar_reserva');
            formData.append('codigoReserva', String(codigoReserva).trim());
            formData.append('email', correoAuth);
            formData.append('token', tokenAuth);

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                Alert.alert("Éxito", "Reserva cancelada correctamente.");
                cargarBoletos(correoAuth, tokenAuth, filtroEstado);
            } else {
                Alert.alert("Error", response.data.mensaje || "No se pudo cancelar.");
            }
        } catch (error) {
            Alert.alert("Error", "Error de conexión.");
        } finally {
            setCargando(false);
        }
    };

    const renderBoleto = ({ item }) => {
        // Regresamos a Object.values para extraer por posición como lo tenías originalmente
        const valores = Object.values(item);

        // Según tu estructura original:
        const idVuelo = valores[1] || '';
        const codigoReserva = String(valores[2] || '').trim(); // El localizador (PNR)
        const origen = valores[3] || 'Origen';
        const destino = valores[4] || 'Destino';
        const fechaSalida = valores[5] || 'Sin Fecha';
        const horaSalida = valores[6] || '--:--';
        const cabina = valores[7] || 'N/A';
        const asiento = valores[8] || 'S/A';
        const estadoStr = String(valores[9] || '').toUpperCase();

        // Estilos de badge
        let badgeContainerStyle = styles.badgeReservado;
        let badgeTextStyle = styles.badgeReservadoText;

        // Verificamos si es PAGADO o CONFIRMADO
        const esPagado = estadoStr.includes('PAGADO') || estadoStr.includes('CONFIRM');

        if (esPagado) {
            badgeContainerStyle = styles.badgePagado;
            badgeTextStyle = styles.badgePagadoText;
        } else if (estadoStr.includes('CANCEL')) {
            badgeContainerStyle = styles.badgeCancelado;
            badgeTextStyle = styles.badgeCanceladoText;
        }

        // Función para navegar con log de depuración
// En MisBoletos.js, asegúrate de que el irAlPase sea así de simple:
const irAlPase = () => {
    // Mandamos el código tal cual (ej: "TK-738153DB")
    navigation.navigate('PaseAbordar', { codigo: codigoReserva });
};

        return (
            <TouchableOpacity 
                style={styles.ticketCard}
                activeOpacity={0.9}
                onPress={() => { 
                    if (esPagado) {
                        irAlPase();
                    } else if (estadoStr.includes('RESERV')) {
                        navigation.navigate('Pagos', { codigo: codigoReserva });
                    } else {
                        Alert.alert("Aviso", "Este boleto se encuentra cancelado.");
                    }
                }}
            >
                <View style={styles.ticketMain}>
                    <View style={styles.routeRow}>
                        <Text style={styles.routeText}>{origen}</Text>
                        <Text style={styles.flightIcon}>✈️</Text>
                        <Text style={styles.routeText}>{destino}</Text>
                    </View>
                    
                    <View style={styles.detailsRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.ticketLabel}>FECHA SALIDA</Text>
                            <Text style={styles.ticketValue}>{fechaSalida}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.ticketLabel}>HORA GUA</Text>
                            <Text style={styles.ticketValue}>{horaSalida}</Text>
                        </View>
                    </View>
                    
                    <View style={[styles.detailsRow, { marginTop: 15 }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.ticketLabel}>CABINA</Text>
                            <Text style={[styles.ticketValue, { color: '#0d47a1' }]}>{cabina}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.ticketLabel}>ASIENTO</Text>
                            <Text style={[styles.ticketValue, { color: '#e74c3c' }]}>{asiento}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.ticketSide}>
                    <View style={styles.notchTop} />
                    <View style={styles.notchBottom} />

                    <Text style={styles.ticketLabel}>LOCALIZADOR</Text>
                    <Text style={styles.locText}>{codigoReserva}</Text>

                    <Text style={[styles.ticketLabel, { marginTop: 5 }]}>ESTADO</Text>
                    <View style={[styles.badgeBase, badgeContainerStyle]}>
                        <Text style={[styles.badgeTextBase, badgeTextStyle]}>{estadoStr}</Text>
                    </View>

                    {estadoStr.includes('RESERV') && (
                        <View style={{ width: '100%', marginTop: 5 }}>
                            <TouchableOpacity style={styles.btnSuccess} onPress={() => navigation.navigate('Pagos', { codigo: codigoReserva })}>
                                <Text style={styles.btnActionText}>💳 PAGAR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnDanger} onPress={() => confirmarCancelacion(codigoReserva)}>
                                <Text style={styles.btnActionTextDanger}>❌ CANCELAR</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {esPagado && (
                        <View style={{ width: '100%', marginTop: 5 }}>
                            <TouchableOpacity style={styles.btnPrimary} onPress={irAlPase}>
                                <Text style={styles.btnActionText}>🖨️ IMPRIMIR</Text>
                            </TouchableOpacity>
                            <Text style={styles.readyText}>¡Listo para volar!</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <View style={styles.topBarLeft}>
                    <Image source={require('../../assets/icon.png')} style={styles.brandIconMini} />
                    <Text style={styles.topBarTitle}>Portal de Pasajeros</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Inicio</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.headerContainer}>
                <View style={styles.headerAccent} />
                <Text style={styles.mainTitle}>Mis Viajes</Text>
                <Text style={styles.subTitle}>Historial de reservas e impresión</Text>
            </View>

            <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity style={[styles.filterChip, filtroEstado === 1 && styles.filterChipActive]} onPress={() => setFiltroEstado(1)}>
                        <Text style={[styles.filterText, filtroEstado === 1 && styles.filterTextActive]}>Por Pagar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.filterChip, filtroEstado === 2 && styles.filterChipActive]} onPress={() => setFiltroEstado(2)}>
                        <Text style={[styles.filterText, filtroEstado === 2 && styles.filterTextActive]}>Pagados</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.filterChip, filtroEstado === 3 && styles.filterChipActive]} onPress={() => setFiltroEstado(3)}>
                        <Text style={[styles.filterText, filtroEstado === 3 && styles.filterTextActive]}>Cancelados</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.filterChip, filtroEstado === 0 && styles.filterChipActive]} onPress={() => setFiltroEstado(0)}>
                        <Text style={[styles.filterText, filtroEstado === 0 && styles.filterTextActive]}>Todos</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {cargando ? (
                <ActivityIndicator size="large" color="#2c3e50" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={boletos}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 30 }}
                    renderItem={renderBoleto}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>✈️</Text>
                            <Text style={styles.emptyTitle}>Sin boletos</Text>
                            <TouchableOpacity style={styles.btnComprar} onPress={() => navigation.navigate('Reservas')}>
                                <Text style={styles.btnComprarText}>RESERVAR AHORA</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fc' },
    topBar: { backgroundColor: '#2c3e50', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, elevation: 5 },
    topBarLeft: { flexDirection: 'row', alignItems: 'center' },
    brandIconMini: { width: 30, height: 30, borderRadius: 6, marginRight: 10, backgroundColor: 'white' },
    topBarTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    btnVolver: { borderColor: '#bdc3c7', borderWidth: 1, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
    btnVolverText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    headerContainer: { alignItems: 'center', marginVertical: 25 },
    headerAccent: { width: 60, height: 5, backgroundColor: '#0d47a1', borderRadius: 10, marginBottom: 15 },
    mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50', letterSpacing: -0.5 },
    subTitle: { color: '#6c757d', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginTop: 5, fontWeight: 'bold' },
    filterContainer: { paddingLeft: 15, marginBottom: 20 },
    filterChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#edf2f9', marginRight: 10, shadowColor: '#000', shadowOpacity: 0.02, elevation: 1 },
    filterChipActive: { backgroundColor: '#2c3e50', borderColor: '#2c3e50' },
    filterText: { color: '#6c757d', fontWeight: 'bold', fontSize: 12 },
    filterTextActive: { color: '#fff' },
    ticketCard: { backgroundColor: 'white', borderRadius: 15, marginBottom: 25, flexDirection: 'row', overflow: 'hidden', borderLeftWidth: 8, borderLeftColor: '#2c3e50', borderWidth: 1, borderColor: '#edf2f9', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
    ticketMain: { flex: 2, padding: 20, justifyContent: 'center' },
    routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    routeText: { fontSize: 22, fontWeight: '900', color: '#2c3e50', letterSpacing: -0.5 },
    flightIcon: { fontSize: 18, color: '#0d47a1', marginHorizontal: 15, opacity: 0.8 },
    detailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    ticketLabel: { fontSize: 10, color: '#6c757d', fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
    ticketValue: { fontSize: 15, fontWeight: 'bold', color: '#2c3e50' },
    ticketSide: { flex: 1.2, backgroundColor: '#f8f9fc', padding: 15, borderLeftWidth: 2, borderLeftColor: '#bdc3c7', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', position: 'relative' },
    notchTop: { position: 'absolute', top: -12, left: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: '#f8f9fc' },
    notchBottom: { position: 'absolute', bottom: -12, left: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: '#f8f9fc' },
    locText: { fontSize: 20, fontWeight: '900', color: '#2c3e50', letterSpacing: 1, marginBottom: 15 },
    badgeBase: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 15 },
    badgeTextBase: { fontWeight: '900', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
    badgeReservado: { backgroundColor: '#fff3e0' },
    badgeReservadoText: { color: '#e65100' },
    badgePagado: { backgroundColor: '#e0f2f1' },
    badgePagadoText: { color: '#00695c' },
    badgeCancelado: { backgroundColor: '#ffebee' },
    badgeCanceladoText: { color: '#e74c3c' },
    btnSuccess: { backgroundColor: '#198754', paddingVertical: 8, width: '100%', borderRadius: 25, alignItems: 'center', marginBottom: 8, shadowColor: '#198754', shadowOpacity: 0.3, elevation: 2 },
    btnDanger: { backgroundColor: 'transparent', borderColor: '#e74c3c', borderWidth: 1.5, paddingVertical: 8, width: '100%', borderRadius: 25, alignItems: 'center' },
    btnPrimary: { backgroundColor: '#0d47a1', paddingVertical: 10, width: '100%', borderRadius: 25, alignItems: 'center', shadowColor: '#0d47a1', shadowOpacity: 0.3, elevation: 2 },
    btnActionText: { color: 'white', fontWeight: 'bold', fontSize: 11, letterSpacing: 0.5 },
    btnActionTextDanger: { color: '#e74c3c', fontWeight: 'bold', fontSize: 11, letterSpacing: 0.5 },
    readyText: { fontSize: 10, color: '#198754', fontWeight: 'bold', textTransform: 'uppercase', marginTop: 10, letterSpacing: 1, textAlign: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
    emptyEmoji: { fontSize: 60, opacity: 0.3, marginBottom: 15 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 5 },
    emptySub: { color: '#6c757d', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold', textAlign: 'center', marginBottom: 25 },
    btnComprar: { backgroundColor: '#2c3e50', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 30, shadowColor: '#000', shadowOpacity: 0.2, elevation: 4 },
    btnComprarText: { color: 'white', fontWeight: 'bold', fontSize: 13, letterSpacing: 1 }
});

export default MisBoletos;