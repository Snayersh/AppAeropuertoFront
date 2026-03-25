import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config'



const Pagos = ({ route, navigation }) => {
    // Si viene desde otra pantalla con un código de reserva, lo atrapamos
    const codigoInicial = route.params?.codigo || '';

    const [correoUsuario, setCorreoUsuario] = useState('');
    const [cargando, setCargando] = useState(false);
    
    // Formulario
    const [codigoReserva, setCodigoReserva] = useState(codigoInicial);
    const [tarjeta, setTarjeta] = useState('');
    const [vencimiento, setVencimiento] = useState('');
    const [cvv, setCvv] = useState('');
    const [nombreTitular, setNombreTitular] = useState('');

    // Estado Post-Pago
    const [pagado, setPagado] = useState(false);
    const [infoFactura, setInfoFactura] = useState('');

    useEffect(() => {
        obtenerSesion();
    }, []);

    const obtenerSesion = async () => {
        const email = await AsyncStorage.getItem('UserEmail');
        if (!email) {
            navigation.replace('Login');
        } else {
            setCorreoUsuario(email);
        }
    };

    // Formateadores en tiempo real (Igual a tu JavaScript en la web)
    const handleTarjetaChange = (text) => {
        const clean = text.replace(/[^\d]/g, '');
        const formatted = clean.replace(/(.{4})/g, '$1 ').trim();
        setTarjeta(formatted.substring(0, 19)); // Máximo 16 números + 3 espacios
    };

    const handleVencimientoChange = (text) => {
        const clean = text.replace(/[^\d]/g, '');
        let formatted = clean;
        if (clean.length > 2) {
            formatted = `${clean.substring(0, 2)}/${clean.substring(2, 4)}`;
        }
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
            // Nota: Aquí llamamos al endpoint de pagos que corregimos arriba
            const response = await axios.post(`${API_URL}/pagos/procesar`, {
                codigo_reserva: codigoReserva,
                correo_usuario: correoUsuario
            });

            if (response.data.success) {
                setInfoFactura(response.data.factura);
                setPagado(true); 
                if (response.data.success) {
                setInfoFactura(response.data.factura);
                setPagado(true); 
                // 🔥 Limpieza de seguridad:
                setTarjeta('');
                setVencimiento('');
                setCvv('');
            }// Cambiamos la vista a la de éxito
            }
        } catch (error) {
            const msj = error.response?.data?.mensaje || "Error al conectar con la pasarela bancaria.";
            Alert.alert("Error de Pago", msj);
        } finally {
            setCargando(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>💳 Pasarela de Pagos</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Volver</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <View style={styles.paymentCard}>
                    
                    {!pagado ? (
                        /* --- VISTA DEL FORMULARIO DE PAGO --- */
                        <>
                            <View style={styles.headerTitle}>
                                <Text style={styles.mainTitle}>Completa tu Compra</Text>
                                <Text style={styles.subTitle}>Ingresa tu código de reserva y datos.</Text>
                            </View>

                            <Text style={styles.sectionTitle}>1. DATOS DE LA RESERVA</Text>
                            <Text style={styles.label}>Código de Reserva (Localizador)</Text>
                            <TextInput 
                                style={[styles.input, { textTransform: 'uppercase' }]} 
                                placeholder="Ej: B-A1B2C"
                                autoCapitalize="characters"
                                value={codigoReserva}
                                onChangeText={setCodigoReserva}
                            />

                            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>2. MÉTODO DE PAGO</Text>
                            
                            {/* Tarjeta de Crédito Visual */}
                            <View style={styles.ccBox}>
                                <View style={styles.ccChip} />
                                
                                <Text style={styles.ccLabel}>Número de Tarjeta</Text>
                                <TextInput 
                                    style={styles.ccInput} 
                                    placeholder="0000 0000 0000 0000" 
                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                    keyboardType="numeric"
                                    value={tarjeta}
                                    onChangeText={handleTarjetaChange}
                                />

                                <View style={styles.ccRow}>
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <Text style={styles.ccLabel}>Vencimiento</Text>
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

                                <Text style={styles.ccLabel}>Nombre en la tarjeta</Text>
                                <TextInput 
                                    style={[styles.ccInput, { textTransform: 'uppercase' }]} 
                                    placeholder="JUAN PEREZ" 
                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                    autoCapitalize="characters"
                                    value={nombreTitular}
                                    onChangeText={setNombreTitular}
                                />
                            </View>

                            <TouchableOpacity 
                                style={styles.btnSuccess} 
                                onPress={procesarPago}
                                disabled={cargando}
                            >
                                {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSuccessText}>Procesar Pago Seguro 🔒</Text>}
                            </TouchableOpacity>
                        </>
                    ) : (
                        /* --- VISTA DE ÉXITO --- */
                        <View style={styles.successContainer}>
                            <Text style={styles.successIcon}>✅</Text>
                            <Text style={styles.successTitle}>¡Pago Procesado!</Text>
                            <Text style={styles.successSub}>Tus boletos están confirmados.</Text>

                            <View style={styles.receiptBox}>
                                <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>Localizador:</Text>
                                    <Text style={styles.receiptValue}>{codigoReserva}</Text>
                                </View>
                                <View style={[styles.receiptRow, { borderBottomWidth: 0, marginTop: 10 }]}>
                                    <Text style={styles.receiptLabel}>Factura Generada:</Text>
                                    <Text style={[styles.receiptValue, { color: '#0d47a1' }]}>{infoFactura}</Text>
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={[styles.btnSuccess, { marginTop: 30 }]} 
                                onPress={() => navigation.navigate('MisBoletos')}
                            >
                                <Text style={styles.btnSuccessText}>Ir a Mis Boletos 🎫</Text>
                            </TouchableOpacity>
                        </View>
                    )}

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
    
    paymentCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderTopWidth: 5, borderTopColor: '#2e7d32', marginBottom: 30 },
    headerTitle: { alignItems: 'center', marginBottom: 25 },
    mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#2e7d32' },
    subTitle: { color: '#666', fontSize: 14, marginTop: 5 },
    
    sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#81c784', marginBottom: 10 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#6c757d', marginBottom: 8 },
    input: { height: 50, backgroundColor: '#f8f9fa', borderRadius: 8, borderWidth: 1, borderColor: '#ced4da', paddingHorizontal: 15, fontSize: 16, color: '#333' },
    
    // Diseño Tarjeta de Crédito
    ccBox: { backgroundColor: '#1e3c72', borderRadius: 15, padding: 20, marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.2, elevation: 5 },
    ccChip: { width: 45, height: 30, backgroundColor: '#ffd54f', borderRadius: 5, marginBottom: 15, opacity: 0.8 },
    ccLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 5 },
    ccInput: { backgroundColor: 'transparent', color: 'white', fontSize: 18, fontWeight: 'bold', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)', marginBottom: 15 },
    ccRow: { flexDirection: 'row', justifyContent: 'space-between' },

    btnSuccess: { backgroundColor: '#2e7d32', height: 55, borderRadius: 10, alignItems: 'center', justifyContent: 'center', shadowColor: '#2e7d32', shadowOpacity: 0.3, elevation: 5 },
    btnSuccessText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    // Vista de Éxito
    successContainer: { alignItems: 'center', paddingVertical: 20 },
    successIcon: { fontSize: 60, marginBottom: 10 },
    successTitle: { fontSize: 24, fontWeight: 'bold', color: '#2e7d32' },
    successSub: { color: '#666', fontSize: 16, marginBottom: 20 },
    receiptBox: { width: '100%', backgroundColor: '#f8f9fa', borderRadius: 10, borderWidth: 2, borderColor: '#dee2e6', borderStyle: 'dashed', padding: 20 },
    receiptRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#dee2e6', paddingBottom: 10 },
    receiptLabel: { color: '#6c757d', fontWeight: 'bold', fontSize: 16 },
    receiptValue: { color: '#333', fontWeight: 'bold', fontSize: 18 }
});

export default Pagos;