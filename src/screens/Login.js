import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config';

const Login = ({ navigation, route }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [cargando, setCargando] = useState(false);
    
    // Para manejar los mensajes tipo pnlError o pnlExito
    const [mensajeExito, setMensajeExito] = useState('');
    const [mensajeError, setMensajeError] = useState('');

    useEffect(() => {
        // Magia: Detecta si viene de la pantalla de registro
        if (route.params?.registro === 'exitoso') {
            setMensajeExito('¡Registro Exitoso! 🎉 Revisa tu correo para activar tu cuenta.');
        }
    }, [route.params]);

    const handleLogin = async () => {
        setMensajeExito('');
        setMensajeError('');

        const correoLimpio = email.trim().toLowerCase();
        const passwordLimpia = password.trim();

        if (!correoLimpio || !passwordLimpia) {
            setMensajeError('Por favor, ingrese correo y contraseña.');
            return;
        }

        setCargando(true);

        try {
            const formData = new FormData();
            formData.append('action', 'login');
            formData.append('email', correoLimpio);
            formData.append('password', passwordLimpia);

            const response = await axios.post(API_URL, formData, {
                headers: {
                    'ngrok-skip-browser-warning': 'true', 
                    'Bypass-Tunnel-Reminder': 'true',     
                    'Content-Type': 'multipart/form-data' 
                }
            });

         if (response.data.success) {
    // 1. Extraemos los datos según los nombres del backend VB.NET
    const idRolServidor = response.data.id_rol; 
    const nombreServidor = response.data.nombre_completo;
    const token = response.data.token_sesion;
    const emailServidor = email.trim().toLowerCase(); // El que ya tenemos

    // 2. Validación de seguridad para id_rol
    if (idRolServidor === undefined || idRolServidor === null) {
        setMensajeError("Error: El perfil de usuario no tiene un rol asignado.");
        setCargando(false);
        return;
    }

    // 3. Verificamos si es Pasajero (Rol 2)
    if (idRolServidor.toString() !== '2') {
        setMensajeError("Acceso denegado: Esta aplicación móvil es de uso exclusivo para pasajeros.");
        setCargando(false);
        return; 
    }
    
    // 4. Guardamos en AsyncStorage usando los nombres correctos
    await AsyncStorage.setItem('UserName', nombreServidor);
    await AsyncStorage.setItem('UserEmail', emailServidor);
    await AsyncStorage.setItem('UserRole', idRolServidor.toString());
    
    if (token) {
        await AsyncStorage.setItem('UserToken', token);
    }

    navigation.replace('Inicio'); 
} else {
                setMensajeError(response.data.mensaje || 'Credenciales inválidas.');
            }
        } catch (error) {
            console.log("Error detallado:", error); 
            if (error.response && error.response.data) {
                setMensajeError(error.response.data.mensaje || 'Error del servidor');
            } else {
                setMensajeError('Error de red. Verifica Localtunnel / Ngrok.');
            }
        } finally {
            setCargando(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                <View style={styles.loginCard}>
                    
                    <View style={styles.header}>
                        <View style={styles.brandIconContainer}>
                            <Text style={styles.brandIconText}>✈️</Text>
                        </View>
                        <Text style={styles.title}>Portal de Acceso</Text>
                        <Text style={styles.subtitle}>Aeropuerto Internacional La Aurora</Text>
                    </View>

                    {mensajeExito !== '' && (
                        <View style={styles.pnlExito}>
                            <Text style={styles.textExito}>{mensajeExito}</Text>
                        </View>
                    )}

                    {mensajeError !== '' && (
                        <View style={styles.pnlError}>
                            <Text style={styles.textError}>{mensajeError}</Text>
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="nombre@ejemplo.com"
                            placeholderTextColor="#adb5bd"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>CONTRASEÑA</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="#adb5bd"
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                        />
                        
                        <View style={styles.passwordActions}>
                            <TouchableOpacity onPress={() => navigation.navigate('RecuperarPassword')}>
                                <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Text style={styles.showPassText}>
                                    {showPassword ? 'Ocultar' : 'Mostrar contraseña'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.btnPrimary} 
                        onPress={handleLogin}
                        disabled={cargando}
                    >
                        {cargando ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.btnPrimaryText}>INGRESAR AL SISTEMA</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.sectionDivider} />

                    <View style={styles.footerRow}>
                        <Text style={styles.mutedText}>¿Aún no tienes una cuenta? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Registro')}> 
                            <Text style={[styles.linkText, { fontSize: 13 }]}>Crea una aquí</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Inicio')}>
                        <Text style={styles.linkBack}>← Volver al Portal Público</Text>
                    </TouchableOpacity>

                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fc' },
    scrollContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    
    // Card estilo Dashboard
    loginCard: { 
        width: '100%', 
        maxWidth: 450, 
        backgroundColor: 'white', 
        borderRadius: 20, 
        padding: 35, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 10 }, 
        shadowOpacity: 0.05, 
        shadowRadius: 20, 
        elevation: 5,
        borderWidth: 1,
        borderColor: '#edf2f9'
    },
    
    header: { alignItems: 'center', marginBottom: 30 },
    
    // Simulación del brand-icon web
    brandIconContainer: { width: 55, height: 55, borderRadius: 12, borderWidth: 1, borderColor: '#edf2f9', justifyContent: 'center', alignItems: 'center', marginBottom: 15, backgroundColor: '#f8f9fc' },
    brandIconText: { fontSize: 30 },
    
    title: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50', letterSpacing: -0.5 },
    subtitle: { fontSize: 10, color: '#6c757d', marginTop: 5, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold' },
    
    // Alertas
    pnlExito: { backgroundColor: '#e0f2f1', borderLeftWidth: 5, borderLeftColor: '#00695c', padding: 15, borderRadius: 8, marginBottom: 20 },
    textExito: { color: '#00695c', fontWeight: 'bold', textAlign: 'center', fontSize: 13 },
    
    pnlError: { backgroundColor: '#ffebee', borderLeftWidth: 5, borderLeftColor: '#e74c3c', padding: 15, borderRadius: 8, marginBottom: 20 },
    textError: { color: '#c62828', fontWeight: 'bold', textAlign: 'center', fontSize: 13 },
    
    // Inputs
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 11, fontWeight: 'bold', color: '#6c757d', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { height: 50, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#dee2e6', paddingHorizontal: 15, fontSize: 15, color: '#2c3e50' },
    
    passwordActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 5 },
    showPassText: { color: '#6c757d', fontSize: 12 },
    
    // Botón
    btnPrimary: { backgroundColor: '#0d47a1', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#0d47a1', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 },
    
    // Divider y Footer
    sectionDivider: { height: 1, backgroundColor: '#edf2f9', marginVertical: 25 },
    footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    mutedText: { color: '#6c757d', fontSize: 13 },
    linkText: { color: '#0d47a1', fontWeight: 'bold', fontSize: 12 },
    
    backButton: { marginTop: 25, alignItems: 'center', opacity: 0.8 },
    linkBack: { color: '#6c757d', fontSize: 13 }
});

export default Login;