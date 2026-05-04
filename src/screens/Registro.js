import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import axios from 'axios';
import { API_URL } from '../config';
import DateTimePicker from '@react-native-community/datetimepicker'; 

const Registro = ({ navigation }) => {
    const [cargando, setCargando] = useState(false);

    // Estados del Formulario (Intactos para la base de datos)
    const [primerNombre, setPrimerNombre] = useState('');
    const [primerApellido, setPrimerApellido] = useState('');
    const [pasaporte, setPasaporte] = useState('');
    const [telefono, setTelefono] = useState('');
    const [pais, setPais] = useState('Guatemala');
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');

    // 🔥 LÓGICA DE 18 AÑOS: Calculamos la fecha máxima permitida
    const hoy = new Date();
    const fechaMaxima = new Date(hoy.getFullYear() - 18, hoy.getMonth(), hoy.getDate());

    const [fechaNacimiento, setFechaNacimiento] = useState(fechaMaxima); 
    const [mostrarCalendario, setMostrarCalendario] = useState(false);
    const [fechaSeleccionada, setFechaSeleccionada] = useState(false); 

    const handleConfirmarFecha = (event, selectedDate) => {
        setMostrarCalendario(Platform.OS === 'ios');
        if (selectedDate) {
            setFechaNacimiento(selectedDate);
            setFechaSeleccionada(true);
        }
    };

    const formatearFechaParaBD = (fecha) => {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleRegistro = async () => {
        if (!primerNombre || !primerApellido || !correo || !password || !pais || !fechaSeleccionada) {
            Alert.alert("Atención", "Por favor llena todos los campos obligatorios marcados con *, incluyendo la fecha de nacimiento.");
            return;
        }

        // 🔥 DOBLE VALIDACIÓN: Asegurarnos matemáticamente que tiene 18
        let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
        const mes = hoy.getMonth() - fechaNacimiento.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
            edad--;
        }

        if (edad < 18) {
            Alert.alert("Acceso Denegado", "Debes ser mayor de 18 años para crear una cuenta en La Aurora.");
            return;
        }

        setCargando(true);
        try {
            // 🔥 AJUSTES: FormData y mapeo exacto para el Backend (.ashx)
            const formData = new FormData();
            formData.append('action', 'registro');
            formData.append('pNombre', primerNombre);
            formData.append('pApellido', primerApellido);
            formData.append('pasaporte', pasaporte);
            formData.append('telefono', telefono);
            formData.append('pais', pais);
            formData.append('fechaNacimiento', formatearFechaParaBD(fechaNacimiento));
            formData.append('email', correo.trim().toLowerCase());
            formData.append('password', password);

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                Alert.alert(
                    "¡Bienvenido! 🎉", 
                    "Tu cuenta ha sido creada exitosamente. Revisa tu correo para activarla.",
                    [{ text: "Ir al Login", onPress: () => navigation.navigate('Login') }]
                );
            } else {
                Alert.alert("Error", response.data.mensaje || "No se pudo crear la cuenta.");
            }
        } catch (error) {
            const msj = error.response?.data?.mensaje || "Error al conectar con el servidor.";
            Alert.alert("Error de Conexión", msj);
        } finally {
            setCargando(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#f8f9fc' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                
                <TouchableOpacity style={styles.btnVolver} onPress={() => navigation.goBack()}>
                    <Text style={styles.btnVolverText}>← Volver al Login</Text>
                </TouchableOpacity>

                <View style={styles.registroCard}>
                    
                    {/* Encabezado */}
                    <View style={styles.header}>
                        <Image source={require('../../assets/icon.png')} style={styles.brandIconRegistro} />
                        <Text style={styles.title}>Registro de Pasajero</Text>
                        <Text style={styles.subtitle}>AEROPUERTO INTERNACIONAL LA AURORA</Text>
                    </View>

                    {/* Sección: Datos Personales */}
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionAccent} />
                        <Text style={styles.sectionTitle}>Datos Personales</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.labelCustom}>Primer Nombre *</Text>
                            <TextInput style={styles.input} placeholder="Ej. Juan" placeholderTextColor="#adb5bd" value={primerNombre} onChangeText={setPrimerNombre} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.labelCustom}>Primer Apellido *</Text>
                            <TextInput style={styles.input} placeholder="Ej. García" placeholderTextColor="#adb5bd" value={primerApellido} onChangeText={setPrimerApellido} />
                        </View>
                    </View>

                    <Text style={styles.labelCustom}>Fecha de Nacimiento *</Text>
                    <TouchableOpacity 
                        style={[styles.input, { justifyContent: 'center' }]} 
                        onPress={() => setMostrarCalendario(true)}
                    >
                        <Text style={{ color: fechaSeleccionada ? '#2c3e50' : '#adb5bd', fontSize: 15 }}>
                            {fechaSeleccionada ? fechaNacimiento.toLocaleDateString() : "Selecciona tu fecha"}
                        </Text>
                    </TouchableOpacity>

                    {mostrarCalendario && (
                        <DateTimePicker
                            value={fechaNacimiento}
                            mode="date"
                            display="spinner"
                            maximumDate={fechaMaxima} 
                            onChange={handleConfirmarFecha}
                        />
                    )}

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.labelCustom}>Teléfono</Text>
                            <TextInput style={styles.input} placeholder="+502" placeholderTextColor="#adb5bd" keyboardType="phone-pad" value={telefono} onChangeText={setTelefono} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.labelCustom}>Pasaporte / DPI</Text>
                            <TextInput style={styles.input} placeholder="Opcional" placeholderTextColor="#adb5bd" value={pasaporte} onChangeText={setPasaporte} />
                        </View>
                    </View>

                    {/* Sección: Dirección de Residencia */}
                    <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                        <View style={styles.sectionAccent} />
                        <Text style={styles.sectionTitle}>Dirección de Residencia</Text>
                    </View>

                    <Text style={styles.labelCustom}>País de Residencia *</Text>
                    <TextInput style={styles.input} placeholder="Ej. Guatemala" placeholderTextColor="#adb5bd" value={pais} onChangeText={setPais} />

                    {/* Sección: Datos de Acceso */}
                    <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                        <View style={styles.sectionAccent} />
                        <Text style={styles.sectionTitle}>Datos de Acceso</Text>
                    </View>

                    <Text style={styles.labelCustom}>Correo Electrónico *</Text>
                    <TextInput style={styles.input} placeholder="usuario@correo.com" placeholderTextColor="#adb5bd" keyboardType="email-address" autoCapitalize="none" value={correo} onChangeText={setCorreo} />

                    <Text style={styles.labelCustom}>Contraseña *</Text>
                    <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#adb5bd" secureTextEntry value={password} onChangeText={setPassword} />

                    <TouchableOpacity 
                        style={styles.btnAurora} 
                        onPress={handleRegistro} 
                        disabled={cargando}
                    >
                        {cargando ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.btnAuroraText}>CREAR CUENTA AHORA</Text>
                        )}
                    </TouchableOpacity>

                    {/* Footer Links */}
                    <View style={styles.footerContainer}>
                        <Text style={styles.footerText}>¿Ya tienes una cuenta registrada?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.footerLink}>Inicia sesión aquí</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: { flexGrow: 1, backgroundColor: '#f8f9fc', padding: 20, paddingTop: 40, paddingBottom: 60 },
    
    // Botón superior
    btnVolver: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 10, marginBottom: 10 },
    btnVolverText: { color: '#6c757d', fontWeight: 'bold', fontSize: 13 },
    
    // Tarjeta Principal
    registroCard: { 
        backgroundColor: 'white', 
        borderRadius: 20, 
        padding: 25, 
        shadowColor: '#000', 
        shadowOpacity: 0.08, 
        shadowRadius: 15, 
        elevation: 5, 
        borderWidth: 1, 
        borderColor: '#edf2f9' 
    },
    
    // Encabezado
    header: { alignItems: 'center', marginBottom: 35 },
    brandIconRegistro: { width: 55, height: 55, borderRadius: 10, borderWidth: 1, borderColor: '#edf2f9', marginBottom: 15 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', letterSpacing: -0.5 },
    subtitle: { fontSize: 10, color: '#6c757d', marginTop: 5, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold' },
    
    // Títulos de Sección (Con barra decorativa)
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 5 },
    sectionAccent: { width: 4, height: 18, backgroundColor: '#0d47a1', borderRadius: 4, marginRight: 8 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: '#2c3e50', textTransform: 'uppercase', letterSpacing: 1 },
    
    // Controles de formulario
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    labelCustom: { fontSize: 11, fontWeight: '700', color: '#6c757d', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { height: 48, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#dee2e6', paddingHorizontal: 15, marginBottom: 20, fontSize: 15, color: '#2c3e50' },
    
    // Botón Principal Aurora
    btnAurora: { backgroundColor: '#0d47a1', height: 55, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginTop: 15, shadowColor: '#0d47a1', shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    btnAuroraText: { color: 'white', fontWeight: 'bold', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
    
    // Footer Link
    footerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 25, borderTopWidth: 1, borderTopColor: '#edf2f9', paddingTop: 20 },
    footerText: { color: '#6c757d', fontSize: 12, marginRight: 5 },
    footerLink: { color: '#0d47a1', fontSize: 12, fontWeight: 'bold' }
});

export default Registro;