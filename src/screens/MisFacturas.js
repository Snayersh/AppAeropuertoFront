import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config'



const MisFacturas = ({ navigation }) => {
    const [facturas, setFacturas] = useState([]);
    const [cargando, setCargando] = useState(true);

    useFocusEffect(
        useCallback(() => {
            obtenerSesionYCargar();
        }, [])
    );

    const obtenerSesionYCargar = async () => {
        try {
            const email = await AsyncStorage.getItem('UserEmail');
            if (!email) {
                navigation.replace('Login');
                return;
            }
            cargarFacturas(email);
        } catch (error) {
            console.log("Error leyendo sesión", error);
        }
    };

    const cargarFacturas = async (emailUsuario) => {
        setCargando(true);
        try {
            // Hacemos la petición a la API (asegúrate de tener esta ruta en tu Node.js)
            const response = await axios.get(`${API_URL}/pagos/mis-facturas/${emailUsuario}`);
            if (response.data.success) {
                setFacturas(response.data.facturas);
            } else {
                setFacturas([]);
            }
        } catch (error) {
            console.log("Error cargando facturas", error);
            setFacturas([]);
        } finally {
            setCargando(false);
        }
    };

    const renderFactura = ({ item }) => {
        // Adaptamos las variables como vengan de Oracle (TODO PEGADO o con guiones)
      // 🔥 Agregamos las versiones en minúscula para hacer match perfecto con la BD
        const idFactura = item.IDFACTURA || item.IdFactura || item.id_factura || item.ID_FACTURA;
        const numeroFactura = item.NUMEROFACTURA || item.NumeroFactura || item.numero_factura || item.NUMERO_FACTURA;
        const fechaEmision = item.FECHAEMISION || item.FechaEmision || item.fecha_emision || item.FECHA_EMISION || 'Sin fecha';
        const total = item.TOTAL || item.total || 0;
        const estado = (item.ESTADO || item.estado || '').toUpperCase();

        // Limpiamos la fecha por si viene con horas pegadas
        let fechaMostrar = fechaEmision;
        if (typeof fechaMostrar === 'string' && fechaMostrar.includes(' ')) {
            fechaMostrar = fechaMostrar.split(' ')[0];
        } else if (typeof fechaMostrar === 'string' && fechaMostrar.includes('T')) {
            fechaMostrar = fechaMostrar.split('T')[0];
        }

        const isPagada = estado === 'PAGADA' || estado === 'PAGADO';

        return (
            <View style={styles.invoiceCard}>
                <View style={styles.invoiceHeader}>
                    <View>
                        <Text style={styles.label}>NO. FACTURA</Text>
                        <Text style={styles.invoiceNumber}>{numeroFactura}</Text>
                    </View>
                    <View style={isPagada ? styles.badgePagado : styles.badgeAnulado}>
                        <Text style={styles.badgeText}>{estado}</Text>
                    </View>
                </View>

                <View style={styles.invoiceBody}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>FECHA DE EMISIÓN</Text>
                        <Text style={styles.value}>{fechaMostrar}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.label}>TOTAL PAGADO</Text>
                        <Text style={styles.totalText}>Q {parseFloat(total).toFixed(2)}</Text>
                    </View>
                </View>

                {/* BOTÓN PARA VER EL DETALLE PDF/FACTURA */}
                <TouchableOpacity 
                    style={styles.btnDetalle} 
                    onPress={() => navigation.navigate('DetalleFactura', { id_factura: idFactura })}
                >
                    <Text style={styles.btnDetalleText}>📄 Ver Detalle</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>🧾 Historial de Facturación</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Volver</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.headerTitle}>
                <Text style={styles.mainTitle}>Mis Facturas</Text>
                <Text style={styles.subTitle}>Resumen de todos tus pagos y comprobantes</Text>
            </View>

            {cargando ? (
                <ActivityIndicator size="large" color="#0d47a1" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={facturas}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 30 }}
                    renderItem={renderFactura}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={{ fontSize: 60 }}>🧾</Text>
                            <Text style={styles.emptyTitle}>No tienes facturas generadas</Text>
                            <Text style={styles.emptySub}>Tus facturas aparecerán aquí una vez que completes el pago de una reserva.</Text>
                            <TouchableOpacity style={styles.btnComprar} onPress={() => navigation.navigate('Reservas')}>
                                <Text style={styles.btnComprarText}>Comprar Boletos</Text>
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
    subTitle: { color: '#666', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
    
    invoiceCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 15, borderTopWidth: 5, borderTopColor: '#00796b', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
    invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15, marginBottom: 15 },
    label: { fontSize: 10, color: '#888', fontWeight: 'bold', letterSpacing: 1, marginBottom: 5 },
    invoiceNumber: { fontSize: 18, fontWeight: 'bold', color: '#0d47a1' },
    
    badgePagado: { backgroundColor: '#e8f5e9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    badgeAnulado: { backgroundColor: '#ffebee', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    badgeText: { fontWeight: 'bold', fontSize: 10, color: '#333' },

    invoiceBody: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    value: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    totalText: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },

    btnDetalle: { borderColor: '#0d47a1', borderWidth: 1, borderRadius: 25, paddingVertical: 10, alignItems: 'center' },
    btnDetalleText: { color: '#0d47a1', fontWeight: 'bold', fontSize: 14 },

    emptyContainer: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#666', marginTop: 10, textAlign: 'center' },
    emptySub: { color: '#999', marginBottom: 20, textAlign: 'center' },
    btnComprar: { backgroundColor: '#0d47a1', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25 },
    btnComprarText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default MisFacturas;