import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config'



const Reservas = ({ navigation }) => {
    const [correoUsuario, setCorreoUsuario] = useState('');
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    // Listas para los Pickers
    const [vuelos, setVuelos] = useState([]);
    const [clases, setClases] = useState([]);
    
    // Selecciones del usuario
    const [vueloElegido, setVueloElegido] = useState('');
    const [claseElegida, setClaseElegida] = useState(''); // ID para filtrar
    const [asientosSeleccionados, setAsientosSeleccionados] = useState([]); // [{ asiento: '1A', precio: 250, id_clase: 1 }]

    // Datos del Mapa
    const [capacidad, setCapacidad] = useState(0);
    const [ocupados, setOcupados] = useState([]);
    const [mapaVisible, setMapaVisible] = useState(false);

    useEffect(() => {
        cargarIniciales();
    }, []);

    const cargarIniciales = async () => {
        try {
            const email = await AsyncStorage.getItem('UserEmail');
            if (!email) {
                navigation.replace('Login');
                return;
            }
            setCorreoUsuario(email);

            // Cargamos Vuelos y Clases en paralelo
            const [resVuelos, resClases] = await Promise.all([
                axios.get(`${API_URL}/reservas/vuelos`),
                axios.get(`${API_URL}/reservas/clases`)
            ]);

            if (resVuelos.data.success) setVuelos(resVuelos.data.vuelos);
            if (resClases.data.success) setClases(resClases.data.clases);

        } catch (error) {
            Alert.alert("Error", "No se pudieron cargar los datos iniciales.");
        } finally {
            setCargando(false);
        }
    };

    // Cuando el usuario elige un vuelo en el Picker, cargamos su mapa
    const handleVueloChange = async (idVuelo) => {
        setVueloElegido(idVuelo);
        setAsientosSeleccionados([]);
        
        if (!idVuelo) {
            setMapaVisible(false);
            return;
        }

        setCargando(true);
        try {
            const resMapa = await axios.get(`${API_URL}/reservas/mapa/${idVuelo}`);
            if (resMapa.data.success) {
                setCapacidad(resMapa.data.capacidad);
                setOcupados(resMapa.data.ocupados);
                setMapaVisible(true);
            }
        } catch (error) {
            Alert.alert("Error", "No se pudo cargar el mapa de asientos.");
        } finally {
            setCargando(false);
        }
    };

    // Lógica para seleccionar/deseleccionar asientos en el mapa
    const toggleAsiento = (asiento, idClase, precio) => {
        // Verificar si el filtro de clase está activo y no coincide
        if (claseElegida !== '' && parseInt(claseElegida) !== idClase) return;

        const yaSeleccionado = asientosSeleccionados.find(a => a.asiento === asiento);
        
        if (yaSeleccionado) {
            // Quitarlo
            setAsientosSeleccionados(prev => prev.filter(a => a.asiento !== asiento));
        } else {
            // Agregarlo
            setAsientosSeleccionados(prev => [...prev, { asiento, id_clase: idClase, precio }]);
        }
    };

    const confirmarReserva = async () => {
        if (!vueloElegido) {
            Alert.alert("Atención", "Selecciona un vuelo."); return;
        }
        if (asientosSeleccionados.length === 0) {
            Alert.alert("Atención", "Selecciona al menos un asiento en el mapa."); return;
        }

        setGuardando(true);
        try {
            const dataPost = {
                correo: correoUsuario,
                id_vuelo: vueloElegido,
                asientos: asientosSeleccionados // Mandamos el arreglo completo
            };

            const response = await axios.post(`${API_URL}/reservas/crear`, dataPost);

            if (response.data.success) {
                const codigo = response.data.codigo_reserva;
                Alert.alert(
                    "¡Reserva Confirmada! 🎉",
                    `Tu localizador es: ${codigo}\n¿Deseas pagar ahora?`,
                    [
                        { text: "Pagar luego", onPress: () => navigation.navigate('MisBoletos'), style: "cancel" },
                        { text: "Pagar ahora", onPress: () => navigation.navigate('Pagos', { codigo }) }
                    ]
                );
            }
        } catch (error) {
            const msj = error.response?.data?.mensaje || "Error al procesar reserva";
            Alert.alert("Error", msj);
        } finally {
            setGuardando(false);
        }
    };

    // ==========================================
    // MOTOR PARA DIBUJAR EL AVIÓN DINÁMICO
    // ==========================================
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
            
            // Determinar clase y precio según la fila (igual que en VB)
            let claseCSS, precio, idClaseAsiento;
            if (fila <= limitePrimera) {
                claseCSS = styles.seatPrimera; precio = 950.0; idClaseAsiento = 3;
            } else if (fila <= limiteEjecutiva) {
                claseCSS = styles.seatEjecutiva; precio = 550.0; idClaseAsiento = 2;
            } else {
                claseCSS = styles.seatEconomica; precio = 250.0; idClaseAsiento = 1;
            }

            for (let col = 0; col < 4; col++) {
                if (asientoActual > capacidad) break;
                
                const codigoAsiento = `${fila}${letras[col]}`;
                const isOcupado = ocupados.includes(codigoAsiento);
                const isSeleccionado = asientosSeleccionados.find(a => a.asiento === codigoAsiento);
                
                // Efecto "dimmed" si hay filtro de clase y no coincide
                const isDimmed = !isOcupado && claseElegida !== '' && parseInt(claseElegida) !== idClaseAsiento;

                let seatStyle = [styles.seat, claseCSS];
                let seatText = codigoAsiento;
                
                if (isOcupado) {
                    seatStyle.push(styles.seatOccupied);
                } else if (isSeleccionado) {
                    seatStyle.push(styles.seatSelected);
                    seatText = '✖';
                } else if (isDimmed) {
                    seatStyle.push(styles.seatDimmed);
                }

                rowSeats.push(
                    <TouchableOpacity 
                        key={codigoAsiento}
                        style={seatStyle}
                        activeOpacity={0.7}
                        disabled={isOcupado || isDimmed}
                        onPress={() => toggleAsiento(codigoAsiento, idClaseAsiento, precio)}
                    >
                        <Text style={[styles.seatText, isOcupado && styles.seatTextOccupied, isSeleccionado && styles.seatTextSelected, isDimmed && styles.seatTextDimmed]}>
                            {seatText}
                        </Text>
                    </TouchableOpacity>
                );

                // Pasillo
                if (col === 1) rowSeats.push(<View key={`pasillo-${fila}`} style={styles.aisle} />);
                asientoActual++;
            }

            filasHTML.push(
                <View key={`fila-${fila}`} style={styles.seatRow}>
                    {rowSeats}
                </View>
            );
        }

        return <View style={styles.planeFuselage}>{filasHTML}</View>;
    };

    // Calcular el total a pagar en tiempo real
    const totalPagar = asientosSeleccionados.reduce((sum, item) => sum + item.precio, 0);

    if (cargando && vuelos.length === 0) {
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
                        <Picker
                            selectedValue={vueloElegido}
                            onValueChange={(itemValue) => handleVueloChange(itemValue)}
                            dropdownIconColor="#0d47a1"
                        >
                            <Picker.Item label="-- Selecciona tu vuelo --" value="" color="#888" />
                            {vuelos.map((v) => (
                                <Picker.Item key={v.ID_VUELO || v.id_vuelo} label={v.DETALLE || v.detalle} value={v.ID_VUELO || v.id_vuelo} />
                            ))}
                        </Picker>
                    </View>

                    {mapaVisible && (
                        <>
                            <Text style={[styles.label, { marginTop: 15 }]}>2. Filtrar por Clase (Opcional)</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={claseElegida}
                                    onValueChange={(itemValue) => setClaseElegida(itemValue)}
                                    dropdownIconColor="#0d47a1"
                                >
                                    <Picker.Item label="-- Mostrar Todo --" value="" color="#888" />
                                    {clases.map((c) => (
                                        <Picker.Item key={c.ID_TIPO_BOLETO || c.id_tipo_boleto} label={c.NOMBRE || c.nombre} value={(c.ID_TIPO_BOLETO || c.id_tipo_boleto).toString()} />
                                    ))}
                                </Picker>
                            </View>

                            <Text style={styles.labelCenter}>3. Selección de Asiento</Text>
                            
                            {/* Leyenda Visual */}
                            <View style={styles.leyendaContainer}>
                                <View style={styles.leyendaItem}><View style={[styles.leyendaCaja, styles.seatPrimera]} /><Text style={styles.leyendaTexto}> Primera</Text></View>
                                <View style={styles.leyendaItem}><View style={[styles.leyendaCaja, styles.seatEjecutiva]} /><Text style={styles.leyendaTexto}> Ejecutiva</Text></View>
                                <View style={styles.leyendaItem}><View style={[styles.leyendaCaja, styles.seatEconomica]} /><Text style={styles.leyendaTexto}> Eco.</Text></View>
                                <View style={styles.leyendaItem}><View style={[styles.leyendaCaja, styles.seatOccupied]} /><Text style={styles.leyendaTexto}> Ocupado</Text></View>
                            </View>

                            {cargando ? (
                                <ActivityIndicator size="small" color="#0d47a1" style={{ marginVertical: 20 }} />
                            ) : (
                                renderAvion()
                            )}

                            {/* Caja de Total */}
                            {asientosSeleccionados.length > 0 && (
                                <View style={styles.priceBox}>
                                    <Text style={styles.priceText}>Total Estimado: <Text style={styles.priceNumber}>Q {totalPagar.toFixed(2)}</Text></Text>
                                    <Text style={styles.priceDetail}>{asientosSeleccionados.length} asiento(s): {asientosSeleccionados.map(a => a.asiento).join(', ')}</Text>
                                </View>
                            )}

                            <TouchableOpacity 
                                style={[styles.btnReservar, asientosSeleccionados.length === 0 && styles.btnReservarDisabled]} 
                                onPress={confirmarReserva}
                                disabled={asientosSeleccionados.length === 0 || guardando}
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
    
    // Colores de las clases
    seatPrimera: { backgroundColor: '#fffde7', borderColor: '#ffd700' },
    seatEjecutiva: { backgroundColor: '#f3e5f5', borderColor: '#ab47bc' },
    seatEconomica: { backgroundColor: '#e3f2fd', borderColor: '#90caf9' },
    
    // Estados
    seatOccupied: { backgroundColor: '#e0e0e0', borderColor: '#bdbdbd' },
    seatTextOccupied: { color: '#9e9e9e', textDecorationLine: 'line-through' },
    
    seatSelected: { backgroundColor: '#0d47a1', borderColor: '#0d47a1', transform: [{ scale: 1.1 }] },
    seatTextSelected: { color: 'white', fontSize: 14 },
    
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