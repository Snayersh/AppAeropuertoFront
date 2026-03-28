import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
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
            // 🔥 CAMBIO: Apuntamos al Cerebro indicando la acción
            const response = await axios.post(API_URL, {
                accion: 'recuperar_password',
                correo: correo
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
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>🔐 Recuperar Contraseña</Text>
                <Text style={styles.subtitle}>
                    Ingresa el correo con el que te registraste y te enviaremos un enlace seguro para crear una nueva contraseña.
                </Text>

                <Text style={styles.label}>Correo Electrónico</Text>
                <TextInput
                    style={styles.input}
                    placeholder="usuario@correo.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={correo}
                    onChangeText={setCorreo}
                />

                {cargando ? (
                    <ActivityIndicator size="large" color="#0d47a1" style={{ marginTop: 20 }} />
                ) : (
                    <TouchableOpacity style={styles.btnPrimary} onPress={handleRecuperar}>
                        <Text style={styles.btnPrimaryText}>Enviar Enlace</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.btnVolver} onPress={() => navigation.goBack()}>
                    <Text style={styles.btnVolverText}>← Volver al inicio de sesión</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f7f6', justifyContent: 'center', padding: 20 },
    card: { backgroundColor: 'white', padding: 30, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, borderTopWidth: 5, borderTopColor: '#0d47a1' },
    title: { fontSize: 22, fontWeight: 'bold', color: '#0d47a1', textAlign: 'center', marginBottom: 10 },
    subtitle: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 25 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5 },
    input: { height: 50, borderWidth: 1, borderColor: '#ccc', borderRadius: 10, paddingHorizontal: 15, marginBottom: 20, backgroundColor: '#f9f9f9' },
    btnPrimary: { backgroundColor: '#0d47a1', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    btnPrimaryText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    btnVolver: { marginTop: 20, alignItems: 'center', padding: 10 },
    btnVolverText: { color: '#666', fontSize: 14 }
});

export default RecuperarPassword;