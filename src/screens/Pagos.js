import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';
import { API_URL } from '../config';
import { useGuardia } from '../hooks/useGuardia'; 

const Pagos = ({ route, navigation }) => {
    // 🔥 CONTRATAMOS AL GUARDIA
    const { correoAuth, tokenAuth, verificandoGuardia } = useGuardia(navigation);

    const codigoInicial = route.params?.codigo || '';
    const [cargando, setCargando] = useState(false);
    
    const [codigoReserva, setCodigoReserva] = useState(codigoInicial);
    const [tarjeta, setTarjeta] = useState('');
    const [vencimiento, setVencimiento] = useState('');
    const [cvv, setCvv] = useState('');
    const [nombreTitular, setNombreTitular] = useState('');

    const [pagado, setPagado] = useState(false);
    const [infoFactura, setInfoFactura] = useState('');

    const handleTarjetaChange = (text) => {
        const clean = text.replace(/[^\d]/g, '');
        const formatted = clean.replace(/(.{4})/g, '$1 ').trim();
        setTarjeta(formatted.substring(0, 19)); 
    };

    const handleVencimientoChange = (text) => {
        const clean = text.replace(/[^\d]/g, '');
        let formatted = clean;
        if (clean.length > 2) formatted = `${clean.substring(0, 2)}/${clean.substring(2, 4)}`;
        setVencimiento(formatted.substring(0, 5));
    };

    const handleCVVChange = (text) => {
        const clean = text.replace(/[^\d]/g, '');
        setCvv(clean.substring(0, 4));
    };

   const procesarPago = async () => {
        if (!codigoReserva || !tarjeta || !vencimiento || !cvv || !nombreTitular) {
            Alert.alert("Atención", "Por favor completa todos los datos de la tarjeta y el localizador.");
            return;
        }

        setCargando(true);
        try {
            const formData = new FormData();
            formData.append('action', 'procesar_pago');
            
            // 🔥 AQUÍ ESTÁ LA MAGIA: Le mandamos los nombres EXACTOS que espera tu VB.NET
            formData.append('codigoReserva', String(codigoReserva).trim()); 
            formData.append('correo', String(correoAuth)); // VB.NET espera 'correo'
            formData.append('email', String(correoAuth));  // Por si el guardia valida sesión con 'email'
            formData.append('idMetodoPago', '1');          // VB.NET espera 'idMetodoPago'
            formData.append('token', String(tokenAuth));

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                setInfoFactura(response.data.factura);
                setPagado(true); 
                setTarjeta('');
                setVencimiento('');
                setCvv('');
            } else {
                Alert.alert("Error de Pago", response.data.mensaje || "No se pudo procesar el pago.");
            }
        } catch (error) {
            const msj = error.response?.data?.mensaje || "Error al conectar con la pasarela bancaria.";
            Alert.alert("Error de Conexión", msj);
        } finally {
            setCargando(false);
        }
    };

    if (verificandoGuardia) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#0d47a1" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={styles.container}
        >
            {/* Top Bar Carbón Profesional */}
            <View style={styles.topBar}>
                <View style={styles.topBarLeft}>
                    <Image source={require('../../assets/icon.png')} style={styles.brandIconMini} />
                    <Text style={styles.topBarTitle}>Pasarela de Pagos</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Inicio</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                <View style={styles.paymentCard}>
                    {!pagado ? (
                        <>
                            {/* Header de la Tarjeta */}
                            <View style={styles.headerContainer}>
                                <View style={styles.headerAccent} />
                                <Text style={styles.mainTitle}>Completa tu Compra</Text>
                                <Text style={styles.subTitle}>Transacción protegida de extremo a extremo</Text>
                            </View>

                            <Text style={styles.sectionSubtitle}>1. DATOS DE LA RESERVA</Text>
                            <View style={{ marginBottom: 25 }}>
                                <Text style={styles.labelCustom}>CÓDIGO DE RESERVA (LOCALIZADOR)</Text>
                                <TextInput 
                                    style={[styles.input, { textTransform: 'uppercase', color: '#0d47a1', fontWeight: 'bold', letterSpacing: 2 }]} 
                                    placeholder="EJ: B-A1B2C" 
                                    placeholderTextColor="#adb5bd"
                                    autoCapitalize="characters" 
                                    value={codigoReserva} 
                                    onChangeText={setCodigoReserva} 
                                />
                            </View>

                            <Text style={styles.sectionSubtitle}>2. MÉTODO DE PAGO</Text>
                            
                            {/* Tarjeta Visual */}
                            <View style={styles.ccBox}>
                                <View style={styles.ccChip} />
                                
                                <View style={{ marginBottom: 15 }}>
                                    <Text style={styles.ccLabel}>NÚMERO DE TARJETA</Text>
                                    <TextInput 
                                        style={styles.ccInput} 
                                        placeholder="0000 0000 0000 0000" 
                                        placeholderTextColor="rgba(255,255,255,0.4)" 
                                        keyboardType="numeric" 
                                        value={tarjeta} 
                                        onChangeText={handleTarjetaChange} 
                                    />
                                </View>

                                <View style={styles.ccRow}>
                                    <View style={{ flex: 1, marginRight: 15 }}>
                                        <Text style={styles.ccLabel}>VENCIMIENTO</Text>
                                        <TextInput 
                                            style={styles.ccInput} 
                                            placeholder="MM/YY" 
                                            placeholderTextColor="rgba(255,255,255,0.4)" 
                                            keyboardType="numeric" 
                                            value={vencimiento} 
                                            onChangeText={handleVencimientoChange} 
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.ccLabel}>CVV</Text>
                                        <TextInput 
                                            style={styles.ccInput} 
                                            placeholder="123" 
                                            placeholderTextColor="rgba(255,255,255,0.4)" 
                                            keyboardType="numeric" 
                                            secureTextEntry 
                                            value={cvv} 
                                            onChangeText={handleCVVChange} 
                                        />
                                    </View>
                                </View>

                                <View style={{ marginTop: 10 }}>
                                    <Text style={styles.ccLabel}>NOMBRE DEL TITULAR</Text>
                                    <TextInput 
                                        style={[styles.ccInput, { textTransform: 'uppercase' }]} 
                                        placeholder="JUAN PEREZ" 
                                        placeholderTextColor="rgba(255,255,255,0.4)" 
                                        autoCapitalize="characters" 
                                        value={nombreTitular} 
                                        onChangeText={setNombreTitular} 
                                    />
                                </View>
                            </View>

                            <TouchableOpacity style={styles.btnAuroraPay} onPress={procesarPago} disabled={cargando}>
                                {cargando ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.btnAuroraPayText}>PROCESAR PAGO SEGURO 🔒</Text>
                                )}
                            </TouchableOpacity>

                            <Text style={styles.footerNote}>
                                Al procesar este pago, aceptas nuestros Términos de Servicio y Políticas de Cancelación.
                            </Text>
                        </>
                    ) : (
                        <View style={styles.successContainer}>
                            <Text style={styles.successIcon}>✅</Text>
                            <Text style={styles.successTitle}>¡Pago Procesado!</Text>
                            <Text style={styles.successSub}>Tus boletos han sido confirmados exitosamente.</Text>

                            <View style={styles.receiptBox}>
                                <View style={styles.receiptRow}>
                                    <Text style={styles.labelCustom}>LOCALIZADOR:</Text>
                                    <Text style={[styles.receiptValue, { color: '#0d47a1', fontSize: 18 }]}>{codigoReserva}</Text>
                                </View>
                                <View style={[styles.receiptRow, { borderBottomWidth: 0, marginTop: 15 }]}>
                                    <Text style={styles.labelCustom}>FACTURA NO:</Text>
                                    <Text style={styles.receiptValue}>{infoFactura}</Text>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.btnAuroraPay} onPress={() => navigation.navigate('MisBoletos')}>
                                <Text style={styles.btnAuroraPayText}>VER MI PASE DE ABORDAR 🎫</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
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
    
    // Main Card
    paymentCard: { backgroundColor: 'white', borderRadius: 15, padding: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 3, borderWidth: 1, borderColor: '#edf2f9', marginBottom: 20 },
    
    // Headers
    headerContainer: { alignItems: 'center', marginBottom: 30 },
    headerAccent: { width: 60, height: 5, backgroundColor: '#0d47a1', borderRadius: 10, marginBottom: 15 },
    mainTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', letterSpacing: -0.5 },
    subTitle: { color: '#6c757d', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 5, fontWeight: 'bold', textAlign: 'center' },
    
    sectionSubtitle: { fontSize: 13, fontWeight: '800', color: '#0d47a1', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 15 },
    labelCustom: { fontSize: 11, fontWeight: '800', color: '#6c757d', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    
    input: { height: 50, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#dee2e6', paddingHorizontal: 15, fontSize: 15 },
    
    // Tarjeta Visual
    ccBox: { backgroundColor: '#2c3e50', borderRadius: 15, padding: 25, marginBottom: 25, shadowColor: '#0d47a1', shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
    ccChip: { width: 45, height: 32, backgroundColor: '#ffb300', borderRadius: 6, marginBottom: 20, opacity: 0.9 },
    ccLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
    ccInput: { color: 'white', fontSize: 18, fontWeight: 'bold', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)' },
    ccRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    
    // Botón Principal
    btnAuroraPay: { backgroundColor: '#0d47a1', height: 55, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: '#0d47a1', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    btnAuroraPayText: { color: 'white', fontWeight: '800', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
    
    footerNote: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 20, paddingHorizontal: 10 },
    
    // Panel de Éxito
    successContainer: { alignItems: 'center', paddingVertical: 10 },
    successIcon: { fontSize: 50, marginBottom: 15 },
    successTitle: { fontSize: 24, fontWeight: 'bold', color: '#198754', marginBottom: 5 },
    successSub: { color: '#6c757d', fontSize: 14, marginBottom: 25, textAlign: 'center' },
    
    receiptBox: { width: '100%', backgroundColor: '#f8f9fc', borderRadius: 12, borderWidth: 1, borderColor: '#edf2f9', borderLeftWidth: 5, borderLeftColor: '#00695c', padding: 20, marginBottom: 30 },
    receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#edf2f9', paddingBottom: 10 },
    receiptValue: { color: '#2c3e50', fontWeight: 'bold', fontSize: 16 }
});

export default Pagos;