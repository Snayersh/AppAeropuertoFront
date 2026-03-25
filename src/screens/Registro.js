import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';
import { API_URL } from '../config'


const Registro = ({ navigation }) => {
    const [cargando, setCargando] = useState(false);

    // Estados del Formulario
    const [primerNombre, setPrimerNombre] = useState('');
    const [primerApellido, setPrimerApellido] = useState('');
    const [pasaporte, setPasaporte] = useState('');
    const [telefono, setTelefono] = useState('');
    const [pais, setPais] = useState('Guatemala'); // Valor por defecto
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');

    const handleRegistro = async () => {
        // Validación básica en el frontend
        if (!primerNombre || !primerApellido || !correo || !password || !pais) {
            Alert.alert("Atención", "Por favor llena todos los campos obligatorios marcados con *");
            return;
        }

        setCargando(true);
        try {
            // Apuntamos a la ruta de clientes que armamos en Node
     // 🔥 CAMBIO AQUÍ: Cambiamos /clientes/ por /auth/
            const response = await axios.post(`${API_URL}/auth/registrar`, {
                primer_nombre: primerNombre,
                primer_apellido: primerApellido,
                pasaporte: pasaporte,
                telefono: telefono,
                pais: pais,
                correo: correo,
                password_hash: password // Node lo va a encriptar
            });

            if (response.data.success) {
                Alert.alert(
                    "¡Bienvenido! 🎉", 
                    "Tu cuenta ha sido creada exitosamente. Revisa tu correo para activarla (si aplica).",
                    [{ text: "Ir al Login", onPress: () => navigation.navigate('Login') }]
                );
            }
        } catch (error) {
            const msj = error.response?.data?.mensaje || "Error al conectar con el servidor.";
            Alert.alert("Error de Registro", msj);
        } finally {
            setCargando(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                
                {/* Botón Volver */}
                <TouchableOpacity style={styles.btnVolver} onPress={() => navigation.goBack()}>
                    <Text style={styles.btnVolverText}>← Volver</Text>
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.title}>Crea tu Cuenta</Text>
                    <Text style={styles.subtitle}>Únete a La Aurora y empieza a viajar.</Text>
                </View>

                <View style={styles.formContainer}>
                    <Text style={styles.sectionTitle}>Datos Personales</Text>
                    
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.label}>Primer Nombre *</Text>
                            <TextInput style={styles.input} placeholder="Juan" value={primerNombre} onChangeText={setPrimerNombre} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Primer Apellido *</Text>
                            <TextInput style={styles.input} placeholder="Pérez" value={primerApellido} onChangeText={setPrimerApellido} />
                        </View>
                    </View>

                    <Text style={styles.label}>Pasaporte / DPI</Text>
                    <TextInput style={styles.input} placeholder="Opcional" value={pasaporte} onChangeText={setPasaporte} />

                    <Text style={styles.label}>País de Residencia *</Text>
                    <TextInput style={styles.input} placeholder="Ej: Guatemala" value={pais} onChangeText={setPais} />

                    <Text style={styles.label}>Teléfono</Text>
                    <TextInput style={styles.input} placeholder="Opcional" keyboardType="phone-pad" value={telefono} onChangeText={setTelefono} />

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Credenciales de Acceso</Text>

                    <Text style={styles.label}>Correo Electrónico *</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="ejemplo@correo.com" 
                        keyboardType="email-address" 
                        autoCapitalize="none"
                        value={correo} 
                        onChangeText={setCorreo} 
                    />

                    <Text style={styles.label}>Contraseña *</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Crea una contraseña segura" 
                        secureTextEntry 
                        value={password} 
                        onChangeText={setPassword} 
                    />

                    <TouchableOpacity 
                        style={styles.btnRegistrar} 
                        onPress={handleRegistro}
                        disabled={cargando}
                    >
                        {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnRegistrarText}>Registrarme Ahora</Text>}
                    </TouchableOpacity>

                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>¿Ya tienes una cuenta? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.loginLink}>Inicia Sesión</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: { flexGrow: 1, backgroundColor: '#f4f7f6', padding: 20, paddingTop: 50 },
    
    btnVolver: { alignSelf: 'flex-start', backgroundColor: 'rgba(13, 71, 161, 0.1)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginBottom: 20 },
    btnVolverText: { color: '#0d47a1', fontWeight: 'bold' },

    header: { marginBottom: 30 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#0d47a1' },
    subtitle: { fontSize: 16, color: '#666', marginTop: 5 },

    formContainer: { backgroundColor: 'white', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15, textTransform: 'uppercase' },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    
    label: { fontSize: 12, fontWeight: 'bold', color: '#6c757d', marginBottom: 5 },
    input: { backgroundColor: '#f8f9fa', height: 50, borderRadius: 8, borderWidth: 1, borderColor: '#ced4da', paddingHorizontal: 15, marginBottom: 15, fontSize: 15, color: '#333' },
    
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },

    btnRegistrar: { backgroundColor: '#0d47a1', height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#0d47a1', shadowOpacity: 0.3, elevation: 5 },
    btnRegistrarText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
    loginText: { color: '#666', fontSize: 14 },
    loginLink: { color: '#0d47a1', fontSize: 14, fontWeight: 'bold' }
});

export default Registro;