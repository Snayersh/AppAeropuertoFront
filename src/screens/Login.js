import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config'

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
            // 🔥 Ajuste Vital 1 y 2: FormData y nombres exactos (action, email, password)
            const formData = new FormData();
            formData.append('action', 'login');
            formData.append('email', correoLimpio);
            formData.append('password', passwordLimpia);

            const response = await axios.post(API_URL, formData, {
                // 🔥 PASE VIP OBLIGATORIO (ACTUALIZADO PARA NGROK / LOCALTUNNEL) 🔥
                headers: {
                    'ngrok-skip-browser-warning': 'true', 
                    'Bypass-Tunnel-Reminder': 'true',     
                    'Content-Type': 'multipart/form-data' // Cambiado a multipart para soportar FormData
                }
            });

            if (response.data.success) {
                const user = response.data.usuario;
                const token = response.data.token_sesion; // 🔥 ATRAPAMOS EL NUEVO TOKEN DE SEGURIDAD


                    if (user.rol.toString() !== '2') {
                    setMensajeError("Acceso denegado: Esta aplicación móvil es de uso exclusivo para pasajeros.");
                    setCargando(false);
                    return; // Detenemos el inicio de sesión aquí mismo
                }
                // Guardamos todo en la bóveda del teléfono
                await AsyncStorage.setItem('UserName', user.nombre);
                await AsyncStorage.setItem('UserEmail', user.correo);
                await AsyncStorage.setItem('UserRole', user.rol.toString());
                
                // 🔥 GUARDAMOS EL TOKEN PARA USARLO EN LAS OTRAS PANTALLAS
                if (token) {
                    await AsyncStorage.setItem('UserToken', token);
                }

                navigation.replace('Inicio'); // Usamos replace para que no puedan darle "atrás" y volver al login
            } else {
                // Si está bloqueado temporalmente o la clave es incorrecta, el backend nos manda el texto exacto aquí:
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
        <ImageBackground 
            source={{ uri: 'https://images.unsplash.com/photo-1436491865332-7a61a109c0f3?auto=format&fit=crop&w=1350&q=80' }} 
            style={styles.background}
            resizeMode="cover"
        >
            <View style={styles.overlay} />

            <View style={styles.card}>
                <View style={styles.header}>
                    <Text style={styles.title}>✈️ Portal de Acceso</Text>
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
                    <Text style={styles.label}>Correo Electrónico</Text>
                    <TextInput 
                        style={styles.input}
                        placeholder="usuario@correo.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />
                </View>

               <View style={styles.inputGroup}>
                    <Text style={styles.label}>Contraseña</Text>
                    <TextInput 
                        style={styles.input}
                        placeholder="••••••••"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                    />
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 5 }}>
                        <TouchableOpacity onPress={() => navigation.navigate('RecuperarPassword')}>
                            <Text style={{ color: '#0d47a1', fontSize: 13, fontWeight: 'bold' }}>
                                ¿Olvidaste tu contraseña?
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Text style={{ color: '#6c757d', fontSize: 13 }}>
                                {showPassword ? 'Ocultar' : 'Mostrar'}
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
                        <Text style={styles.btnPrimaryText}>Ingresar al Sistema</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.footerRow}>
                    <Text style={styles.mutedText}>¿No tienes cuenta? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Registro')}> 
                        <Text style={styles.linkText}>Regístrate aquí</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={{ marginTop: 20 }} onPress={() => navigation.navigate('Inicio')}>
                    <Text style={styles.linkBack}>← Volver al inicio</Text>
                </TouchableOpacity>
            </View>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    background: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    card: { 
        width: '90%', maxWidth: 450, backgroundColor: 'rgba(255, 255, 255, 0.95)', 
        borderRadius: 20, padding: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, 
        shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 
    },
    header: { alignItems: 'center', marginBottom: 25 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#0d47a1' },
    subtitle: { fontSize: 14, color: '#6c757d', marginTop: 5 },
    pnlExito: { backgroundColor: '#e8f5e9', borderLeftWidth: 5, borderLeftColor: '#2e7d32', padding: 15, borderRadius: 8, marginBottom: 20 },
    textExito: { color: '#2e7d32', fontWeight: 'bold', textAlign: 'center' },
    pnlError: { backgroundColor: '#cea4aa', padding: 15, borderRadius: 8, marginBottom: 20 },
    textError: { color: '#bd7474', fontWeight: 'bold', textAlign: 'center' },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#6c757d', marginBottom: 5 },
    input: { height: 50, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ced4da', paddingHorizontal: 15, fontSize: 16 },
    showPassText: { color: '#6c757d', fontSize: 13, marginTop: 8, textAlign: 'right' },
    btnPrimary: { backgroundColor: '#0d47a1', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    footerRow: { flexDirection: 'row', justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#dee2e6', paddingTop: 20 },
    mutedText: { color: '#6c757d', fontSize: 14 },
    linkText: { color: '#0d47a1', fontWeight: 'bold', fontSize: 14 },
    linkBack: { color: '#6c757d', textAlign: 'center', fontSize: 14 }
});

export default Login;