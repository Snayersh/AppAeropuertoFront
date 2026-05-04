import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config';
import { useGuardia } from '../hooks/useGuardia'; 

const MiPerfil = ({ navigation }) => {
    // 🔥 CONTRATAMOS AL GUARDIA
    const { correoAuth, tokenAuth, verificandoGuardia } = useGuardia(navigation);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

    const [form, setForm] = useState({
        primer_nombre: '', segundo_nombre: '', 
        primer_apellido: '', segundo_apellido: '', 
        telefono: ''
    });

    useEffect(() => {
        if (!verificandoGuardia && correoAuth && tokenAuth) {
            cargarDatosPerfil();
        }
    }, [verificandoGuardia, correoAuth, tokenAuth]);

    const cargarDatosPerfil = async () => {
        try {
            const formData = new FormData();
            formData.append('action', 'obtener_perfil');
            formData.append('email', correoAuth);

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success) {
                const perfil = response.data.perfil;
                
                setForm({
                    primer_nombre: perfil.primer_nombre || '',
                    segundo_nombre: perfil.segundo_nombre || '',
                    primer_apellido: perfil.primer_apellido || '',
                    segundo_apellido: perfil.segundo_apellido || '',
                    telefono: perfil.telefono || ''
                });
            }
        } catch (error) {
            setMensaje({ texto: 'Error al cargar tus datos. Revisa tu conexión.', tipo: 'error' });
        } finally {
            setCargando(false);
        }
    };

    const handleGuardar = async () => {
        if (!form.primer_nombre || !form.primer_apellido || !form.telefono) {
            setMensaje({ texto: 'Por favor, llena los campos obligatorios.', tipo: 'error' });
            return;
        }

        setGuardando(true);
        setMensaje({ texto: '', tipo: '' });

        try {
            const formData = new FormData();
            formData.append('action', 'actualizar_perfil');
            formData.append('email', correoAuth);
            formData.append('pNombre', form.primer_nombre);
            formData.append('sNombre', form.segundo_nombre);
            formData.append('pApellido', form.primer_apellido);
            formData.append('sApellido', form.segundo_apellido);
            formData.append('telefono', form.telefono);

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                setMensaje({ texto: '¡Tu perfil se ha actualizado correctamente!', tipo: 'exito' });
                await AsyncStorage.setItem('UserName', form.primer_nombre);
            } else {
                setMensaje({ texto: response.data.mensaje || 'No se pudo actualizar el perfil.', tipo: 'error' });
            }
        } catch (error) {
            setMensaje({ texto: 'Error al conectar con el servidor.', tipo: 'error' });
        } finally {
            setGuardando(false);
        }
    };

    if (verificandoGuardia || cargando) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#0d47a1" />
                <Text style={{ marginTop: 15, color: '#2c3e50', fontWeight: 'bold' }}>Cargando tu información...</Text>
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
                    <Text style={styles.topBarTitle}>Gestión de Cuenta</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Inicio</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.profileCard}>
                    
                    <View style={styles.profileHeaderBorder} />
                    
                    <View style={styles.iconCircle}>
                        <Text style={styles.iconText}>👤</Text>
                    </View>
                    
                    <Text style={styles.pageTitle}>Mi Perfil Personal</Text>
                    <Text style={styles.pageSubtitle}>Gestión de identidad y datos de contacto</Text>

                    {mensaje.texto !== '' && (
                        <View style={[styles.alertPanel, mensaje.tipo === 'exito' ? styles.alertExito : styles.alertError]}>
                            <Text style={[styles.alertText, mensaje.tipo === 'exito' ? styles.textExito : styles.textError]}>
                                {mensaje.texto}
                            </Text>
                        </View>
                    )}

                    <Text style={styles.label}>Primer Nombre *</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Ej. Juan"
                        placeholderTextColor="#adb5bd"
                        value={form.primer_nombre} 
                        onChangeText={(val) => setForm({...form, primer_nombre: val})} 
                    />

                    <Text style={styles.label}>Segundo Nombre</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Opcional"
                        placeholderTextColor="#adb5bd"
                        value={form.segundo_nombre} 
                        onChangeText={(val) => setForm({...form, segundo_nombre: val})} 
                    />

                    <Text style={styles.label}>Primer Apellido *</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Ej. García"
                        placeholderTextColor="#adb5bd"
                        value={form.primer_apellido} 
                        onChangeText={(val) => setForm({...form, primer_apellido: val})} 
                    />

                    <Text style={styles.label}>Segundo Apellido</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Opcional"
                        placeholderTextColor="#adb5bd"
                        value={form.segundo_apellido} 
                        onChangeText={(val) => setForm({...form, segundo_apellido: val})} 
                    />

                    <Text style={styles.label}>Teléfono de Contacto *</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="+502 XXXX XXXX"
                        placeholderTextColor="#adb5bd"
                        keyboardType="phone-pad" 
                        value={form.telefono} 
                        onChangeText={(val) => setForm({...form, telefono: val})} 
                    />

                    <TouchableOpacity style={styles.btnGuardar} onPress={handleGuardar} disabled={guardando}>
                        {guardando ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.btnGuardarText}>💾 GUARDAR CAMBIOS</Text>
                        )}
                    </TouchableOpacity>
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
    
    content: { padding: 20, paddingBottom: 40 },
    
    // Card Rediseñada
    profileCard: { backgroundColor: 'white', borderRadius: 15, padding: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 3, borderWidth: 1, borderColor: '#edf2f9' },
    
    profileHeaderBorder: { height: 5, width: 80, backgroundColor: '#0d47a1', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
    
    iconCircle: { width: 90, height: 90, backgroundColor: '#f8f9fc', borderRadius: 45, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 15, borderWidth: 2, borderColor: '#bdc3c7', borderStyle: 'dashed' },
    iconText: { fontSize: 40 },
    
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center', letterSpacing: -0.5 },
    pageSubtitle: { fontSize: 13, color: '#6c757d', marginBottom: 25, textAlign: 'center' },
    
    // Alertas
    alertPanel: { width: '100%', padding: 15, borderRadius: 10, marginBottom: 25 },
    alertExito: { backgroundColor: '#e0f2f1', borderColor: '#b2dfdb', borderWidth: 1, borderLeftWidth: 5, borderLeftColor: '#00695c' },
    alertError: { backgroundColor: '#ffebee', borderColor: '#ffcdd2', borderWidth: 1, borderLeftWidth: 5, borderLeftColor: '#e74c3c' },
    alertText: { textAlign: 'center', fontWeight: 'bold', fontSize: 13 },
    textExito: { color: '#00695c' },
    textError: { color: '#c62828' },
    
    // Inputs
    label: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', color: '#6c757d', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
    input: { width: '100%', height: 50, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#dee2e6', paddingHorizontal: 15, marginBottom: 20, fontSize: 15, color: '#2c3e50' },
    
    // Botón
    btnGuardar: { width: '100%', backgroundColor: '#0d47a1', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#0d47a1', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    btnGuardarText: { color: 'white', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 }
});

export default MiPerfil;