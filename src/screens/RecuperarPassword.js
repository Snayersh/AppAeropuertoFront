import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import axios from 'axios';
import { API_URL } from '../config';

const RecuperarPassword = ({ navigation }) => {
    const [correo, setCorreo] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleRecuperar = async () => {
        if (!correo) {
            Alert.alert("Error", "Por favor ingresa tu correo electrónico.");
            return;
        }

        setCargando(true);
        try {
            const formData = new FormData();
            formData.append('action', 'solicitar_recuperacion');
            formData.append('email', correo);

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                Alert.alert("¡Enviado!", response.data.mensaje || "Revisa tu bandeja de entrada.", [
                    { text: "OK", onPress: () => navigation.navigate('Login') }
                ]);
            } else {
                Alert.alert("Aviso", response.data.mensaje || "No se encontró el correo.");
            }
        } catch (error) {
            console.log("Error al solicitar recuperación:", error);
            const msjError = error.response?.data?.mensaje || "Error al conectar con el servidor.";
            Alert.alert("Error de Conexión", msjError);
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
                <View style={styles.recoverCard}>
                    
                    <View style={styles.header}>
                        <Image source={require('../../assets/icon.png')} style={styles.brandIconCenter} />
                        <View style={styles.headerAccent} />
                        <Text style={styles.title}>Recuperar Acceso</Text>
                        <Text style={styles.subtitle}>
                            Ingresa tu correo registrado para recibir un enlace seguro de restablecimiento.
                        </Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.labelStyle}>CORREO ELECTRÓNICO</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="usuario@correo.com"
                            placeholderTextColor="#adb5bd"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={correo}
                            onChangeText={setCorreo}
                        />
                    </View>

                    <TouchableOpacity 
                        style={styles.btnAurora} 
                        onPress={handleRecuperar}
                        disabled={cargando}
                    >
                        {cargando ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.btnAuroraText}>ENVIAR INSTRUCCIONES</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Text style={styles.linkBack}>← Volver al Inicio de Sesión</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fc' },
    scrollContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    
    // Card estilo Dashboard Auth
    recoverCard: { 
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
    
    header: { alignItems: 'center', marginBottom: 25 },
    
    // Logo y Acento
    brandIconCenter: { width: 55, height: 55, borderRadius: 10, borderWidth: 1, borderColor: '#edf2f9', marginBottom: 20 },
    headerAccent: { height: 5, width: 60, backgroundColor: '#0d47a1', borderRadius: 10, marginBottom: 15 },
    
    title: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50', letterSpacing: -0.5, marginBottom: 5 },
    subtitle: { fontSize: 13, color: '#6c757d', textAlign: 'center', lineHeight: 18 },
    
    // Inputs
    inputGroup: { marginBottom: 25 },
    labelStyle: { fontSize: 11, fontWeight: '800', color: '#6c757d', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
    input: { height: 50, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#dee2e6', paddingHorizontal: 15, fontSize: 15, color: '#2c3e50' },
    
    // Botón
    btnAurora: { backgroundColor: '#0d47a1', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', shadowColor: '#0d47a1', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    btnAuroraText: { color: '#fff', fontSize: 13, fontWeight: 'bold', letterSpacing: 0.5 },
    
    // Footer
    footer: { marginTop: 25, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#edf2f9', alignItems: 'center' },
    linkBack: { color: '#6c757d', fontSize: 13, fontWeight: '500' }
});

export default RecuperarPassword;