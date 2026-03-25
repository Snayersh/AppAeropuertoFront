import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config'


const Equipaje = ({ navigation }) => {
    const [correoUsuario, setCorreoUsuario] = useState('');
    const [cargandoInicial, setCargandoInicial] = useState(true);
    const [cargandoLista, setCargandoLista] = useState(false);
    const [guardando, setGuardando] = useState(false);

    // Datos
    const [boletos, setBoletos] = useState([]);
    const [boletoSeleccionado, setBoletoSeleccionado] = useState('');
    const [maletas, setMaletas] = useState([]);

    // Formulario
    const [peso, setPeso] = useState('');
    const [descripcion, setDescripcion] = useState('');

    useEffect(() => {
        cargarBoletosDropdown();
    }, []);

    // 1. Cargar el Dropdown al abrir la pantalla
    const cargarBoletosDropdown = async () => {
        try {
            const email = await AsyncStorage.getItem('UserEmail');
            if (!email) {
                navigation.replace('Login');
                return;
            }
            setCorreoUsuario(email);

            // Ajusta la URL según cómo la hayas declarado en tus rutas de Node
            const response = await axios.get(`${API_URL}/equipaje/boletos/${email}`);
            if (response.data.success) {
                setBoletos(response.data.boletos);
            }
        } catch (error) {
            console.log("Error cargando boletos:", error);
            Alert.alert("Error", "No se pudieron cargar tus reservas.");
        } finally {
            setCargandoInicial(false);
        }
    };

    // 2. Cuando cambia el Dropdown, cargamos las maletas de ese boleto
    const handleBoletoChange = async (codigo) => {
        setBoletoSeleccionado(codigo);
        setMaletas([]); // Limpiamos la vista previa
        
        if (!codigo) return;

        setCargandoLista(true);
        try {
            const response = await axios.get(`${API_URL}/equipaje/lista/${codigo}`);
            if (response.data.success) {
                setMaletas(response.data.equipaje);
            }
        } catch (error) {
            console.log("Error cargando maletas:", error);
        } finally {
            setCargandoLista(false);
        }
    };

    // 3. Registrar nueva maleta
    const agregarMaleta = async () => {
        if (!boletoSeleccionado) {
            Alert.alert("Atención", "Selecciona una reserva primero."); return;
        }
        if (!peso || !descripcion) {
            Alert.alert("Atención", "Ingresa el peso y la descripción de la maleta."); return;
        }

        setGuardando(true);
        try {
            const response = await axios.post(`${API_URL}/equipaje/registrar`, {
                codigo_boleto: boletoSeleccionado,
                peso: peso,
                descripcion: descripcion
            });

            if (response.data.success) {
                Alert.alert("¡Éxito!", "Maleta registrada correctamente. 🧳");
                setPeso('');
                setDescripcion('');
                handleBoletoChange(boletoSeleccionado); // Recargamos la lista
            }
        } catch (error) {
            const msj = error.response?.data?.mensaje || "Error al registrar la maleta.";
            Alert.alert("Error", msj);
        } finally {
            setGuardando(false);
        }
    };

    if (cargandoInicial) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#ff9800" />
                <Text style={{ marginTop: 10 }}>Cargando tus reservas...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>🧳 Portal de Equipaje</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Volver</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <View style={styles.mainCard}>
                    <Text style={styles.mainTitle}>Documentación</Text>
                    <Text style={styles.subTitle}>Registra tus maletas antes de llegar al aeropuerto para agilizar tu abordaje.</Text>

                    {/* SELECCIÓN DE RESERVA */}
                    <View style={styles.selectBox}>
                        <Text style={styles.label}>1. Selecciona tu Reserva</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={boletoSeleccionado}
                                onValueChange={(itemValue) => handleBoletoChange(itemValue)}
                                dropdownIconColor="#0d47a1"
                            >
                                <Picker.Item label="-- Selecciona una de tus reservas --" value="" color="#888" />
                                {boletos.map((b, index) => (
                                    <Picker.Item 
                                        key={index} 
                                        label={b.DESCRIPCION_BOLETO || b.descripcion_boleto} 
                                        value={b.CODIGO_BOLETO || b.codigo_boleto} 
                                    />
                                ))}
                            </Picker>
                        </View>
                    </View>

                    {/* ZONA INFERIOR (Solo visible si eligió un boleto) */}
                    {boletoSeleccionado !== '' && (
                        <View style={styles.gestionContainer}>
                            
                            {/* FORMULARIO */}
                            <Text style={[styles.sectionTitle, { color: '#ff9800' }]}>2. Agregar Nueva Maleta</Text>
                            
                            <Text style={styles.inputLabel}>Peso Aproximado (Libras)</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="Ej: 45.5" 
                                keyboardType="numeric"
                                value={peso}
                                onChangeText={setPeso}
                            />

                            <Text style={styles.inputLabel}>Descripción</Text>
                            <TextInput 
                                style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                                placeholder="Ej: Maleta roja grande marca Samsonite" 
                                multiline={true}
                                numberOfLines={3}
                                value={descripcion}
                                onChangeText={setDescripcion}
                            />

                            <TouchableOpacity style={styles.btnWarning} onPress={agregarMaleta} disabled={guardando}>
                                {guardando ? <ActivityIndicator color="#424242" /> : <Text style={styles.btnWarningText}>Registrar Maleta ➕</Text>}
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            {/* LISTA DE MALETAS */}
                            <Text style={[styles.sectionTitle, { color: '#0d47a1' }]}>3. Tu Equipaje Documentado</Text>
                            
                            {cargandoLista ? (
                                <ActivityIndicator size="small" color="#0d47a1" style={{ marginVertical: 20 }} />
                            ) : maletas.length === 0 ? (
                                <View style={styles.emptyBox}>
                                    <Text style={{ fontSize: 40, opacity: 0.5 }}>👜</Text>
                                    <Text style={styles.emptyText}>Aún no has registrado equipaje para este vuelo.</Text>
                                </View>
                            ) : (
                                maletas.map((m, index) => (
                                    <View key={index} style={styles.baggageItem}>
                                        <Text style={styles.baggageIcon}>🧳</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.bagTitle}>{m.DESCRIPCION || m.descripcion}</Text>
                                            <Text style={styles.bagWeight}>Peso: {m.PESO || m.peso} Libras</Text>
                                        </View>
                                    </View>
                                ))
                            )}

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
    
    mainCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderTopWidth: 5, borderTopColor: '#ff9800', marginBottom: 30 },
    mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#ff9800', textAlign: 'center' },
    subTitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
    
    selectBox: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#dee2e6', marginBottom: 20 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#6c757d', marginBottom: 10 },
    pickerContainer: { backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#ced4da', overflow: 'hidden' },

    gestionContainer: { paddingTop: 10 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
    inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#6c757d', marginBottom: 5 },
    input: { backgroundColor: '#fff', height: 45, borderRadius: 8, borderWidth: 1, borderColor: '#ced4da', paddingHorizontal: 15, marginBottom: 15 },
    
    btnWarning: { backgroundColor: '#ffc107', height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', shadowColor: '#ffc107', shadowOpacity: 0.3, elevation: 4 },
    btnWarningText: { color: '#424242', fontWeight: 'bold', fontSize: 16 },

    divider: { height: 1, backgroundColor: '#eee', marginVertical: 25 },

    emptyBox: { alignItems: 'center', paddingVertical: 20 },
    emptyText: { color: '#999', marginTop: 10, textAlign: 'center' },

    baggageItem: { backgroundColor: '#fff8e1', borderColor: '#ffe082', borderWidth: 1, borderLeftWidth: 5, borderLeftColor: '#ffb300', borderRadius: 8, padding: 15, marginBottom: 15, flexDirection: 'row', alignItems: 'center' },
    baggageIcon: { fontSize: 30, marginRight: 15 },
    bagTitle: { fontWeight: 'bold', color: '#333', fontSize: 14 },
    bagWeight: { color: '#666', fontSize: 12, marginTop: 2, fontWeight: 'bold' }
});

export default Equipaje;