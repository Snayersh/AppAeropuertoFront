import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, FlatList } from 'react-native';
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
            const response = await axios.post(API_URL, {
                accion: 'mis_boletos',
                correo: emailUsuario,
                estado: estado,
                token: tokenUsuario
            }, {
                headers: { 'ngrok-skip-browser-warning': 'true', 'Bypass-Tunnel-Reminder': 'true' }
            });
            
            if (response.data.success) {
                setBoletos(response.data.boletos);
            } else {
                setBoletos([]);
                if (response.data.mensaje === "SESION_EXPIRADA") {
                    Alert.alert("🔎 Chisme del Guardia", response.data.debug_info || "Sin detalles");
                    navigation.replace('Login');
                }
            }
        } catch (error) {
            setBoletos([]);
        } finally {
            setCargando(false);
        }
    };

    const confirmarCancelacion = (idBoleto) => {
        Alert.alert(
            "Cancelar Reserva",
            "¿Estás seguro que deseas cancelar esta reserva? El asiento será liberado.",
            [
                { text: "No, volver", style: "cancel" },
                { text: "Sí, cancelar", style: "destructive", onPress: () => procesarCancelacion(idBoleto) }
            ]
        );
    };

    const procesarCancelacion = async (idBoleto) => {
        try {
            setCargando(true);
            const response = await axios.post(API_URL, {
                accion: 'cancelar_reserva',
                id_boleto: idBoleto,
                correo: correoAuth,
                token: tokenAuth
            }, {
                headers: { 'ngrok-skip-browser-warning': 'true', 'Bypass-Tunnel-Reminder': 'true' }
            });

            if (response.data.success) {
                Alert.alert("Éxito", "Reserva cancelada correctamente.");
                cargarBoletos(correoAuth, tokenAuth, filtroEstado);
            } else {
                // 🔥 SOLUCIÓN BUG 4: Si el servidor dice que ya expiró, le avisamos al usuario y actualizamos la vista
                if (response.data.mensaje === "ERROR_NO_ENCONTRADA_O_PAGADA") {
                    Alert.alert("Reserva Expirada", "Esta reserva caducó por inactividad y ha sido limpiada del sistema.");
                    cargarBoletos(correoAuth, tokenAuth, filtroEstado);
                } else if (response.data.mensaje === "SESION_EXPIRADA") {
                    Alert.alert("Sesión Expirada", "Has iniciado sesión en otro dispositivo.");
                    navigation.replace('Login');
                } else {
                    Alert.alert("Error", response.data.mensaje || "No se pudo cancelar la reserva.");
                }
            }
        } catch (error) {
            Alert.alert("Error", "Error de conexión al cancelar la reserva.");
        } finally {
            setCargando(false);
        }
    };

    const renderBoleto = ({ item }) => {
        const estadoStr = (item.estadoboleto || item.estado_boleto || item.estado || '').toUpperCase();
        const codigoReserva = item.codigoreserva || item.codigo_reserva || item.codigo || '---';
        const idBoleto = item.idboleto || item.id_boleto || item.id || ''; 
        
        // 🔥 SOLUCIÓN BUG 5: Atrapamos el ID_VUELO incluso si Oracle lo devuelve en mayúsculas
        const idVuelo = item.ID_VUELO || item.IDVUELO || item.id_vuelo || item.idvuelo || item.id || ''; 

        let fechaSalidaCruda = item.fechasalida || item.fecha_salida || 'Sin Fecha';
        let horaSalidaCruda = item.horasalida || item.hora_salida || '--:--';
        
        const asiento = item.asientoasignado || item.asiento_asignado || item.asiento || 'S/A';
        const origen = item.origen || 'Origen';
        const destino = item.destino || 'Destino';
        const cabina = item.clasecabina || item.clase_cabina || item.cabina || 'N/A';

        if (fechaSalidaCruda.includes(' ')) {
            const partes = fechaSalidaCruda.split(' ');
            fechaSalidaCruda = partes[0]; 
            if (horaSalidaCruda === '--:--') horaSalidaCruda = partes[1].substring(0, 5);
        }

        let badgeStyle = styles.badgeReservado;
        if (estadoStr === 'PAGADO') badgeStyle = styles.badgePagado;
        if (estadoStr === 'CANCELADO') badgeStyle = styles.badgeCancelado;

        return (
            <TouchableOpacity 
                style={styles.ticketCard}
                activeOpacity={0.9}
                onPress={() => { 
                    if(idVuelo) {
                        navigation.navigate('DetalleVuelo', { id: idVuelo }); 
                    } else {
                        Alert.alert("Aviso", "No hay detalles disponibles para este vuelo.");
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
                        <View style={{ flex: 1.5 }}>
                            <Text style={styles.ticketLabel}>FECHA</Text>
                            <Text style={styles.ticketValue}>{fechaSalidaCruda}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.ticketLabel}>HORA</Text>
                            <Text style={styles.ticketValue}>{horaSalidaCruda}</Text>
                        </View>
                    </View>
                    
                    <View style={[styles.detailsRow, { marginTop: 10 }]}>
                        <View style={{ flex: 1.5 }}>
                            <Text style={styles.ticketLabel}>CABINA</Text>
                            <Text style={[styles.ticketValue, { color: '#0d47a1' }]}>{cabina}</Text>
                        </View>
                       <View style={{ flex: 1 }}>
                            <Text style={styles.ticketLabel}>ASIENTO</Text>
                            <Text style={[styles.ticketValue, { color: '#e65100' }]}>{asiento}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.ticketSide}>
                    <Text style={styles.ticketLabel}>LOCALIZADOR</Text>
                    <Text style={styles.locText}>{codigoReserva}</Text>

                    <Text style={styles.ticketLabel}>ESTADO</Text>
                    <View style={badgeStyle}>
                        <Text style={styles.badgeText}>{estadoStr}</Text>
                    </View>

                    {estadoStr === 'RESERVADO' && (
                        <>
                            <TouchableOpacity style={styles.btnPagar} onPress={() => navigation.navigate('Pagos', { codigo: codigoReserva })}>
                                <Text style={styles.btnPagarText}>💳 Pagar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnCancelar} onPress={() => confirmarCancelacion(idBoleto)}>
                                <Text style={styles.btnCancelarText}>❌ Cancelar</Text>
                            </TouchableOpacity>
                        </>
                    )}

                   {estadoStr === 'PAGADO' && (
                        <TouchableOpacity style={styles.btnImprimir} onPress={() => navigation.navigate('PaseAbordar', { codigo: codigoReserva })}>
                            <Text style={styles.btnImprimirText}>🖨️ Pase</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (verificandoGuardia && boletos.length === 0) return <ActivityIndicator size="large" color="#0d47a1" style={{ marginTop: 50 }} />;

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>🎫 Portal de Pasajeros</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Volver</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.headerTitle}>
                <Text style={styles.mainTitle}>Mis Viajes</Text>
                <Text style={styles.subTitle}>Historial de reservas y pases de abordar</Text>
            </View>

            <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity style={[styles.filterChip, filtroEstado === 1 && styles.filterChipActive]} onPress={() => setFiltroEstado(1)}>
                        <Text style={[styles.filterText, filtroEstado === 1 && styles.filterTextActive]}>Pendientes</Text>
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
                <ActivityIndicator size="large" color="#0d47a1" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={boletos}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 30 }}
                    renderItem={renderBoleto}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={{ fontSize: 60 }}>🧳</Text>
                            <Text style={styles.emptyTitle}>Aún no tienes vuelos</Text>
                            <Text style={styles.emptySub}>¿Qué esperas para planear tu aventura?</Text>
                            <TouchableOpacity style={styles.btnComprar} onPress={() => navigation.navigate('Reservas')}>
                                <Text style={styles.btnComprarText}>Comprar Boleto</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f7f6' },
    topBar: { backgroundColor: '#0d47a1', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    topBarTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    btnVolver: { borderColor: 'white', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    btnVolverText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    headerTitle: { alignItems: 'center', marginVertical: 20 },
    mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    subTitle: { color: '#666', fontSize: 14 },
    filterContainer: { paddingLeft: 15, marginBottom: 20 },
    filterChip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e9ecef', marginRight: 10 },
    filterChipActive: { backgroundColor: '#0d47a1' },
    filterText: { color: '#495057', fontWeight: 'bold' },
    filterTextActive: { color: '#fff' },
    ticketCard: { backgroundColor: 'white', borderRadius: 12, marginBottom: 15, flexDirection: 'row', overflow: 'hidden', borderLeftWidth: 8, borderLeftColor: '#0d47a1', shadowColor: '#000', shadowOpacity: 0.1, elevation: 3 },
    ticketMain: { flex: 2, padding: 15 },
    routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    routeText: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    flightIcon: { fontSize: 20, color: '#1976d2', marginHorizontal: 10 },
    detailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    ticketLabel: { fontSize: 10, color: '#888', fontWeight: 'bold', marginBottom: 2 },
    ticketValue: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50' },
    ticketSide: { flex: 1, backgroundColor: '#f8f9fa', padding: 15, borderLeftWidth: 2, borderLeftColor: '#dee2e6', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    locText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    badgeReservado: { backgroundColor: '#fff3e0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginBottom: 10 },
    badgePagado: { backgroundColor: '#e8f5e9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginBottom: 10 },
    badgeCancelado: { backgroundColor: '#ffebee', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginBottom: 10 },
    badgeText: { fontWeight: 'bold', fontSize: 10 },
    btnPagar: { backgroundColor: '#27ae60', paddingVertical: 6, width: '100%', borderRadius: 5, alignItems: 'center', marginBottom: 5 },
    btnPagarText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    btnCancelar: { borderColor: '#e74c3c', borderWidth: 1, paddingVertical: 6, width: '100%', borderRadius: 5, alignItems: 'center' },
    btnCancelarText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 12 },
    btnImprimir: { backgroundColor: '#0d47a1', paddingVertical: 6, width: '100%', borderRadius: 5, alignItems: 'center' },
    btnImprimirText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#666', marginTop: 10 },
    emptySub: { color: '#999', marginBottom: 20 },
    btnComprar: { backgroundColor: '#0d47a1', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25 },
    btnComprarText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default MisBoletos;