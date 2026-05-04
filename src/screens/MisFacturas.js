import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { API_URL } from '../config';
import { useGuardia } from '../hooks/useGuardia'; 

const MisFacturas = ({ navigation }) => {
    // 🔥 CONTRATAMOS AL GUARDIA
    const { correoAuth, tokenAuth, verificandoGuardia } = useGuardia(navigation);

    const [facturas, setFacturas] = useState([]);
    const [cargando, setCargando] = useState(true);

    useFocusEffect(
        useCallback(() => {
            if (!verificandoGuardia && correoAuth && tokenAuth) {
                cargarFacturas(correoAuth, tokenAuth);
            }
        }, [verificandoGuardia, correoAuth, tokenAuth])
    );

    const cargarFacturas = async (emailUsuario, tokenUsuario) => {
        setCargando(true);
        try {
            const formData = new FormData();
            formData.append('action', 'mis_facturas');
            formData.append('email', emailUsuario);
            formData.append('token', tokenUsuario);

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

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
        const idFactura = item.id_factura;
        const numeroFactura = item.numero_factura || 'N/A';
        const fechaEmision = item.fecha_emision || 'Sin fecha';
        const total = item.total || 0;
        const estado = (item.estado || 'PAGADO').toUpperCase();

        let fechaMostrar = fechaEmision;
        if (typeof fechaMostrar === 'string') {
            fechaMostrar = fechaMostrar.split(' ')[0].split('T')[0];
        }

        const isPagada = estado === 'PAGADA' || estado === 'PAGADO';

        return (
            <View style={styles.invoiceCard}>
                <View style={styles.invoiceHeader}>
                    <View>
                        <Text style={styles.label}>NO. DOCUMENTO</Text>
                        <Text style={styles.invoiceNumber}>{numeroFactura}</Text>
                    </View>
                    <View style={[styles.badgeBase, isPagada ? styles.badgePagado : styles.badgeAnulado]}>
                        <Text style={[styles.badgeText, isPagada ? styles.badgePagadoText : styles.badgeAnuladoText]}>
                            {estado}
                        </Text>
                    </View>
                </View>

                <View style={styles.invoiceBody}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>FECHA DE EMISIÓN</Text>
                        <Text style={styles.value}>{fechaMostrar}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.label}>TOTAL LIQUIDADO</Text>
                        <Text style={styles.totalText}>Q {parseFloat(total).toFixed(2)}</Text>
                    </View>
                </View>

                <TouchableOpacity 
                    style={styles.btnDetalle} 
                    onPress={() => navigation.navigate('DetalleFactura', { id_factura: idFactura })}
                >
                    <Text style={styles.btnDetalleText}>📄 VER DETALLE / PDF</Text>
                </TouchableOpacity>
            </View>
        );
    };

    if (verificandoGuardia && facturas.length === 0) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#2c3e50" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Top Bar Carbón Profesional */}
            <View style={styles.topBar}>
                <View style={styles.topBarLeft}>
                    <Image source={require('../../assets/icon.png')} style={styles.brandIconMini} />
                    <Text style={styles.topBarTitle}>Historial de Facturación</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Inicio</Text>
                </TouchableOpacity>
            </View>

            {/* Header con Acento Verde */}
            <View style={styles.headerContainer}>
                <View style={styles.headerAccent} />
                <Text style={styles.mainTitle}>Mis Facturas</Text>
                <Text style={styles.subTitle}>Resumen de transacciones y comprobantes electrónicos</Text>
            </View>

            {cargando ? (
                <ActivityIndicator size="large" color="#2c3e50" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={facturas}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                    renderItem={renderFactura}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>🧾</Text>
                            <Text style={styles.emptyTitle}>No hay comprobantes registrados</Text>
                            <Text style={styles.emptySub}>Tus facturas aparecerán aquí una vez que completes el pago de un servicio o reserva.</Text>
                            <TouchableOpacity style={styles.btnComprar} onPress={() => navigation.navigate('Reservas')}>
                                <Text style={styles.btnComprarText}>EXPLORAR VUELOS</Text>
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
    
    // Top Bar Carbón
    topBar: { backgroundColor: '#2c3e50', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, elevation: 5 },
    topBarLeft: { flexDirection: 'row', alignItems: 'center' },
    brandIconMini: { width: 30, height: 30, borderRadius: 6, marginRight: 10, backgroundColor: 'white' },
    topBarTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    btnVolver: { borderColor: '#bdc3c7', borderWidth: 1, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
    btnVolverText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    
    // Header
    headerContainer: { alignItems: 'center', marginVertical: 30, paddingHorizontal: 20 },
    headerAccent: { width: 60, height: 5, backgroundColor: '#00695c', borderRadius: 10, marginBottom: 15 },
    mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50', letterSpacing: -0.5 },
    subTitle: { color: '#6c757d', fontSize: 11, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1, marginTop: 5, fontWeight: '800' },
    
    // Tarjeta de Factura
    invoiceCard: { backgroundColor: 'white', borderRadius: 15, padding: 25, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 3, borderWidth: 1, borderColor: '#edf2f9' },
    invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#f1f3f5', paddingBottom: 15, marginBottom: 20 },
    
    label: { fontSize: 10, color: '#6c757d', fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 },
    invoiceNumber: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', fontFamily: 'monospace' },
    
    // Badges dinámicos
    badgeBase: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
    badgeText: { fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    
    badgePagado: { backgroundColor: '#e0f2f1' },
    badgePagadoText: { color: '#00695c' },
    badgeAnulado: { backgroundColor: '#ffebee' },
    badgeAnuladoText: { color: '#e74c3c' },
    
    invoiceBody: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    value: { fontSize: 14, fontWeight: 'bold', color: '#6c757d' },
    totalText: { fontSize: 18, fontWeight: '900', color: '#2c3e50' },
    
    // Botón Ver Detalle (Estilo Aurora View)
    btnDetalle: { borderColor: '#0d47a1', borderWidth: 1.5, borderRadius: 25, paddingVertical: 12, alignItems: 'center' },
    btnDetalleText: { color: '#0d47a1', fontWeight: '800', fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
    
    // Estado Vacío
    emptyContainer: { alignItems: 'center', marginTop: 30, paddingHorizontal: 20 },
    emptyEmoji: { fontSize: 60, opacity: 0.25, marginBottom: 15 },
    emptyTitle: { fontSize: 16, fontWeight: '900', color: '#6c757d', marginTop: 10, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
    emptySub: { color: '#94a3b8', marginBottom: 25, textAlign: 'center', fontSize: 13, marginTop: 10 },
    btnComprar: { backgroundColor: '#2c3e50', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 25, shadowColor: '#000', shadowOpacity: 0.1, elevation: 3 },
    btnComprarText: { color: 'white', fontWeight: '900', fontSize: 12, letterSpacing: 1 }
});

export default MisFacturas;