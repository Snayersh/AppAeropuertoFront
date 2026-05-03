import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { API_URL } from '../config';
import { useGuardia } from '../hooks/useGuardia';

const SIGNALR_URL = API_URL.replace('/ApiMovil.ashx', '');
window.navigator.userAgent = 'react-native';
import signalr from 'react-native-signalr';

const Reservas = ({ navigation }) => {
    const { correoAuth, tokenAuth, verificandoGuardia } = useGuardia(navigation);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const [vuelos, setVuelos] = useState([]);
    const [clases, setClases] = useState([]);
    
    const [vueloElegido, setVueloElegido] = useState('');
    const [claseElegida, setClaseElegida] = useState('');
    const [asientosSeleccionados, setAsientosSeleccionados] = useState([]);
    const [asientosBloqueados, setAsientosBloqueados] = useState([]); 

    const [capacidad, setCapacidad] = useState(0);
    const [ocupados, setOcupados] = useState([]);
    const [mapaVisible, setMapaVisible] = useState(false);

    const proxyRef = useRef(null);
    const vueloElegidoRef = useRef('');

    useEffect(() => {
        vueloElegidoRef.current = vueloElegido;
    }, [vueloElegido]);

    useEffect(() => {
        const connection = signalr.hubConnection(SIGNALR_URL);
        const proxy = connection.createHubProxy('asientosHub');
        proxyRef.current = proxy;

        proxy.on('alguienBloqueoAsiento', (vueloNotificado, asiento) => {
            if (vueloElegidoRef.current.toString() === vueloNotificado.toString()) {
                setAsientosBloqueados(prev => {
                    if (!prev.includes(asiento)) return [...prev, asiento];
                    return prev;
                });
            }
        });

        proxy.on('alguienLiberoAsiento', (vueloNotificado, asiento) => {
            if (vueloElegidoRef.current.toString() === vueloNotificado.toString()) {
                setAsientosBloqueados(prev => prev.filter(a => a !== asiento));
            }
        });

        connection.start().done(() => {
            console.log('📡 SignalR Conectado');
        }).fail((error) => console.log('📡 Error de SignalR:', error));

        return () => connection.stop();
    }, []);

    useEffect(() => {
        if (!verificandoGuardia && correoAuth && tokenAuth) {
            cargarIniciales(correoAuth, tokenAuth);
        }
    }, [verificandoGuardia, correoAuth, tokenAuth]);

    const cargarIniciales = async (email, token) => {
        try {
            // 🔥 Ajuste: FormData para promesas paralelas
            const formVuelos = new FormData();
            formVuelos.append('action', 'vuelos_disponibles');
            formVuelos.append('email', email);
            formVuelos.append('token', token);

            const formClases = new FormData();
            formClases.append('action', 'clases_disponibles');
            formClases.append('email', email);
            formClases.append('token', token);

            const [resVuelos, resClases] = await Promise.all([
                axios.post(API_URL, formVuelos, { headers: { 'Content-Type': 'multipart/form-data' } }),
                axios.post(API_URL, formClases, { headers: { 'Content-Type': 'multipart/form-data' } })
            ]);

            if (resVuelos.data.success) {
                setVuelos(resVuelos.data.vuelos);
            } else {
                Alert.alert("⚠️ Error", resVuelos.data.mensaje || "El servidor rechazó la petición de vuelos.");
            }
            if (resClases.data.success) setClases(resClases.data.clases);
        } catch (error) {
            Alert.alert("🔌 Error de Conexión", "Verifica tu conexión.");
        } finally { setCargando(false); }
    };

    useFocusEffect(
        useCallback(() => {
            let interval;
            if (!verificandoGuardia && vueloElegido && correoAuth && tokenAuth) {
                const sincronizarAsientos = async () => {
                    try {
                        // 🔥 Ajuste: FormData en el motor de sincronización silencioso
                        const formData = new FormData();
                        formData.append('action', 'mapa_asientos');
                        formData.append('idVuelo', vueloElegido);
                        formData.append('email', correoAuth);
                        formData.append('token', tokenAuth);

                        const res = await axios.post(API_URL, formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });

                        if (res.data.success) {
                            const ocupadosDB = res.data.ocupados;
                            setOcupados(ocupadosDB);

                            setAsientosSeleccionados(prevSeleccionados => {
                                const asientosPerdidos = prevSeleccionados.filter(a => ocupadosDB.includes(a.asiento));
                                if (asientosPerdidos.length > 0) {
                                    const nombresPerdidos = asientosPerdidos.map(a => a.asiento).join(', ');
                                    Alert.alert("¡Asiento Ocupado!", `Alguien acaba de pagar el asiento ${nombresPerdidos}.`);
                                    return prevSeleccionados.filter(a => !ocupadosDB.includes(a.asiento));
                                }
                                return prevSeleccionados;
                            });
                        }
                    } catch (error) { console.log("Radar silencioso falló", error); }
                };
                interval = setInterval(sincronizarAsientos, 30000);
            }
            return () => { if (interval) clearInterval(interval); };
        }, [vueloElegido, correoAuth, tokenAuth, verificandoGuardia])
    );

    const handleVueloChange = async (idVuelo) => {
        setVueloElegido(idVuelo);
        setAsientosSeleccionados([]);
        setAsientosBloqueados([]); 
        if (!idVuelo) { setMapaVisible(false); return; }

        setCargando(true);
        try {
            // 🔥 Ajuste: FormData para solicitar el mapa inicial
            const formData = new FormData();
            formData.append('action', 'mapa_asientos');
            formData.append('idVuelo', idVuelo);
            formData.append('email', correoAuth);
            formData.append('token', tokenAuth);

            const resMapa = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (resMapa.data.success) {
                setCapacidad(resMapa.data.capacidad);
                setOcupados(resMapa.data.ocupados);
                setMapaVisible(true);
            } else {
                Alert.alert("Error", resMapa.data.mensaje || "No se pudo cargar el mapa.");
            }
        } catch (error) { 
            Alert.alert("Error de Conexión", "No se pudo comunicar con el servidor."); 
        } finally { setCargando(false); }
    };

    const toggleAsiento = (asiento, idClase, precio) => {
        if (claseElegida !== '' && parseInt(claseElegida) !== idClase) return;

        const yaSeleccionado = asientosSeleccionados.find(a => a.asiento === asiento);
        
        if (yaSeleccionado) {
            setAsientosSeleccionados(prev => prev.filter(a => a.asiento !== asiento));
            if (proxyRef.current) proxyRef.current.invoke('liberarAsientoTemporal', vueloElegido, asiento);
        } else {
            setAsientosSeleccionados(prev => [...prev, { asiento, id_clase: idClase, precio }]);
            if (proxyRef.current) proxyRef.current.invoke('bloquearAsientoTemporal', vueloElegido, asiento);
        }
    };

    const confirmarReserva = async () => {
        if (!vueloElegido) { Alert.alert("Atención", "Selecciona un vuelo."); return; }
        if (asientosSeleccionados.length === 0) { Alert.alert("Atención", "Selecciona al menos un asiento."); return; }

        setGuardando(true);
        try {
            const asientosFormateados = asientosSeleccionados.map(item => ({ asiento: item.asiento, id_clase: item.id_clase }));

            // 🔥 Ajuste CRÍTICO: FormData y serialización del array de asientos
            const formData = new FormData();
            formData.append('action', 'crear_reserva');
            formData.append('email', correoAuth);
            formData.append('token', tokenAuth);
            formData.append('idVuelo', vueloElegido);
            formData.append('asientos', JSON.stringify(asientosFormateados)); // Convertimos el array a String JSON

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                const codigo = response.data.codigo_reserva;
                Alert.alert(
                    "¡Reserva Confirmada! 🎉", `Tu localizador es: ${codigo}\n¿Deseas pagar ahora?`,
                    [
                        { text: "Pagar luego", onPress: () => navigation.navigate('MisBoletos'), style: "cancel" },
                        { text: "Pagar ahora", onPress: () => navigation.navigate('Pagos', { codigo }) }
                    ]
                );
            } else { 
                Alert.alert("Error", response.data.mensaje); 
            }
        } catch (error) {
            console.log(error);
            Alert.alert("Error de Conexión", "Revisa la consola para más detalles de tu backend.");
        } finally { setGuardando(false); }
    };

    const renderAvion = () => {
        if (!mapaVisible || capacidad === 0) return null;

        const totalFilas = Math.ceil(capacidad / 4.0);
        const limitePrimera = Math.ceil(totalFilas * 0.1);
        const limiteEjecutiva = Math.ceil(totalFilas * 0.3);
        const letras = ['A', 'B', 'C', 'D'];
        
        let asientoActual = 1;
        let filasHTML = [];

        for (let fila = 1; fila <= totalFilas; fila++) {
            let rowSeats = [];
            let claseCSS, precio, idClaseAsiento;
            
            if (fila <= limitePrimera) { claseCSS = styles.seatPrimera; precio = 950.0; idClaseAsiento = 3; } 
            else if (fila <= limiteEjecutiva) { claseCSS = styles.seatEjecutiva; precio = 550.0; idClaseAsiento = 2; } 
            else { claseCSS = styles.seatEconomica; precio = 250.0; idClaseAsiento = 1; }

            for (let col = 0; col < 4; col++) {
                if (asientoActual > capacidad) break;
                
                const codigoAsiento = `${fila}${letras[col]}`;
                const isOcupado = ocupados.includes(codigoAsiento);
                const isSeleccionado = asientosSeleccionados.find(a => a.asiento === codigoAsiento);
                const isLockedByOther = asientosBloqueados.includes(codigoAsiento) && !isSeleccionado;
                const isDimmed = !isOcupado && claseElegida !== '' && parseInt(claseElegida) !== idClaseAsiento;

                let seatStyle = [styles.seat, claseCSS];
                let seatText = codigoAsiento;
                
                if (isOcupado) seatStyle.push(styles.seatOccupied);
                else if (isSeleccionado) { seatStyle.push(styles.seatSelected); seatText = '✖'; } 
                else if (isLockedByOther) { seatStyle.push(styles.seatLocked); seatText = '🔒'; } 
                else if (isDimmed) seatStyle.push(styles.seatDimmed);

                rowSeats.push(
                    <TouchableOpacity 
                        key={codigoAsiento} style={seatStyle} activeOpacity={0.7}
                        disabled={isOcupado || isDimmed || isLockedByOther}
                        onPress={() => toggleAsiento(codigoAsiento, idClaseAsiento, precio)}
                    >
                        <Text style={[styles.seatText, isOcupado && styles.seatTextOccupied, isSeleccionado && styles.seatTextSelected, isDimmed && styles.seatTextDimmed, isLockedByOther && styles.seatTextLocked ]}>
                            {seatText}
                        </Text>
                    </TouchableOpacity>
                );

                if (col === 1) rowSeats.push(<View key={`pasillo-${fila}`} style={styles.aisle} />);
                asientoActual++;
            }
            filasHTML.push(<View key={`fila-${fila}`} style={styles.seatRow}>{rowSeats}</View>);
        }
        return <View style={styles.planeFuselage}>{filasHTML}</View>;
    };

    const totalPagar = asientosSeleccionados.reduce((sum, item) => sum + item.precio, 0);

    if (verificandoGuardia || (cargando && vuelos.length === 0)) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#0d47a1" />
                <Text style={{ marginTop: 10 }}>Conectando con la torre de control...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>🎫 Reservar Vuelo</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Volver</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <View style={styles.bookingCard}>
                    <Text style={styles.mainTitle}>Encuentra tu destino</Text>
                    <Text style={styles.subTitle}>Reserva tu boleto y elige tu asiento.</Text>

                    <Text style={styles.label}>1. Vuelos Disponibles</Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={vueloElegido} onValueChange={handleVueloChange} dropdownIconColor="#0d47a1">
                            <Picker.Item label="-- Selecciona tu vuelo --" value="" color="#888" />
                            {/* 🔥 Ajuste: Lectura limpia del mapeo en minúsculas */}
                            {vuelos.map((v) => <Picker.Item key={v.id_vuelo} label={v.detalle} value={v.id_vuelo} />)}
                        </Picker>
                    </View>

                    {mapaVisible && (
                        <>
                            <Text style={[styles.label, { marginTop: 15 }]}>2. Filtrar por Clase (Opcional)</Text>
                            <View style={styles.pickerContainer}>
                                <Picker selectedValue={claseElegida} onValueChange={setClaseElegida} dropdownIconColor="#0d47a1">
                                    <Picker.Item label="-- Mostrar Todo --" value="" color="#888" />
                                    {/* 🔥 Ajuste: Lectura limpia del mapeo en minúsculas */}
                                    {clases.map((c) => <Picker.Item key={c.id_tipo_boleto} label={c.nombre} value={c.id_tipo_boleto.toString()} />)}
                                </Picker>
                            </View>

                            <Text style={styles.labelCenter}>3. Selección de Asiento</Text>
                            <View style={styles.leyendaContainer}>
                                <View style={styles.leyendaItem}><View style={[styles.leyendaCaja, styles.seatPrimera]} /><Text style={styles.leyendaTexto}> Primera</Text></View>
                                <View style={styles.leyendaItem}><View style={[styles.leyendaCaja, styles.seatEjecutiva]} /><Text style={styles.leyendaTexto}> Ejecutiva</Text></View>
                                <View style={styles.leyendaItem}><View style={[styles.leyendaCaja, styles.seatEconomica]} /><Text style={styles.leyendaTexto}> Eco.</Text></View>
                                <View style={styles.leyendaItem}><View style={[styles.leyendaCaja, styles.seatOccupied]} /><Text style={styles.leyendaTexto}> Ocupado</Text></View>
                                <View style={styles.leyendaItem}><View style={[styles.leyendaCaja, styles.seatLocked]} /><Text style={styles.leyendaTexto}> En Proceso</Text></View>
                            </View>

                            {cargando ? <ActivityIndicator size="small" color="#0d47a1" style={{ marginVertical: 20 }} /> : renderAvion()}

                            {asientosSeleccionados.length > 0 && (
                                <View style={styles.priceBox}>
                                    <Text style={styles.priceText}>Total Estimado: <Text style={styles.priceNumber}>Q {totalPagar.toFixed(2)}</Text></Text>
                                    <Text style={styles.priceDetail}>{asientosSeleccionados.length} asiento(s): {asientosSeleccionados.map(a => a.asiento).join(', ')}</Text>
                                </View>
                            )}

                            <TouchableOpacity 
                                style={[styles.btnReservar, asientosSeleccionados.length === 0 && styles.btnReservarDisabled]} 
                                onPress={confirmarReserva} disabled={asientosSeleccionados.length === 0 || guardando}
                            >
                                {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnReservarText}>Confirmar Reserva</Text>}
                            </TouchableOpacity>
                        </>
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
    bookingCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderTopWidth: 5, borderTopColor: '#1976d2', marginBottom: 30 },
    mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#0d47a1', textAlign: 'center' },
    subTitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#6c757d', marginBottom: 8 },
    labelCenter: { fontSize: 16, fontWeight: 'bold', color: '#0d47a1', textAlign: 'center', marginTop: 25, marginBottom: 15 },
    pickerContainer: { borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, backgroundColor: '#f8f9fa', overflow: 'hidden' },
    leyendaContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20, gap: 10 },
    leyendaItem: { flexDirection: 'row', alignItems: 'center' },
    leyendaCaja: { width: 15, height: 15, borderRadius: 3, borderWidth: 1 },
    leyendaTexto: { fontSize: 12, fontWeight: 'bold', color: '#555' },
    planeFuselage: { backgroundColor: '#eef2f5', borderRadius: 30, paddingVertical: 30, paddingHorizontal: 15, borderWidth: 2, borderColor: '#cfd8dc', alignSelf: 'center', minWidth: 250 },
    seatRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
    aisle: { width: 25 },
    seat: { width: 40, height: 40, borderRadius: 8, marginHorizontal: 5, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
    seatText: { fontSize: 10, fontWeight: 'bold' },
    seatPrimera: { backgroundColor: '#fffde7', borderColor: '#ffd700' },
    seatEjecutiva: { backgroundColor: '#f3e5f5', borderColor: '#ab47bc' },
    seatEconomica: { backgroundColor: '#e3f2fd', borderColor: '#90caf9' },
    seatOccupied: { backgroundColor: '#e0e0e0', borderColor: '#bdbdbd' },
    seatTextOccupied: { color: '#9e9e9e', textDecorationLine: 'line-through' },
    seatSelected: { backgroundColor: '#0d47a1', borderColor: '#0d47a1', transform: [{ scale: 1.1 }] },
    seatTextSelected: { color: 'white', fontSize: 14 },
    seatLocked: { backgroundColor: '#ff9800', borderColor: '#f57c00' },
    seatTextLocked: { color: 'white', fontSize: 14 },
    seatDimmed: { backgroundColor: '#f5f5f5', borderColor: '#e0e0e0', opacity: 0.3 },
    seatTextDimmed: { color: '#bdbdbd' },
    priceBox: { backgroundColor: '#e8f5e9', borderColor: '#4caf50', borderWidth: 2, borderRadius: 10, padding: 15, marginTop: 20, alignItems: 'center' },
    priceText: { fontSize: 16, color: '#333', fontWeight: 'bold' },
    priceNumber: { fontSize: 22, color: '#2e7d32' },
    priceDetail: { fontSize: 12, color: '#666', marginTop: 5, fontWeight: 'bold' },
    btnReservar: { backgroundColor: '#0d47a1', height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 25, shadowColor: '#0d47a1', shadowOpacity: 0.3, elevation: 5 },
    btnReservarDisabled: { backgroundColor: '#90caf9', shadowOpacity: 0 },
    btnReservarText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default Reservas;