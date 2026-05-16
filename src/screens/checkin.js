import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    TextInput, 
    ActivityIndicator, 
    Alert, 
    Image, 
    KeyboardAvoidingView, 
    Platform 
} from 'react-native';
import axios from 'axios';
import { API_URL } from '../config'; 

// 1. Importamos a tu guardia de seguridad
import { useGuardia } from '../hooks/useGuardia'; 

const Checkin = ({ navigation }) => {
    // 2. Contratamos al guardia y le pedimos los credenciales
    const { correoAuth, tokenAuth, verificandoGuardia } = useGuardia(navigation);

    // 🔥 ESTADOS
    const [codigo, setCodigo] = useState('');
    const [tiposCheckin, setTiposCheckin] = useState([]);
    const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
    const [cargandoTipos, setCargandoTipos] = useState(true);
    const [procesando, setProcesando] = useState(false);

    // 3. Esperamos al guardia antes de cargar los canales de Check-In
    useEffect(() => {
        if (!verificandoGuardia && correoAuth && tokenAuth) {
            cargarTiposCheckin();
        }
    }, [verificandoGuardia, correoAuth, tokenAuth]);

    // 4. Obtener los tipos de Check-In
    const cargarTiposCheckin = async () => {
        try {
            const formData = new FormData();
            formData.append('action', 'obtener_tipos_checkin'); 
            formData.append('email', correoAuth);
            formData.append('token', tokenAuth);

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            const resultado = response.data;
            
            if (resultado.success && resultado.data && resultado.data.length > 0) {
                setTiposCheckin(resultado.data);
            } else {
                console.log("Error del servidor al obtener tipos:", resultado);
            }
        } catch (error) {
            console.log("Error cargando tipos de checkin:", error);
            Alert.alert("Error de Conexión", "No se pudieron cargar los métodos de registro.");
        } finally {
            setCargandoTipos(false);
        }
    };

    // 5. Procesar el formulario
    const handleCheckin = async () => {
        let codigoFinal = codigo.trim().toUpperCase();

        if (!codigoFinal.includes('-') && codigoFinal.startsWith('TK')) {
            codigoFinal = codigoFinal.slice(0, 2) + '-' + codigoFinal.slice(2);
            setCodigo(codigoFinal);
        }

        if (!codigoFinal) {
            Alert.alert("Aviso", "Por favor, ingresa tu código de reservación o boleto.");
            return;
        }

        if (!tipoSeleccionado) {
            Alert.alert("Aviso", "Por favor, selecciona el canal de registro de la lista.");
            return;
        }

        setProcesando(true);

        try {
            const formData = new FormData();
            formData.append('action', 'procesar_checkin');
            formData.append('codigoBoleto', codigoFinal);
            formData.append('idTipoCheckin', tipoSeleccionado);
            formData.append('email', correoAuth);
            formData.append('token', tokenAuth);

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const resultado = response.data;

            if (resultado.success) {
                Alert.alert(
                    "¡Check-In Exitoso! ✅", 
                    resultado.mensaje,
                    [{ text: "Entendido", onPress: () => navigation.goBack() }]
                );
                setCodigo('');
                setTipoSeleccionado(null);
            } else {
                Alert.alert("Atención ⚠️", resultado.mensaje || "Error al procesar el Check-In.");
            }

        } catch (error) {
            console.log("Error procesando checkin:", error);
            Alert.alert("Error Técnico", "No se pudo conectar con el servidor para procesar tu solicitud.");
        } finally {
            setProcesando(false);
        }
    };

    if (verificandoGuardia) {
        return <ActivityIndicator size="large" color="#0d47a1" style={{ flex: 1, justifyContent: 'center' }} />;
    }

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            {/* Barra superior minimalista */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.btnVolver} onPress={() => navigation.goBack()}>
                    <Text style={styles.btnVolverText}>← Volver</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                <View style={styles.checkinCard}>
                    
                    {/* 🔥 Aquí está el header igualito al de tu Login 🔥 */}
                    <View style={styles.headerCentered}>
                        <View style={styles.brandIconContainer}>
                            <Image 
                                source={require('../../assets/icon.png')} 
                                style={styles.brandIconImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.sectionTitle}>Check-In Online</Text>
                        <Text style={styles.sectionSubtitle}>Confirma tu asistencia y obtén tu pase de abordar de forma inmediata.</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>CÓDIGO DE RESERVACIÓN</Text>
                        <TextInput
                            style={styles.inputCustom}
                            placeholder="Ej: TK-88E1358B"
                            placeholderTextColor="#a0aec0"
                            value={codigo}
                            onChangeText={text => setCodigo(text.toUpperCase())}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            editable={!procesando}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>MÉTODO DE REGISTRO</Text>
                        {cargandoTipos ? (
                            <ActivityIndicator size="small" color="#0d47a1" style={{ alignSelf: 'flex-start', marginTop: 10 }} />
                        ) : (
                            <View style={styles.optionsContainer}>
                                {tiposCheckin.map((tipo) => {
                                    const isSelected = tipoSeleccionado === tipo.ID_TIPO_CHECKIN;
                                    return (
                                        <TouchableOpacity 
                                            key={tipo.ID_TIPO_CHECKIN} 
                                            style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                                            onPress={() => setTipoSeleccionado(tipo.ID_TIPO_CHECKIN)}
                                            disabled={procesando}
                                        >
                                            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                                {tipo.NOMBRE || "Opción sin nombre"}
                                            </Text>
                                            {/* Muestra un check si está seleccionado */}
                                            {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    <TouchableOpacity 
                        style={[styles.btnAction, procesando && styles.btnActionDisabled]} 
                        onPress={handleCheckin}
                        disabled={procesando}
                    >
                        {procesando ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.btnActionText}>Confirmar y Obtener Pase</Text>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.termsText}>
                        Al continuar, confirmas estar de acuerdo con las Políticas de Abordaje y Seguridad de La Aurora.
                    </Text>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fc' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    
    topBar: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', backgroundColor: '#f8f9fc', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 10 },
    btnVolver: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#edf2f9', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
    btnVolverText: { color: '#6c757d', fontWeight: 'bold', fontSize: 13 },
    
    checkinCard: { backgroundColor: '#fff', borderRadius: 20, borderTopWidth: 6, borderTopColor: '#0d47a1', padding: 25, marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5, borderWidth: 1, borderColor: '#edf2f9' },
    
    headerCentered: { alignItems: 'center', marginBottom: 25 },
    
    // 🔥 ESTILOS DEL LOGO COPIADOS DE TU LOGIN 🔥
    brandIconContainer: { width: 60, height: 60, borderRadius: 12, borderWidth: 1, borderColor: '#edf2f9', justifyContent: 'center', alignItems: 'center', marginBottom: 15, backgroundColor: '#f8f9fc', padding: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    brandIconImage: { width: '100%', height: '100%' },
    
    sectionTitle: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50', letterSpacing: -0.5, marginBottom: 5 },
    sectionSubtitle: { fontSize: 12, color: '#6c757d', fontWeight: '500', textAlign: 'center', paddingHorizontal: 10 },
    
    inputGroup: { marginBottom: 25 },
    inputLabel: { fontSize: 11, fontWeight: 'bold', color: '#6c757d', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    inputCustom: { height: 50, backgroundColor: '#f8f9fc', borderRadius: 12, borderWidth: 1, borderColor: '#dee2e6', paddingHorizontal: 15, fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
    
    // 🔥 NUEVOS ESTILOS PARA LA LISTA 🔥
    optionsContainer: { marginTop: 5 },
    optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#dee2e6', borderRadius: 12, padding: 16, marginBottom: 10 },
    optionItemSelected: { borderColor: '#0d47a1', backgroundColor: '#f0f4fa', borderWidth: 2 },
    optionText: { fontSize: 15, fontWeight: '600', color: '#6c757d' },
    optionTextSelected: { color: '#0d47a1', fontWeight: 'bold' },
    checkIcon: { color: '#0d47a1', fontSize: 18, fontWeight: 'bold' },

    btnAction: { backgroundColor: '#e65100', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#e65100', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    btnActionDisabled: { backgroundColor: '#ffb74d', elevation: 0, shadowOpacity: 0 },
    btnActionText: { color: '#fff', fontWeight: 'bold', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
    
    termsText: { fontSize: 11, color: '#a0aec0', textAlign: 'center', marginTop: 20, fontWeight: '500', lineHeight: 16 }
});

export default Checkin;