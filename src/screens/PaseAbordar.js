import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { API_URL } from '../config';
import { useGuardia } from '../hooks/useGuardia'; // 🔥 GUARDIA IMPORTADO

const PaseAbordar = ({ route, navigation }) => {
    // 🔥 CONTRATAMOS AL GUARDIA
    const { correoAuth, tokenAuth, verificandoGuardia } = useGuardia(navigation);

    const { codigo } = route.params || {}; // Solo necesitamos el código de la ruta ahora
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
            const response = await axios.post(API_URL, {
                accion: 'obtener_pase_abordar',
                codigo: codigoBuscar,
                correo: correoBuscar, // 🔥 El guardia asegura que sea tu correo
                token: tokenBuscar
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

        const pasajero = data.PASAJERO || data.Pasajero || data.pasajero || 'Desconocido';
        const vuelo = data.CODIGO_VUELO || data.CODIGOVUELO || data.codigo_vuelo || '---';
        const origenIata = data.ORIGEN_IATA || data.ORIGENIATA || data.origen_iata || 'ORG';
        const origenCiudad = data.ORIGEN_CIUDAD || data.ORIGENCIUDAD || data.origen_ciudad || 'Origen';
        const destinoIata = data.DESTINO_IATA || data.DESTINOIATA || data.destino_iata || 'DST';
        const destinoCiudad = data.DESTINO_CIUDAD || data.DESTINOCIUDAD || data.destino_ciudad || 'Destino';
        
        let fecha = data.FECHA || data.FECHASALIDA || data.FECHA_SALIDA || data.fecha || 'Sin fecha';
        if (typeof fecha === 'string' && fecha.includes('T')) fecha = fecha.split('T')[0];

        const hora = data.HORA_SALIDA || data.HORASALIDA || data.hora_salida || '--:--';
        const clase = data.CLASE_CABINA || data.CLASECABINA || data.clase_cabina || 'N/A';
        const asiento = data.ASIENTO || data.asiento || 'TBD';
        
        const localizador = data.CODIGO_BOLETO || data.CODIGOBOLETO || data.CODIGORESERVA || codigo || '---';

        return (
            <View style={styles.boardingPass}>
                <View style={styles.bpLeft}>
                    <View style={styles.header}>
                        <Text style={styles.headerLogo}>✈️ La Aurora</Text>
                        <View style={styles.badgePass}>
                            <Text style={styles.badgeTextPass}>BOARDING PASS</Text>
                        </View>
                    </View>

                    <View style={styles.rowTop}>
                        <View style={{ flex: 2 }}>
                            <Text style={styles.lbl}>Pasajero</Text>
                            <Text style={styles.valNom}>{pasajero.toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={styles.lbl}>Vuelo</Text>
                            <Text style={styles.valBlue}>{vuelo}</Text>
                        </View>
                    </View>

                    <View style={styles.routeContainer}>
                        <View style={styles.cityBlock}>
                            <Text style={styles.iataCode}>{origenIata}</Text>
                            <Text style={styles.cityName}>{origenCiudad}</Text>
                        </View>
                        <Text style={styles.planeIconCenter}>✈️</Text>
                        <View style={styles.cityBlock}>
                            <Text style={styles.iataCode}>{destinoIata}</Text>
                            <Text style={styles.cityName}>{destinoCiudad}</Text>
                        </View>
                    </View>

                    <View style={styles.bottomDetailsRow}>
                        <View style={styles.detailBox}>
                            <Text style={styles.lbl}>Fecha</Text>
                            <Text style={styles.valSmall}>{fecha}</Text>
                        </View>
                        <View style={styles.detailBox}>
                            <Text style={styles.lbl}>Hora</Text>
                            <Text style={styles.valSmall}>{hora}</Text>
                        </View>
                        <View style={styles.detailBox}>
                            <Text style={styles.lbl}>Clase</Text>
                            <Text style={styles.valBlueSmall}>{clase}</Text>
                        </View>
                        <View style={styles.detailBox}>
                            <Text style={styles.lbl}>Asiento</Text>
                            <Text style={styles.valRed}>{asiento}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.bpRight}>
                    <Text style={styles.lblRight}>Localizador</Text>
                    <Text style={styles.valLocalizador}>{localizador}</Text>

                    <Text style={[styles.lblRight, { marginTop: 15 }]}>Asiento</Text>
                    <Text style={styles.valAsientoRight}>{asiento}</Text>

                    <View style={styles.barcodeBox}>
                        <Text style={styles.barcodeText}>||| || ||| | ||| || |</Text>
                        <Text style={styles.barcodeNumber}>{localizador}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>🎟️ Pase de Abordar</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Volver</Text>
                </TouchableOpacity>
            </View>

            {verificandoGuardia || cargando ? (
                <ActivityIndicator size="large" color="#0d47a1" style={{ marginTop: 50 }} />
            ) : errorMsg ? (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                    <TouchableOpacity style={styles.btnError} onPress={() => navigation.goBack()}>
                        <Text style={styles.btnErrorText}>Regresar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={pases}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
                    renderItem={renderPase}
                    ListHeaderComponent={
                        <Text style={styles.instrucciones}>Presenta este pase digital al momento de abordar el avión.</Text>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#e9ecef' },
    topBar: { backgroundColor: '#0d47a1', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    topBarTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    btnVolver: { borderColor: 'white', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    btnVolverText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    instrucciones: { textAlign: 'center', color: '#666', marginBottom: 20, fontStyle: 'italic' },
    errorBox: { margin: 20, padding: 20, backgroundColor: '#ffebee', borderRadius: 10, alignItems: 'center' },
    errorText: { color: '#c62828', fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
    btnError: { backgroundColor: '#c62828', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5 },
    btnErrorText: { color: 'white', fontWeight: 'bold' },
    boardingPass: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 15, marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 5, overflow: 'hidden' },
    bpLeft: { flex: 2.5, padding: 20, borderRightWidth: 2, borderRightColor: '#ccc', borderStyle: 'dashed' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#0d47a1', paddingBottom: 10, marginBottom: 15 },
    headerLogo: { color: '#0d47a1', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    badgePass: { backgroundColor: '#333', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5 },
    badgeTextPass: { color: 'white', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    lbl: { fontSize: 10, color: '#777', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 2 },
    valNom: { fontSize: 16, fontWeight: 'bold', color: '#222' },
    valBlue: { fontSize: 18, fontWeight: 'bold', color: '#0d47a1' },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    routeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa', padding: 15, borderRadius: 10, marginBottom: 20 },
    cityBlock: { alignItems: 'center', flex: 1 },
    iataCode: { fontSize: 32, fontWeight: '900', color: '#0d47a1', lineHeight: 35 },
    cityName: { fontSize: 12, color: '#555', marginTop: 5 },
    planeIconCenter: { fontSize: 24, color: '#ccc', marginHorizontal: 10 },
    bottomDetailsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15, justifyContent: 'space-between' },
    detailBox: { alignItems: 'flex-start' },
    valSmall: { fontSize: 13, fontWeight: 'bold', color: '#333' },
    valBlueSmall: { fontSize: 13, fontWeight: 'bold', color: '#0d47a1' },
    valRed: { fontSize: 18, fontWeight: 'bold', color: '#d32f2f' },
    bpRight: { flex: 1, backgroundColor: '#f8f9fa', padding: 15, alignItems: 'center', justifyContent: 'center' },
    lblRight: { fontSize: 10, color: '#777', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 2 },
    valLocalizador: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    valAsientoRight: { fontSize: 24, fontWeight: 'bold', color: '#d32f2f' },
    barcodeBox: { marginTop: 20, alignItems: 'center' },
    barcodeText: { fontSize: 20, color: '#333', letterSpacing: -1, fontWeight: 'bold', transform: [{ scaleY: 2 }] },
    barcodeNumber: { fontSize: 10, color: '#666', marginTop: 10, letterSpacing: 2 }
});

export default PaseAbordar;