import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, FlatList, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { API_URL } from '../config';
import { useGuardia } from '../hooks/useGuardia'; 

const PaseAbordar = ({ route, navigation }) => {
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
        
        // Enviamos los datos tal cual
        formData.append('codigoReserva', String(codigoBuscar).trim());
        formData.append('email', String(correoBuscar).trim());
        formData.append('token', String(tokenBuscar));

        console.log("--- INTENTO DE PETICIÓN ---");
        console.log("Localizador:", codigoBuscar);
        console.log("Correo:", correoBuscar);

        const response = await axios.post(API_URL, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        console.log("Respuesta Completa del Servidor:", response.data);

        if (response.data.success && response.data.pases && response.data.pases.length > 0) {
            setPases(response.data.pases);
        } else {
            // Si llega aquí, es porque el SQL devolvió 0 filas
            setErrorMsg(response.data.mensaje || "Oracle no encontró registros para este localizador y correo.");
        }
    } catch (error) {
        console.log("Error de conexión:", error);
        setErrorMsg("Error de red.");
    } finally {
        setCargando(false);
    }
};
    const renderPase = ({ item }) => {
        // Tu Service suele devolver un objeto, pero por si viene en un array extra:
        const data = Array.isArray(item) ? item[0] : item;

        // Buscamos los campos en mayúsculas (común en Oracle/VB.NET)
        const pasajero = data.PASAJERO || data.pasajero || 'Pasajero';
        const vuelo = data.CODIGO_VUELO || data.codigo_vuelo || '---';
        const origenIata = data.ORIGEN_IATA || data.origen_iata || 'ORG';
        const origenCiudad = data.ORIGEN_CIUDAD || data.origen_ciudad || 'Origen';
        const destinoIata = data.DESTINO_IATA || data.destino_iata || 'DST';
        const destinoCiudad = data.DESTINO_CIUDAD || data.destino_ciudad || 'Destino';
        
        const fecha = data.fecha || 'Sin fecha'; 
        const hora = data.HORA_SALIDA || data.hora_salida || '--:--';
        const clase = data.CLASE_CABINA || data.clase_cabina || 'N/A';
        const asiento = data.ASIENTO || data.asiento || 'S/A';
        const localizador = data.CODIGO_RESERVA || codigo || '---';

        return (
            <View style={styles.boardingPass}>
                {/* PARTE PRINCIPAL DEL PASE */}
                <View style={styles.bpLeft}>
                    <View style={styles.headerPass}>
                        <View style={styles.brandPass}>
                            <Image source={require('../../assets/icon.png')} style={styles.brandIcon} />
                            <Text style={styles.brandText}>LA AURORA</Text>
                        </View>
                        <View style={styles.badgePass}>
                            <Text style={styles.badgeTextPass}>PASE DE ABORDAJE</Text>
                        </View>
                    </View>

                    <View style={styles.rowTop}>
                        <View style={{ flex: 2 }}>
                            <Text style={styles.lbl}>PASAJERO</Text>
                            <Text style={styles.valNom}>{pasajero.toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={styles.lbl}>VUELO</Text>
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
                            <Text style={styles.lbl}>FECHA</Text>
                            <Text style={styles.valSmall}>{fecha}</Text>
                        </View>
                        <View style={styles.detailBox}>
                            <Text style={styles.lbl}>HORA</Text>
                            <Text style={styles.valSmall}>{hora}</Text>
                        </View>
                        <View style={styles.detailBox}>
                            <Text style={styles.lbl}>ASIENTO</Text>
                            <Text style={styles.seatBadge}>{asiento}</Text>
                        </View>
                    </View>
                </View>

                {/* TALÓN DE CONTROL */}
                <View style={styles.bpRight}>
                    <View style={styles.notchTop} />
                    <View style={styles.notchBottom} />
                    <Text style={styles.lbl}>PNR</Text>
                    <Text style={styles.valLocalizador}>{localizador}</Text>
                    <View style={styles.barcodeBox}>
                        <Text style={styles.barcodeText}>|||| ||| ||</Text>
                        <Text style={styles.barcodeNumber}>*{localizador}*</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <View style={styles.topBarLeft}>
                    <Image source={require('../../assets/icon.png')} style={styles.brandIconMini} />
                    <Text style={styles.topBarTitle}>Documento de Vuelo</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Regresar</Text>
                </TouchableOpacity>
            </View>

            {cargando ? (
                <View style={{flex: 1, justifyContent: 'center'}}>
                    <ActivityIndicator size="large" color="#2c3e50" />
                    <Text style={{textAlign: 'center', marginTop: 10}}>Generando pase...</Text>
                </View>
            ) : errorMsg ? (
                <View style={styles.errorBox}>
                    <Text style={styles.errorEmoji}>⚠️</Text>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                    <TouchableOpacity style={styles.btnError} onPress={() => navigation.goBack()}>
                        <Text style={styles.btnErrorText}>Regresar al Historial</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={pases}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={{ padding: 20 }}
                    renderItem={renderPase}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f7f6' },
    topBar: { backgroundColor: '#2c3e50', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    topBarLeft: { flexDirection: 'row', alignItems: 'center' },
    brandIconMini: { width: 30, height: 30, borderRadius: 6, marginRight: 10, backgroundColor: 'white' },
    topBarTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    btnVolver: { borderColor: '#bdc3c7', borderWidth: 1, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
    btnVolverText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    errorBox: { margin: 30, padding: 30, backgroundColor: 'white', borderRadius: 20, alignItems: 'center', elevation: 4 },
    errorEmoji: { fontSize: 50, marginBottom: 15 },
    errorText: { color: '#e74c3c', fontWeight: 'bold', textAlign: 'center', marginBottom: 25 },
    btnError: { backgroundColor: '#2c3e50', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25 },
    btnErrorText: { color: 'white', fontWeight: 'bold' },
    boardingPass: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 20, marginBottom: 30, elevation: 6, overflow: 'hidden' },
    bpLeft: { flex: 2.2, padding: 20, borderRightWidth: 1, borderRightColor: '#bdc3c7', borderStyle: 'dashed' },
    headerPass: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    brandPass: { flexDirection: 'row', alignItems: 'center' },
    brandIcon: { width: 25, height: 25, marginRight: 8 },
    brandText: { fontWeight: '900', color: '#2c3e50' },
    badgePass: { backgroundColor: '#2c3e50', padding: 6, borderRadius: 10 },
    badgeTextPass: { color: 'white', fontSize: 8, fontWeight: 'bold' },
    lbl: { fontSize: 10, color: '#7f8c8d', fontWeight: 'bold' },
    valNom: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50' },
    valBlue: { fontSize: 18, fontWeight: 'bold', color: '#0d47a1' },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    iataContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginVertical: 20 },
    iataCode: { fontSize: 35, fontWeight: 'bold', color: '#0d47a1' },
    cityName: { fontSize: 11, color: '#7f8c8d' },
    cityBlock: { alignItems: 'center' },
    flightPathIcon: { fontSize: 25, color: '#bdc3c7' },
    bottomDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 15 },
    detailBox: { alignItems: 'center' },
    valSmall: { fontSize: 14, fontWeight: 'bold' },
    seatBadge: { fontSize: 22, fontWeight: 'bold', color: '#e74c3c' },
    bpRight: { flex: 1, backgroundColor: '#fafafa', padding: 15, alignItems: 'center', position: 'relative' },
    notchTop: { position: 'absolute', top: -10, left: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#f4f7f6' },
    notchBottom: { position: 'absolute', bottom: -10, left: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#f4f7f6' },
    valLocalizador: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginTop: 5 },
    barcodeBox: { marginTop: 30, alignItems: 'center' },
    barcodeText: { fontSize: 25, color: '#2c3e50', transform: [{ scaleY: 2 }] },
    barcodeNumber: { fontSize: 9, marginTop: 15, fontWeight: 'bold' }
});

export default PaseAbordar;