import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { API_URL } from '../config';
import { useGuardia } from '../hooks/useGuardia'; 
const SoporteTickets = ({ navigation }) => {
    const { correoAuth, tokenAuth, verificandoGuardia } = useGuardia(navigation);

    const [cargando, setCargando] = useState(true);
    const [enviando, setEnviando] = useState(false);

    // Estados de Datos
    const [tiposTicket, setTiposTicket] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [respuestas, setRespuestas] = useState([]);
    
    // Estados de Formulario
    const [idTipo, setIdTipo] = useState('');
    const [asunto, setAsunto] = useState('');
    const [nuevaRespuesta, setNuevaRespuesta] = useState('');
    
    // Navegación interna (null = Lista, número = ID del Ticket viendo el hilo)
    const [ticketActivo, setTicketActivo] = useState(null);

    useFocusEffect(
        useCallback(() => {
            if (!verificandoGuardia && correoAuth && tokenAuth) {
                cargarDatosIniciales();
            }
        }, [verificandoGuardia, correoAuth, tokenAuth])
    );

    const cargarDatosIniciales = async () => {
        setCargando(true);
        try {
            // Peticiones en paralelo para categorías y mis tickets
            const formTipos = new FormData();
            formTipos.append('action', 'tipos_ticket');

            const formTickets = new FormData();
            formTickets.append('action', 'listar_tickets');
            formTickets.append('email', correoAuth);
            formTickets.append('token', tokenAuth);

            const [resTipos, resTickets] = await Promise.all([
                axios.post(API_URL, formTipos, { headers: { 'Content-Type': 'multipart/form-data' } }),
                axios.post(API_URL, formTickets, { headers: { 'Content-Type': 'multipart/form-data' } })
            ]);

            if (resTipos.data.success) {
                setTiposTicket(resTipos.data.tipos || []);
            }
            if (resTickets.data.success) {
                setTickets(resTickets.data.tickets || []);
            }
        } catch (error) {
            console.log("Error cargando soporte:", error);
            Alert.alert("Error", "No se pudo conectar con el Centro de Soporte.");
        } finally {
            setCargando(false);
        }
    };

    const handleCrearTicket = async () => {
        if (!idTipo || !asunto.trim()) {
            Alert.alert("Atención", "Por favor selecciona una categoría y escribe un asunto.");
            return;
        }

        setEnviando(true);
        try {
            const formData = new FormData();
            formData.append('action', 'crear_ticket');
            formData.append('email', correoAuth);
            formData.append('token', tokenAuth);
            formData.append('idTipo', idTipo);
            formData.append('asunto', asunto.trim());

            const res = await axios.post(API_URL, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

            if (res.data.success) {
                Alert.alert("¡Enviado!", "Tu ticket ha sido abierto exitosamente.");
                setAsunto('');
                setIdTipo('');
                cargarDatosIniciales(); // Recargar la lista
            } else {
                Alert.alert("Error", res.data.mensaje || "No se pudo crear el ticket.");
            }
        } catch (error) {
            Alert.alert("Error de Conexión", "Intenta nuevamente.");
        } finally {
            setEnviando(false);
        }
    };

    const verHilo = async (id_ticket) => {
        setTicketActivo(id_ticket);
        setCargando(true);
        try {
            const formData = new FormData();
            formData.append('action', 'hilo_respuestas_ticket');
            formData.append('email', correoAuth);
            formData.append('token', tokenAuth);
            formData.append('idTicket', id_ticket);

            const res = await axios.post(API_URL, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

            if (res.data.success) {
                setRespuestas(res.data.respuestas || []);
            } else {
                Alert.alert("Error", "No se pudo cargar la conversación.");
                setTicketActivo(null);
            }
        } catch (error) {
            Alert.alert("Error de Conexión", "No se pudo conectar con el servidor.");
            setTicketActivo(null);
        } finally {
            setCargando(false);
        }
    };

    const handleEnviarRespuesta = async () => {
        if (!nuevaRespuesta.trim()) return;

        setEnviando(true);
        try {
            const formData = new FormData();
            formData.append('action', 'responder_ticket');
            formData.append('email', correoAuth);
            formData.append('token', tokenAuth);
            formData.append('idTicket', ticketActivo);
            formData.append('mensaje', nuevaRespuesta.trim());

            const res = await axios.post(API_URL, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

            if (res.data.success) {
                setNuevaRespuesta('');
                verHilo(ticketActivo); // Recargar el hilo de mensajes
            } else {
                Alert.alert("Error", res.data.mensaje || "No se pudo enviar el mensaje.");
            }
        } catch (error) {
            Alert.alert("Error de Conexión", "Intenta nuevamente.");
        } finally {
            setEnviando(false);
        }
    };

    // Helper para los Badges de Estado
    const getBadgeStyle = (estado) => {
        const est = estado ? String(estado).toLowerCase() : '';
        if (est.includes('abierto')) return styles.badgeAbierto;
        if (est.includes('cerrado')) return styles.badgeCerrado;
        return styles.badgeProceso; // por defecto o "en proceso"
    };

    const getBadgeTextStyle = (estado) => {
        const est = estado ? String(estado).toLowerCase() : '';
        if (est.includes('abierto')) return styles.badgeTextAbierto;
        if (est.includes('cerrado')) return styles.badgeTextCerrado;
        return styles.badgeTextProceso;
    };

    if (verificandoGuardia || cargando && !ticketActivo && tickets.length === 0) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#0d47a1" />
                <Text style={{ marginTop: 15, color: '#6c757d', fontWeight: 'bold' }}>Cargando Centro de Soporte...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
            
            {/* Top Bar Carbón */}
            <View style={styles.topBar}>
                <View style={styles.topBarLeft}>
                    <Image source={require('../../assets/icon.png')} style={styles.brandIconMini} />
                    <Text style={styles.topBarTitle}>Centro de Soporte GUA</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Perfil</Text>
                </TouchableOpacity>
            </View>

            {/* VISTA 1: PANEL PRINCIPAL (NUEVO TICKET Y LISTADO) */}
            {!ticketActivo ? (
                <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                    
                    {/* Tarjeta: Abrir Nuevo Caso */}
                    <View style={styles.aurCard}>
                        <View style={styles.headerAccent} />
                        <Text style={styles.sectionTitle}>ABRIR NUEVO CASO</Text>
                        <Text style={styles.textMuted}>Detalle su consulta técnica o administrativa para que uno de nuestros agentes le asista.</Text>

                        <Text style={styles.labelCustom}>Categoría de Ayuda *</Text>
                        <View style={styles.pickerContainer}>
                            <Picker selectedValue={idTipo} onValueChange={(val) => setIdTipo(val)} dropdownIconColor="#0d47a1">
                                <Picker.Item label="-- Seleccione una categoría --" value="" color="#888" />
                                {/* 🔥 MAGIA: Extracción de datos para Tipos de Ticket */}
                                {tiposTicket.map((t, index) => {
                                    const vals = Object.values(t);
                                    return <Picker.Item key={index} label={vals[1]} value={String(vals[0])} />
                                })}
                            </Picker>
                        </View>

                        <Text style={styles.labelCustom}>Asunto / Resumen Breve *</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Ej: Problemas con mi equipaje" 
                            placeholderTextColor="#adb5bd"
                            value={asunto} 
                            onChangeText={setAsunto} 
                            maxLength={150}
                        />

                        <TouchableOpacity 
                            style={styles.btnAurora} 
                            onPress={handleCrearTicket} 
                            disabled={enviando}
                        >
                            {enviando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnAuroraText}>ENVIAR TICKET 📨</Text>}
                        </TouchableOpacity>
                    </View>

                    {/* Tarjeta: Historial de Casos */}
                    <View style={styles.aurCard}>
                        <View style={[styles.headerAccent, { backgroundColor: '#2c3e50' }]} />
                        <Text style={styles.sectionTitle}>HISTORIAL DE MIS CASOS</Text>
                        
                        {tickets.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Text style={{ fontSize: 40, opacity: 0.5, marginBottom: 10 }}>🎧</Text>
                                <Text style={styles.emptyText}>No tiene tickets de soporte registrados.</Text>
                            </View>
                        ) : (
                            // 🔥 MAGIA: Extracción de datos para la tabla de Tickets
                            tickets.map((t, index) => {
                                const vals = Object.values(t);
                                const idTicket = vals[0];
                                const asuntoTicket = vals[1];
                                const estadoTicket = String(vals[2] || '');

                                return (
                                    <View key={index} style={styles.ticketRow}>
                                        <View style={{ flex: 1, paddingRight: 10 }}>
                                            <Text style={styles.ticketId}>TCK-{idTicket}</Text>
                                            <Text style={styles.ticketAsunto} numberOfLines={2}>{asuntoTicket}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                                            <View style={[styles.badge, getBadgeStyle(estadoTicket)]}>
                                                <Text style={[styles.badgeText, getBadgeTextStyle(estadoTicket)]}>{estadoTicket || 'PROCESO'}</Text>
                                            </View>
                                            <TouchableOpacity style={styles.btnOutline} onPress={() => verHilo(idTicket)}>
                                                <Text style={styles.btnOutlineText}>Ver Hilo 💬</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>

                </ScrollView>

            ) : (

                /* VISTA 2: HILO DE CONVERSACIÓN */
                <View style={{ flex: 1 }}>
                    <View style={styles.chatHeaderBox}>
                        <View>
                            <Text style={styles.sectionTitle}>HILO DE CONVERSACIÓN</Text>
                            <Text style={styles.ticketId}>TICKET #{ticketActivo}</Text>
                        </View>
                        <TouchableOpacity style={styles.btnCerrarHilo} onPress={() => setTicketActivo(null)}>
                            <Text style={styles.btnCerrarHiloText}>Cerrar Hilo ✖️</Text>
                        </TouchableOpacity>
                    </View>

                    {cargando ? (
                        <ActivityIndicator size="large" color="#0d47a1" style={{ marginTop: 50 }} />
                    ) : (
                        <FlatList 
                            data={respuestas}
                            keyExtractor={(item, index) => index.toString()}
                            contentContainerStyle={{ padding: 20 }}
                            renderItem={({ item }) => {
                                // 🔥 MAGIA: Extracción de datos para las respuestas del chat
                                const vals = Object.values(item);
                                const mensaje = vals[0];
                                let fecha = vals[1];

                                // Limpiamos la fecha si viene con el formato feo de la base de datos (T00:00:00)
                                if (typeof fecha === 'string' && fecha.includes('T')) {
                                    const partes = fecha.split('T');
                                    fecha = `${partes[0]} ${partes[1].substring(0, 5)} hrs`;
                                }

                                return (
                                    <View style={styles.chatBubble}>
                                        <Text style={styles.chatDate}>{fecha || 'FECHA DESCONOCIDA'}</Text>
                                        <Text style={styles.chatMessage}>{mensaje}</Text>
                                    </View>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={styles.emptyBox}>
                                    <Text style={styles.emptyText}>Aún no hay mensajes en este ticket.</Text>
                                </View>
                            }
                        />
                    )}

                    {/* Caja Inferior para responder */}
                    <View style={styles.replyBox}>
                        <View style={[styles.headerAccent, { backgroundColor: '#00695c', marginBottom: 10, width: 40 }]} />
                        <Text style={[styles.sectionTitle, { fontSize: 11, marginBottom: 10 }]}>AÑADIR RESPUESTA</Text>
                        <TextInput 
                            style={styles.textArea} 
                            placeholder="Escriba su mensaje detallado aquí..." 
                            placeholderTextColor="#adb5bd"
                            multiline 
                            numberOfLines={4}
                            value={nuevaRespuesta}
                            onChangeText={setNuevaRespuesta}
                        />
                        <TouchableOpacity 
                            style={[styles.btnAurora, { backgroundColor: '#00695c', alignSelf: 'flex-end', paddingHorizontal: 30, width: 'auto', marginTop: 10 }]} 
                            onPress={handleEnviarRespuesta} 
                            disabled={enviando || !nuevaRespuesta.trim()}
                        >
                            {enviando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnAuroraText}>ENVIAR 🚀</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fc' },
    
    // Top Bar
    topBar: { backgroundColor: '#2c3e50', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, elevation: 5, zIndex: 10 },
    topBarLeft: { flexDirection: 'row', alignItems: 'center' },
    brandIconMini: { width: 30, height: 30, borderRadius: 6, marginRight: 10, backgroundColor: 'white' },
    topBarTitle: { color: 'white', fontSize: 15, fontWeight: 'bold' },
    btnVolver: { borderColor: '#bdc3c7', borderWidth: 1, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
    btnVolverText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

    // Tarjetas Base (aur-card)
    aurCard: { backgroundColor: 'white', borderRadius: 15, padding: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 3, borderWidth: 1, borderColor: '#edf2f9', marginBottom: 25 },
    
    // Elementos de Título
    headerAccent: { height: 5, width: 60, backgroundColor: '#0d47a1', borderRadius: 10, marginBottom: 15 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#2c3e50', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 },
    textMuted: { color: '#6c757d', fontSize: 12, marginBottom: 20, lineHeight: 18 },
    
    // Formularios
    labelCustom: { fontSize: 11, fontWeight: '700', color: '#6c757d', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    pickerContainer: { height: 48, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#dee2e6', justifyContent: 'center', marginBottom: 20 },
    input: { height: 48, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#dee2e6', paddingHorizontal: 15, fontSize: 14, color: '#2c3e50', marginBottom: 20 },
    textArea: { backgroundColor: '#f8f9fa', borderRadius: 10, borderWidth: 1, borderColor: '#dee2e6', padding: 15, fontSize: 14, color: '#2c3e50', minHeight: 80, textAlignVertical: 'top' },

    // Botones
    btnAurora: { backgroundColor: '#0d47a1', height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    btnAuroraText: { color: 'white', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
    btnOutline: { borderColor: '#0d47a1', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 10 },
    btnOutlineText: { color: '#0d47a1', fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase' },

    // Lista de Tickets
    ticketRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f3f5', paddingVertical: 15 },
    ticketId: { color: '#adb5bd', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
    ticketAsunto: { color: '#2c3e50', fontSize: 14, fontWeight: 'bold' },
    
    // Badges de Estado
    badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
    badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    badgeAbierto: { backgroundColor: '#e3f2fd' }, badgeTextAbierto: { color: '#0d47a1' },
    badgeCerrado: { backgroundColor: '#f1f3f5' }, badgeTextCerrado: { color: '#6c757d' },
    badgeProceso: { backgroundColor: '#fff3e0' }, badgeTextProceso: { color: '#e65100' },

    // Estados vacíos
    emptyBox: { alignItems: 'center', paddingVertical: 30 },
    emptyText: { color: '#6c757d', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },

    // --- ESTILOS VISTA 2: CHAT ---
    chatHeaderBox: { backgroundColor: 'white', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#edf2f9', shadowColor: '#000', shadowOpacity: 0.05, elevation: 3, zIndex: 5 },
    btnCerrarHilo: { borderColor: '#6c757d', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    btnCerrarHiloText: { color: '#6c757d', fontWeight: 'bold', fontSize: 11 },
    
    // Burbujas
    chatBubble: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#edf2f9', borderLeftWidth: 4, borderLeftColor: '#0d47a1', padding: 15, borderRadius: 12, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.03, elevation: 2 },
    chatDate: { fontSize: 10, color: '#adb5bd', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    chatMessage: { fontSize: 13, color: '#2c3e50', lineHeight: 20 },
    
    // Caja para Responder
    replyBox: { backgroundColor: 'white', padding: 20, borderTopWidth: 1, borderTopColor: '#edf2f9', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 15 }
});

export default SoporteTickets;