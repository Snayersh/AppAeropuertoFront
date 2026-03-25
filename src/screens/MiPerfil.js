import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config'



const MiPerfil = ({ navigation }) => {
    const [correoUsuario, setCorreoUsuario] = useState('');
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    
    // Para el panel de mensajes (éxito o error)
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

    const [form, setForm] = useState({
        primer_nombre: '', segundo_nombre: '', 
        primer_apellido: '', segundo_apellido: '', 
        telefono: ''
    });

    // Cuando la pantalla carga, ejecutamos esto
    useEffect(() => {
        cargarDatosPerfil();
    }, []);

    const cargarDatosPerfil = async () => {
        try {
            // 1. Sacamos el correo que guardamos cuando hizo Login
            const email = await AsyncStorage.getItem('UserEmail');
            if (!email) {
                navigation.replace('Login'); // Si no hay sesión, pa' fuera
                return;
            }
            setCorreoUsuario(email);

            // 2. Vamos a Oracle a traer los datos
            const response = await axios.get(`${API_URL}/clientes/perfil/${email}`);
            
            if (response.data.success) {
                const perfil = response.data.perfil;
                
                // OJO: Oracle a veces devuelve las columnas en MAYÚSCULAS.
                // Usamos esta validación para que no falle sin importar cómo venga.
                setForm({
                    primer_nombre: perfil.PRIMER_NOMBRE || perfil.primer_nombre || '',
                    segundo_nombre: perfil.SEGUNDO_NOMBRE || perfil.segundo_nombre || '',
                    primer_apellido: perfil.PRIMER_APELLIDO || perfil.primer_apellido || '',
                    segundo_apellido: perfil.SEGUNDO_APELLIDO || perfil.segundo_apellido || '',
                    telefono: perfil.TELEFONO || perfil.telefono || ''
                });
            }
        } catch (error) {
            console.log("Error cargando perfil:", error);
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
            // Mandamos los datos a tu SP_ACTUALIZAR_PERFIL
            const response = await axios.put(`${API_URL}/clientes/perfil/actualizar`, {
                correo: correoUsuario,
                ...form
            });

            if (response.data.success) {
                setMensaje({ texto: '¡Tu perfil se ha actualizado correctamente!', tipo: 'exito' });
                
                // EL TRUCO DE ORO: Actualizamos el nombre en el teléfono para que la pantalla de Inicio lo salude bien
                await AsyncStorage.setItem('UserName', form.primer_nombre);
            }
        } catch (error) {
            if (error.response && error.response.data) {
                setMensaje({ texto: error.response.data.mensaje, tipo: 'error' });
            } else {
                setMensaje({ texto: 'Error al conectar con el servidor.', tipo: 'error' });
            }
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#0d47a1" />
                <Text style={{ marginTop: 10, color: '#666' }}>Cargando tu información...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Barra Superior */}
            <View style={styles.topBar}>
                <Text style={styles.topBarTitle}>👤 Gestión de Cuenta</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Volver</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.profileCard}>
                    
                    {/* Ícono Circular */}
                    <View style={styles.iconCircle}>
                        <Text style={styles.iconText}>🧑‍💻</Text>
                    </View>
                    <Text style={styles.pageTitle}>Mi Perfil Personal</Text>
                    <Text style={styles.pageSubtitle}>Actualiza tu información de contacto</Text>

                    {/* Panel de Mensajes (Tu pnlMensaje de VB) */}
                    {mensaje.texto !== '' && (
                        <View style={[styles.alertPanel, mensaje.tipo === 'exito' ? styles.alertExito : styles.alertError]}>
                            <Text style={[styles.alertText, mensaje.tipo === 'exito' ? styles.textExito : styles.textError]}>
                                {mensaje.texto}
                            </Text>
                        </View>
                    )}

                    {/* Formulario */}
                    <Text style={styles.label}>Primer Nombre *</Text>
                    <TextInput style={styles.input} value={form.primer_nombre} onChangeText={(val) => setForm({...form, primer_nombre: val})} />

                    <Text style={styles.label}>Segundo Nombre</Text>
                    <TextInput style={styles.input} value={form.segundo_nombre} onChangeText={(val) => setForm({...form, segundo_nombre: val})} />

                    <Text style={styles.label}>Primer Apellido *</Text>
                    <TextInput style={styles.input} value={form.primer_apellido} onChangeText={(val) => setForm({...form, primer_apellido: val})} />

                    <Text style={styles.label}>Segundo Apellido</Text>
                    <TextInput style={styles.input} value={form.segundo_apellido} onChangeText={(val) => setForm({...form, segundo_apellido: val})} />

                    <Text style={styles.label}>Teléfono de Contacto *</Text>
                    <TextInput style={styles.input} keyboardType="phone-pad" value={form.telefono} onChangeText={(val) => setForm({...form, telefono: val})} />

                    {/* Botón Guardar */}
                    <TouchableOpacity style={styles.btnGuardar} onPress={handleGuardar} disabled={guardando}>
                        {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnGuardarText}>💾 Guardar Cambios</Text>}
                    </TouchableOpacity>

                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f7f6' },
    topBar: { backgroundColor: '#0d47a1', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, elevation: 5 },
    topBarTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    btnVolver: { borderColor: 'white', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    btnVolverText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    content: { padding: 20 },
    profileCard: { backgroundColor: 'white', borderRadius: 15, padding: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderTopWidth: 5, borderTopColor: '#1976d2', alignItems: 'center' },
    iconCircle: { width: 80, height: 80, backgroundColor: '#e3f2fd', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    iconText: { fontSize: 40 },
    pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    pageSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
    alertPanel: { width: '100%', padding: 15, borderRadius: 8, marginBottom: 20 },
    alertExito: { backgroundColor: '#d4edda', borderColor: '#c3e6cb', borderWidth: 1 },
    alertError: { backgroundColor: '#f8d7da', borderColor: '#f5c6cb', borderWidth: 1 },
    alertText: { textAlign: 'center', fontWeight: 'bold' },
    textExito: { color: '#155724' },
    textError: { color: '#721c24' },
    label: { alignSelf: 'flex-start', fontSize: 14, fontWeight: 'bold', color: '#6c757d', marginBottom: 5, marginLeft: 5 },
    input: { width: '100%', height: 45, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ced4da', paddingHorizontal: 15, marginBottom: 15 },
    btnGuardar: { width: '100%', backgroundColor: '#0d47a1', height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOpacity: 0.2, elevation: 3 },
    btnGuardarText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default MiPerfil;