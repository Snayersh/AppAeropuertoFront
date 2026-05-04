import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { API_URL } from '../config';
import { useGuardia } from '../hooks/useGuardia';

const Equipaje = ({ navigation }) => {
    // 🔥 CONTRATAMOS AL GUARDIA
    const { correoAuth, tokenAuth, verificandoGuardia } = useGuardia(navigation);

    const [cargandoInicial, setCargandoInicial] = useState(true);
    const [cargandoLista, setCargandoLista] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const [boletos, setBoletos] = useState([]);
    const [boletoSeleccionado, setBoletoSeleccionado] = useState('');
    const [maletas, setMaletas] = useState([]);

    const [tipoEquipaje, setTipoEquipaje] = useState('');
    const [peso, setPeso] = useState('');
    const [descripcion, setDescripcion] = useState('');

    // 🔥 Esperamos al guardia antes de cargar
    useEffect(() => {
        if (!verificandoGuardia && correoAuth && tokenAuth) {
            cargarBoletosDropdown();
        }
    }, [verificandoGuardia, correoAuth, tokenAuth]);

    const cargarBoletosDropdown = async () => {
        try {
            const formData = new FormData();
            formData.append('action', 'boletos_equipaje');
            formData.append('email', correoAuth);

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

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

    const handleBoletoChange = async (codigo) => {
        setBoletoSeleccionado(codigo);
        setMaletas([]); 
        if (!codigo) return;

        setCargandoLista(true);
        try {
            const formData = new FormData();
            formData.append('action', 'listar_equipaje');
            formData.append('codigoBoleto', codigo);

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                setMaletas(response.data.equipaje);
            }
        } catch (error) {
            console.log("Error cargando maletas:", error);
        } finally {
            setCargandoLista(false);
        }
    };

    const agregarMaleta = async () => {
        if (!boletoSeleccionado) { Alert.alert("Atención", "Selecciona una reserva primero."); return; }
        if (!tipoEquipaje) { Alert.alert("Atención", "Selecciona el Tipo de Equipaje."); return; }
        if (!peso || !descripcion) { Alert.alert("Atención", "Ingresa el peso y la descripción."); return; }

        setGuardando(true);
        try {
            const formData = new FormData();
            formData.append('action', 'registrar_equipaje');
            formData.append('codigoBoleto', boletoSeleccionado);
            formData.append('peso', peso);
            formData.append('descripcion', descripcion);
            formData.append('idTipo', tipoEquipaje);

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                Alert.alert("Detalle de Registro", response.data.mensaje || "Maleta registrada correctamente. 🧳");
                setPeso('');
                setDescripcion('');
                setTipoEquipaje(''); 
                handleBoletoChange(boletoSeleccionado);
            } else {
                Alert.alert("Error", response.data.mensaje || "No se pudo registrar la maleta.");
            }
        } catch (error) {
            Alert.alert("Error de conexión", "Error al conectar con el servidor.");
        } finally {
            setGuardando(false);
        }
    };

    if (verificandoGuardia || cargandoInicial) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#e65100" />
                <Text style={{ marginTop: 15, color: '#2c3e50', fontWeight: 'bold' }}>Cargando tus reservas...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Top Bar Carbón Profesional */}
            <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>🧳 Portal de Equipaje GUA</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Inicio</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                <View style={styles.mainCard}>
                    
                    {/* Header y Acento Naranja */}
                    <View style={styles.headerContainer}>
                        <View style={styles.headerAccent} />
                        <Text style={styles.mainTitle}>Documentación de Equipaje</Text>
                        <Text style={styles.subTitle}>Gestión anticipada para agilizar su abordaje</Text>
                    </View>

                    <View style={styles.selectBox}>
                        <Text style={styles.labelCustom}>1. Selecciona tu Reserva de Vuelo</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={boletoSeleccionado}
                                onValueChange={handleBoletoChange}
                                dropdownIconColor="#2c3e50"
                                style={styles.pickerStyle}
                            >
                                <Picker.Item label="-- Selecciona una de tus reservas --" value="" color="#888" />
                                {boletos.map((b, index) => (
                                    <Picker.Item key={index} label={b.descripcion_boleto} value={b.codigo_boleto} color="#0d47a1" />
                                ))}
                            </Picker>
                        </View>
                    </View>

                    {boletoSeleccionado !== '' && (
                        <View style={styles.gestionContainer}>
                            
                            {/* FORMULARIO NUEVA MALETA */}
                            <Text style={styles.sectionSubtitle}>2. Nueva Maleta</Text>
                            
                            <Text style={styles.labelCustom}>Tipo de Equipaje *</Text>
                            <View style={[styles.pickerContainer, { marginBottom: 20 }]}>
                                <Picker
                                    selectedValue={tipoEquipaje}
                                    onValueChange={(itemValue) => setTipoEquipaje(itemValue)}
                                    dropdownIconColor="#6c757d"
                                    style={styles.pickerStyle}
                                >
                                    <Picker.Item label="-- Seleccionar --" value="" color="#888" />
                                    <Picker.Item label="Maleta de Bodega (Documentada)" value="1" />
                                    <Picker.Item label="Equipaje de Mano (Cabina)" value="2" />
                                    <Picker.Item label="Artículo Personal (Mochila)" value="3" />
                                </Picker>
                            </View>

                            <Text style={styles.labelCustom}>Peso Estimado (Lbs) *</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="Ej: 45.5" 
                                placeholderTextColor="#adb5bd"
                                keyboardType="numeric" 
                                value={peso} 
                                onChangeText={setPeso} 
                            />

                            <Text style={styles.labelCustom}>Descripción Detallada *</Text>
                            <TextInput 
                                style={[styles.input, { height: 90, textAlignVertical: 'top', paddingTop: 15 }]} 
                                placeholder="Color, marca y señas particulares..." 
                                placeholderTextColor="#adb5bd"
                                multiline={true} 
                                numberOfLines={3} 
                                value={descripcion} 
                                onChangeText={setDescripcion} 
                            />

                            <TouchableOpacity style={styles.btnAuroraAction} onPress={agregarMaleta} disabled={guardando}>
                                {guardando ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.btnAuroraText}>REGISTRAR MALETA ➕</Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            {/* LISTA DE EQUIPAJE DOCUMENTADO */}
                            <Text style={styles.sectionSubtitle}>3. Equipaje Documentado</Text>
                            
                            {cargandoLista ? (
                                <ActivityIndicator size="large" color="#e65100" style={{ marginVertical: 30 }} />
                            ) : maletas.length === 0 ? (
                                <View style={styles.emptyBox}>
                                    <Text style={styles.emptyIcon}>🧳</Text>
                                    <Text style={styles.emptyText}>No hay equipaje registrado para esta reserva.</Text>
                                </View>
                            ) : (
                                maletas.map((m, index) => (
                                    <View key={index} style={styles.baggageItem}>
                                        <Text style={styles.baggageIcon}>🧳</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.bagTitle}>{m.descripcion}</Text>
                                            
                                            <View style={styles.badgesContainer}>
                                                <View style={styles.badgeLight}>
                                                    <Text style={styles.badgeLightText}>{m.peso} Lbs</Text>
                                                </View>
                                                {m.tipo_equipaje && (
                                                    <View style={styles.badgeDark}>
                                                        <Text style={styles.badgeDarkText}>{m.tipo_equipaje}</Text>
                                                    </View>
                                                )}
                                            </View>
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
    container: { flex: 1, backgroundColor: '#f8f9fc' },
    
    // Top Bar Carbón
    topBar: { backgroundColor: '#2c3e50', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, elevation: 4 },
    topBarTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    btnVolver: { borderColor: '#bdc3c7', borderWidth: 1, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
    btnVolverText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    
    // Main Card
    mainCard: { backgroundColor: 'white', borderRadius: 15, padding: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 3, borderWidth: 1, borderColor: '#edf2f9' },
    
    // Header
    headerContainer: { alignItems: 'center', marginBottom: 25 },
    headerAccent: { width: 60, height: 5, backgroundColor: '#e65100', borderRadius: 10, marginBottom: 15 },
    mainTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center', letterSpacing: -0.5 },
    subTitle: { fontSize: 11, color: '#6c757d', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1, marginTop: 5 },
    
    // Select Box Area
    selectBox: { backgroundColor: '#f8f9fc', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#edf2f9', marginBottom: 25 },
    
    // Labels compartidos
    labelCustom: { fontSize: 11, fontWeight: '800', color: '#6c757d', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
    sectionSubtitle: { fontSize: 15, fontWeight: '800', color: '#2c3e50', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 },
    
    // Pickers e Inputs
    pickerContainer: { backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#dee2e6', overflow: 'hidden', height: 50, justifyContent: 'center' },
    pickerStyle: { fontWeight: 'bold' },
    input: { backgroundColor: '#fff', height: 50, borderRadius: 10, borderWidth: 1, borderColor: '#dee2e6', paddingHorizontal: 15, marginBottom: 20, color: '#2c3e50', fontSize: 14 },
    
    gestionContainer: { paddingTop: 10 },
    
    // Botón Principal Naranja
    btnAuroraAction: { backgroundColor: '#e65100', borderRadius: 25, paddingVertical: 15, alignItems: 'center', shadowColor: '#e65100', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, marginTop: 5 },
    btnAuroraText: { color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
    
    divider: { height: 1, backgroundColor: '#edf2f9', marginVertical: 30 },
    
    // Estados Vacíos
    emptyBox: { alignItems: 'center', paddingVertical: 30 },
    emptyIcon: { fontSize: 45, opacity: 0.2, marginBottom: 10 },
    emptyText: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
    
    // Items de Equipaje
    baggageItem: { backgroundColor: '#ffffff', borderColor: '#edf2f9', borderWidth: 1, borderLeftWidth: 5, borderLeftColor: '#e65100', borderRadius: 10, padding: 20, marginBottom: 15, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, elevation: 2 },
    baggageIcon: { fontSize: 28, marginRight: 15, opacity: 0.8 },
    bagTitle: { fontWeight: 'bold', color: '#2c3e50', fontSize: 15, marginBottom: 8 },
    
    // Badges
    badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    badgeLight: { backgroundColor: '#f8f9fc', borderColor: '#dee2e6', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
    badgeLightText: { color: '#2c3e50', fontSize: 10, fontWeight: 'bold' },
    badgeDark: { backgroundColor: '#0d47a1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
    badgeDarkText: { color: 'white', fontSize: 10, fontWeight: 'bold' }
});

export default Equipaje;