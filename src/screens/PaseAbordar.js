import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, FlatList, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { API_URL } from '../config';
import { useGuardia } from '../hooks/useGuardia'; 

const PaseAbordar = ({ route, navigation }) => {
    // 🔥 CONTRATAMOS AL GUARDIA
    const { correoAuth, tokenAuth, verificandoGuardia } = useGuardia(navigation);

    const { codigo } = route.params || {}; 
    const [pases, setPases] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    useFocusEffect(
        useCallback(() => {
            if (!verificandoGuardia && correoAuth && tokenAuth) {
                if (codigo) {
                    cargarDatosPase(codigo, correoAuth, tokenAuth);
                } else {
                    setErrorMsg("No se proporcionó un localizador válido.");
                    setCargando(false);
                }
            }
        }, [verificandoGuardia, correoAuth, tokenAuth, codigo])
    );

    const cargarDatosPase = async (codigoBuscar, correoBuscar, tokenBuscar) => {
        setCargando(true);
        setErrorMsg('');
        try {
            const formData = new FormData();
            formData.append('action', 'pase_abordar');
            formData.append('codigoReserva', codigoBuscar);
            formData.append('email', correoBuscar);
            formData.append('token', tokenBuscar);

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success && response.data.pases) {
                setPases(response.data.pases);
            } else {
                setErrorMsg(response.data.mensaje || "No se encontró el pase. Verifica que esté pagado.");
                setPases([]);
            }
        } catch (error) {
            console.log("Error cargando pase:", error);
            setErrorMsg("Error de conexión al generar el pase de abordar.");
            setPases([]);
        } finally {
            setCargando(false);
        }
    };

    const renderPase = ({ item }) => {
        const data = Array.isArray(item) ? item[0] : item;

        const pasajero = data.pasajero || 'Desconocido';
        const vuelo = data.codigo_vuelo || '---';
        const origenIata = data.origen_iata || 'ORG';
        const origenCiudad = data.origen_ciudad || 'Origen';
        const destinoIata = data.destino_iata || 'DST';
        const destinoCiudad = data.destino_ciudad || 'Destino';
        
        let fecha = data.fecha_salida || 'Sin fecha';
        if (typeof fecha === 'string' && fecha.includes('T')) fecha = fecha.split('T')[0];

        const hora = data.hora_salida || '--:--';
        const clase = data.clase_cabina || 'N/A';
        const asiento = data.asiento || 'TBD';
        
        const localizador = data.codigo_boleto || codigo || '---';

        return (
            <View style={styles.boardingPass}>
                
                {/* LADO IZQUIERDO: DETALLES PRINCIPALES */}
                <View style={styles.bpLeft}>
                    <View style={styles.headerPass}>
                        <View style={styles.brandPass}>
                            <Image source={require('../../assets/icon.png')} style={styles.brandIcon} />
                            <Text style={styles.brandText}>LA AURORA AIRLINES</Text>
                        </View>
                        <View style={styles.badgePass}>
                            <Text style={styles.badgeTextPass}>BOARDING PASS</Text>
                        </View>
                    </View>

                    <View style={styles.rowTop}>
                        <View style={{ flex: 2 }}>
                            <Text style={styles.lbl}>PASAJERO / PASSENGER</Text>
                            <Text style={styles.valNom}>{pasajero.toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={styles.lbl}>VUELO / FLIGHT</Text>
                            <Text style={styles.valBlue}>{vuelo}</Text>
                        </View>
                    </View>

                    <View style={styles.iataContainer}>
                        <View style={styles.cityBlock}>
                            <Text style={styles.iataCode}>{origenIata}</Text>
                            <Text style={styles.cityName}>{origenCiudad}</Text>
                        </View>
                        <Text style={styles.flightPathIcon}>✈️</Text>
                        <View style={styles.cityBlock}>
                            <Text style={styles.iataCode}>{destinoIata}</Text>
                            <Text style={styles.cityName}>{destinoCiudad}</Text>
                        </View>
                    </View>

                    <View style={styles.bottomDetailsRow}>
                        <View style={styles.detailBox}>
                            <Text style={styles.lbl}>FECHA / DATE</Text>
                            <Text style={styles.valSmall}>{fecha}</Text>
                        </View>
                        <View style={styles.detailBox}>
                            <Text style={styles.lbl}>SALIDA / TIME</Text>
                            <Text style={styles.valSmall}>{hora}</Text>
                        </View>
                        <View style={styles.detailBox}>
                            <Text style={styles.lbl}>CLASE / CLASS</Text>
                            <Text style={styles.valBlueSmall}>{clase}</Text>
                        </View>
                        <View style={styles.detailBoxEnd}>
                            <Text style={styles.lbl}>ASIENTO / SEAT</Text>
                            <Text style={styles.seatBadge}>{asiento}</Text>
                        </View>
                    </View>
                </View>

                {/* LADO DERECHO: STUB (TALÓN) */}
                <View style={styles.bpRight}>
                    {/* Muescas decorativas simuladas */}
                    <View style={styles.notchTop} />
                    <View style={styles.notchBottom} />

                    <View style={{ width: '100%' }}>
                        <Text style={styles.lbl}>BOARDING STUB</Text>
                        <Text style={styles.stubBrand}>LA AURORA GUA</Text>

                        <Text style={[styles.lbl, { marginTop: 15 }]}>LOCALIZADOR / PNR</Text>
                        <Text style={styles.valLocalizador}>{localizador}</Text>

                        <Text style={[styles.lbl, { marginTop: 10 }]}>PASAJERO / PASSENGER</Text>
                        <Text style={styles.valPassSmall} numberOfLines={1} ellipsizeMode="tail">{pasajero.toUpperCase()}</Text>

                        <View style={styles.stubDetailsRow}>
                            <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#edf2f9' }}>
                                <Text style={styles.lbl}>VUELO</Text>
                                <Text style={styles.valStubBlue}>{vuelo}</Text>
                            </View>
                            <View style={{ flex: 1, paddingLeft: 10 }}>
                                <Text style={styles.lbl}>ASIENTO</Text>
                                <Text style={styles.valStubRed}>{asiento}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.barcodeBox}>
                        {/* Simulación visual de código de barras para React Native */}
                        <Text style={styles.barcodeText}>|||| ||| | ||| || || |</Text>
                        <Text style={styles.barcodeNumber}>*{localizador}*</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Top Bar Carbón */}
            <View style={styles.topBar}>
                <View style={styles.topBarLeft}>
                    <Image source={require('../../assets/icon.png')} style={styles.brandIconMini} />
                    <Text style={styles.topBarTitle}>Documento de Abordaje</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Regresar</Text>
                </TouchableOpacity>
            </View>

            {verificandoGuardia || cargando ? (
                <ActivityIndicator size="large" color="#2c3e50" style={{ marginTop: 50 }} />
            ) : errorMsg ? (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                    <TouchableOpacity style={styles.btnError} onPress={() => navigation.goBack()}>
                        <Text style={styles.btnErrorText}>← Regresar al Historial</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={pases}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
                    renderItem={renderPase}
                    ListHeaderComponent={
                        <Text style={styles.instrucciones}>Presenta este pase digital en los filtros de seguridad y puerta de embarque.</Text>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fc' }, // Fondo neutro suave
    
    // Top Bar
    topBar: { backgroundColor: '#2c3e50', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, elevation: 5 },
    topBarLeft: { flexDirection: 'row', alignItems: 'center' },
    brandIconMini: { width: 30, height: 30, borderRadius: 6, marginRight: 10, backgroundColor: 'white' },
    topBarTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    btnVolver: { borderColor: '#bdc3c7', borderWidth: 1, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
    btnVolverText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    
    instrucciones: { textAlign: 'center', color: '#6c757d', marginBottom: 25, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '800' },
    
    // Alertas Error
    errorBox: { margin: 20, padding: 25, backgroundColor: 'white', borderRadius: 15, alignItems: 'center', borderLeftWidth: 5, borderLeftColor: '#e74c3c', shadowColor: '#000', shadowOpacity: 0.05, elevation: 3 },
    errorText: { color: '#e74c3c', fontWeight: 'bold', textAlign: 'center', marginBottom: 20, fontSize: 14 },
    btnError: { backgroundColor: '#e74c3c', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25 },
    btnErrorText: { color: 'white', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' },
    
    // Tarjeta Boarding Pass
    boardingPass: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 20, marginBottom: 30, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 15, elevation: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#edf2f9' },
    
    // Lado Izquierdo
    bpLeft: { flex: 2.2, padding: 20, borderRightWidth: 2, borderRightColor: '#bdc3c7', borderStyle: 'dashed', backgroundColor: 'white' },
    
    headerPass: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#2c3e50', paddingBottom: 15, marginBottom: 20 },
    brandPass: { flexDirection: 'row', alignItems: 'center' },
    brandIcon: { width: 22, height: 22, marginRight: 8 },
    brandText: { color: '#2c3e50', fontSize: 14, fontWeight: '900', letterSpacing: -0.5 },
    
    badgePass: { backgroundColor: '#2c3e50', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
    badgeTextPass: { color: 'white', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
    
    lbl: { fontSize: 9, color: '#6c757d', textTransform: 'uppercase', fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
    valNom: { fontSize: 18, fontWeight: '900', color: '#2c3e50' },
    valBlue: { fontSize: 18, fontWeight: '900', color: '#0d47a1' },
    
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    
    iataContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 25 },
    cityBlock: { alignItems: 'center', flex: 1 },
    iataCode: { fontSize: 40, fontWeight: '900', color: '#0d47a1', letterSpacing: -2 },
    cityName: { fontSize: 10, color: '#6c757d', fontWeight: '800', textTransform: 'uppercase', marginTop: 2 },
    flightPathIcon: { fontSize: 28, color: '#bdc3c7', marginHorizontal: 5 },
    
    bottomDetailsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#edf2f9', paddingTop: 15, justifyContent: 'space-between', alignItems: 'center' },
    detailBox: { flex: 1 },
    detailBoxEnd: { flex: 1, alignItems: 'flex-end' },
    valSmall: { fontSize: 12, fontWeight: 'bold', color: '#2c3e50' },
    valBlueSmall: { fontSize: 12, fontWeight: 'bold', color: '#0d47a1' },
    seatBadge: { fontSize: 24, fontWeight: '900', color: '#e74c3c' },
    
    // Lado Derecho (Stub)
    bpRight: { flex: 1, backgroundColor: '#fcfdfe', padding: 15, alignItems: 'center', justifyContent: 'space-between', position: 'relative' },
    
    // Muescas de ticket (Absolute positioning to overlay the dashed line)
    notchTop: { position: 'absolute', top: -11, left: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: '#f8f9fc', zIndex: 10 },
    notchBottom: { position: 'absolute', bottom: -11, left: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: '#f8f9fc', zIndex: 10 },
    
    stubBrand: { fontWeight: '900', color: '#0d47a1', fontSize: 11, marginBottom: 10 },
    valLocalizador: { fontSize: 20, fontWeight: '900', color: '#2c3e50', letterSpacing: 1 },
    valPassSmall: { fontSize: 11, fontWeight: 'bold', color: '#2c3e50' },
    
    stubDetailsRow: { flexDirection: 'row', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#edf2f9' },
    valStubBlue: { fontSize: 13, fontWeight: '900', color: '#0d47a1' },
    valStubRed: { fontSize: 18, fontWeight: '900', color: '#e74c3c' },
    
    barcodeBox: { width: '100%', alignItems: 'center', marginTop: 15 },
    barcodeText: { fontSize: 24, color: '#2c3e50', letterSpacing: -1.5, fontWeight: 'bold', transform: [{ scaleY: 2.5 }], marginBottom: 10 },
    barcodeNumber: { fontSize: 10, color: '#2c3e50', letterSpacing: 2, fontWeight: 'bold' }
});

export default PaseAbordar;