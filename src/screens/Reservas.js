import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { API_URL } from '../config';
import { useGuardia } from '../hooks/useGuardia';

const SIGNALR_URL = API_URL.replace('/services/ApiMovil.ashx', '');
window.navigator.userAgent = 'react-native';
import signalr from 'react-native-signalr';

const Reservas = ({ navigation }) => {
    const { correoAuth, tokenAuth, verificandoGuardia } = useGuardia(navigation);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const [vuelos, setVuelos] = useState([]);
    const [clases, setClases] = useState([]);
    
    const [vueloElegido, setVueloElegido] = useState('');
    const [claseElegida, setClaseElegida] = useState('');
    const [asientosSeleccionados, setAsientosSeleccionados] = useState([]);
    const [asientosBloqueados, setAsientosBloqueados] = useState([]); 

    const [capacidad, setCapacidad] = useState(0);
    const [ocupados, setOcupados] = useState([]);
    const [mapaVisible, setMapaVisible] = useState(false);

    const proxyRef = useRef(null);
    const connectionRef = useRef(null);
    const vueloElegidoRef = useRef('');
    
    // 🔥 NUEVO: Refs para el temporizador y para saber qué teníamos seleccionado si nos salimos de la app
    const asientosSeleccionadosRef = useRef([]);
    const temporizadorRef = useRef(null);
    const TIEMPO_LIMITE = 30000; // 30 segundos

    useEffect(() => {
        vueloElegidoRef.current = vueloElegido;
    }, [vueloElegido]);

    // 🔥 NUEVO: Efecto que controla el reloj de arena cada vez que cambias tus asientos
    useEffect(() => {
        asientosSeleccionadosRef.current = asientosSeleccionados;

        // Limpiamos el reloj anterior si existe
        if (temporizadorRef.current) clearTimeout(temporizadorRef.current);

        // Si hay al menos un asiento, empezamos a contar 30 segundos
        if (asientosSeleccionados.length > 0) {
            temporizadorRef.current = setTimeout(() => {
                // 1. Soltar en SignalR usando los datos en el Ref
                asientosSeleccionadosRef.current.forEach(item => {
                    try {
                        if (proxyRef.current && connectionRef.current && connectionRef.current.state === 1) {
                            proxyRef.current.invoke('liberarAsientoTemporal', String(vueloElegidoRef.current), item.asiento);
                        }
                    } catch(e) {}
                });
                
                // 2. Limpiar pantalla
                setAsientosSeleccionados([]);
                Alert.alert("⏳ ¡Tiempo agotado!", "Has estado inactivo y tus asientos han sido liberados. Vuelve a seleccionarlos si deseas continuar.");
            }, TIEMPO_LIMITE);
        }
    }, [asientosSeleccionados]);

    // 🔥 NUEVO: El "beforeunload" de React Native. Se ejecuta si el usuario se va de la pantalla de golpe
    useEffect(() => {
        return () => {
            if (asientosSeleccionadosRef.current.length > 0) {
                asientosSeleccionadosRef.current.forEach(item => {
                    try {
                        if (proxyRef.current && connectionRef.current && connectionRef.current.state === 1) {
                            proxyRef.current.invoke('liberarAsientoTemporal', String(vueloElegidoRef.current), item.asiento);
                        }
                    } catch(e) {}
                });
            }
            if (temporizadorRef.current) clearTimeout(temporizadorRef.current);
        };
    }, []);

useEffect(() => {
    let connectionRefLocal = null;

    const arrancarSignalR = async () => {
        // Obtenemos la base: http://192.168.1.15:44356/services
     const baseUrl = API_URL.replace('/services/ApiMovil.ashx', '');

        console.log("🔌 Conectando directamente a:", baseUrl);

        const connection = signalr.hubConnection(baseUrl);
        
        // 🔥 ESTO ES LO QUE SOLUCIONA EL DEPLOY EN SUB-CARPETAS
        // Le dice a la librería: "Busca el /negotiate exactamente aquí"
        connection.url = `${baseUrl}/signalr`; 

        connectionRef.current = connection;
        connectionRefLocal = connection;
        
        const proxy = connection.createHubProxy('asientosHub');
        proxyRef.current = proxy;

        // --- Listeners ---
        proxy.on('alguienBloqueoAsiento', (vuelo, asiento) => {
            if (String(vueloElegidoRef.current) === String(vuelo)) {
                setAsientosBloqueados(prev => !prev.includes(asiento) ? [...prev, asiento] : prev);
            }
        });

        proxy.on('alguienLiberoAsiento', (vuelo, asiento) => {
            if (String(vueloElegidoRef.current) === String(vuelo)) {
                setAsientosBloqueados(prev => prev.filter(a => a !== asiento));
            }
        });

        // --- Inicio de Conexión ---
        // Usamos solo longPolling para asegurar compatibilidad en redes locales/VPN
connection.start({ transport: ['longPolling', 'webSockets'], withCredentials: false })
            .done(() => console.log('📡 SignalR Conectado con ÉXITO'))
            .fail(error => console.log('📡 ERROR DE NEGOCIACIÓN:', error));
    };

    arrancarSignalR();
    return () => { if (connectionRefLocal) connectionRefLocal.stop(); };
}, []);
    useEffect(() => {
        if (!verificandoGuardia && correoAuth && tokenAuth) {
            cargarIniciales(correoAuth, tokenAuth);
        }
    }, [verificandoGuardia, correoAuth, tokenAuth]);

    const cargarIniciales = async (email, token) => {
        try {
            const formVuelos = new FormData();
            formVuelos.append('action', 'vuelos_disponibles');
            formVuelos.append('email', String(email));
            formVuelos.append('token', String(token));

            const formClases = new FormData();
            formClases.append('action', 'clases_disponibles');
            formClases.append('email', String(email));
            formClases.append('token', String(token));

            const [resVuelos, resClases] = await Promise.all([
                axios.post(API_URL, formVuelos, { headers: { 'Content-Type': 'multipart/form-data' } }),
                axios.post(API_URL, formClases, { headers: { 'Content-Type': 'multipart/form-data' } })
            ]);

            if (resVuelos.data.success) {
                const listaLimpia = resVuelos.data.vuelos.map(v => {
                    const valores = Object.values(v);
                    let idVal = v.ID_VUELO || v.id_vuelo || v.IdVuelo || valores[0];
                    let detVal = v.DETALLE || v.detalle || v.Detalle || valores[1];

                    if (isNaN(parseInt(idVal, 10)) && !isNaN(parseInt(valores[1], 10))) {
                        idVal = valores[1];
                        detVal = valores[0];
                    }

                    return {
                        id_vuelo: String(idVal),
                        detalle: String(detVal || 'Vuelo sin detalle')
                    };
                });
                setVuelos(listaLimpia); 
            } else {
                Alert.alert("⚠️ Error", resVuelos.data.mensaje || "El servidor rechazó la petición de vuelos.");
            }

            if (resClases.data.success) {
                const clasesLimpias = resClases.data.clases.map(c => {
                    const val = Object.values(c);
                    return {
                        id_tipo_boleto: String(c.ID_TIPO_BOLETO || c.id_tipo_boleto || val[0]),
                        nombre: String(c.NOMBRE || c.nombre || val[1])
                    };
                });
                setClases(clasesLimpias);
            }
        } catch (error) {
            Alert.alert("🔌 Error de Conexión", "Verifica tu conexión.");
        } finally { setCargando(false); }
    };

  useFocusEffect(
        useCallback(() => {
            let interval;
            if (!verificandoGuardia && vueloElegido && correoAuth && tokenAuth) {
                const sincronizarAsientos = async () => {
                    try {
                        const formData = new FormData();
                        formData.append('action', 'mapa_asientos');
                        formData.append('idVuelo', String(vueloElegido));
                        formData.append('email', String(correoAuth));
                        formData.append('token', String(tokenAuth));

                        const res = await axios.post(API_URL, formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });

                        if (res.data.success) {
                            const ocupadosDB = res.data.ocupados || res.data.Ocupados || [];
                            const bloqueadosDB = res.data.bloqueados || res.data.Bloqueados || [];
                            
                            setOcupados(ocupadosDB);
                            
                            // 🔥 Actualizamos la pantalla de la App con los bloqueos de la Web
                            setAsientosBloqueados(bloqueadosDB);

                            // Verificamos si alguien compró nuestro asiento
                            setAsientosSeleccionados(prevSeleccionados => {
                                const asientosPerdidos = prevSeleccionados.filter(a => ocupadosDB.includes(a.asiento));
                                if (asientosPerdidos.length > 0) {
                                    const nombresPerdidos = asientosPerdidos.map(a => a.asiento).join(', ');
                                    setTimeout(() => {
                                        Alert.alert("¡Asiento Ocupado!", `La Web (o alguien más) acaba de pagar el asiento ${nombresPerdidos}.`);
                                    }, 200);
                                    return prevSeleccionados.filter(a => !ocupadosDB.includes(a.asiento));
                                }
                                return prevSeleccionados;
                            });
                        }
                    } catch (error) {}
                };
                
                // 🔥 Radar rápido: cada 2.5 segundos (2500ms) en lugar de 30s
                interval = setInterval(sincronizarAsientos, 500);
            }
            return () => { if (interval) clearInterval(interval); };
        }, [vueloElegido, correoAuth, tokenAuth, verificandoGuardia])
    );

   const handleVueloChange = async (idVuelo) => {
        setVueloElegido(idVuelo);
        setAsientosSeleccionados([]);
        setAsientosBloqueados([]); 
        if (!idVuelo) { setMapaVisible(false); return; }

        setCargando(true);
        try {
            const formData = new FormData();
            formData.append('action', 'mapa_asientos');
            formData.append('idVuelo', String(idVuelo));
            formData.append('email', String(correoAuth));
            formData.append('token', String(tokenAuth));

            const resMapa = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (resMapa.data.success) {
                // Soportamos mayúsculas o minúsculas por si el backend serializa distinto
                setCapacidad(resMapa.data.capacidad || resMapa.data.Capacidad || 0);
                setOcupados(resMapa.data.ocupados || resMapa.data.Ocupados || []);
                
                // 🔥 EL PUENTE: Leemos los bloqueados que vienen desde la Web/Servidor
                setAsientosBloqueados(resMapa.data.bloqueados || resMapa.data.Bloqueados || []);
                
                setMapaVisible(true);
            } else {
                Alert.alert("Error", resMapa.data.mensaje || "No se pudo cargar el mapa.");
            }
        } catch (error) { 
            Alert.alert("Error de Conexión", "No se pudo comunicar con el servidor."); 
        } finally { setCargando(false); }
    };
const notificarSignalR = (accion, idVuelo, asiento) => {
    if (!connectionRef.current || !proxyRef.current) return;

    // Usamos PascalCase para coincidir exactamente con el Sub de VB.NET
    let metodoReal = accion === 'bloquear' ? 'BloquearAsientoTemporal' : 'LiberarAsientoTemporal';
    
    console.log(`📡 Intentando enviar: ${metodoReal} -> Vuelo: ${idVuelo}, Asiento: ${asiento}`);

    // Estado 1 = Conectado
    if (connectionRef.current.state === 1) {
        proxyRef.current.invoke(metodoReal, String(idVuelo), String(asiento))
            .done(() => {
                // ✅ CORRECTO: .done en lugar de .then
                console.log("✅ Servidor recibió el mensaje correctamente");
            })
            .fail((e) => {
                // ✅ CORRECTO: .fail en lugar de .catch
                console.log("❌ Error en invoke:", e);
            });
    } 
    // Estado 4 = Desconectado
    else if (connectionRef.current.state === 4) {
        console.log("⚠️ SignalR estaba dormido (Estado 4). Despertando...");
        
        connectionRef.current.start({ transport: ['longPolling', 'webSockets'], withCredentials: false })
            .done(() => {
                console.log("📡 Reconexión exitosa, enviando comando...");
                proxyRef.current.invoke(metodoReal, String(idVuelo), String(asiento))
                    .done(() => console.log("✅ ¡Aviso enviado tras reconectar!"))
                    .fail((e) => console.log("❌ Fallo tras reconectar:", e));
            })
            .fail((error) => {
                console.log("❌ No se pudo reconectar:", error);
            });
    } else {
        console.log(`⏳ Conexión en estado transitorio (${connectionRef.current.state}). Intento ignorado.`);
    }
};
    const toggleAsiento = (asiento, idClase, precio) => {
        if (claseElegida !== '' && parseInt(claseElegida) !== idClase) return;

        const yaSeleccionado = asientosSeleccionados.find(a => a.asiento === asiento);
        
        if (yaSeleccionado) {
            setAsientosSeleccionados(prev => prev.filter(a => a.asiento !== asiento));
            // Le decimos a nuestra función que use la acción "liberar"
            notificarSignalR('liberar', vueloElegido, asiento);
        } else {
            setAsientosSeleccionados(prev => [...prev, { asiento, id_clase: idClase, precio }]);
            // Le decimos a nuestra función que use la acción "bloquear"
            notificarSignalR('bloquear', vueloElegido, asiento);
        }
    };
    const confirmarReserva = async () => {
        if (!vueloElegido) { Alert.alert("Atención", "Selecciona un vuelo."); return; }
        if (asientosSeleccionados.length === 0) { Alert.alert("Atención", "Selecciona al menos un asiento."); return; }

        if (isNaN(parseInt(vueloElegido, 10))) {
            Alert.alert("🚨 Error Interno", `El ID del vuelo (${vueloElegido}) no es válido. Reportar a sistemas.`);
            return;
        }

        setGuardando(true);
        try {
            const asientosFormateados = asientosSeleccionados.map(item => `${item.asiento}:${item.id_clase}`);

            const formData = new FormData();
            formData.append('action', 'procesar_reserva');
            formData.append('email', String(correoAuth));
            formData.append('token', String(tokenAuth));
            formData.append('idVuelo', String(vueloElegido)); 
            formData.append('asientos', asientosFormateados.join(','));

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                const codigo = response.data.codigo || response.data.codigo_reserva;
                
                // 🔥 NUEVO: Limpiamos los seleccionados antes de cambiar de pantalla para que el reloj se apague
                setAsientosSeleccionados([]); 

                Alert.alert(
                    "¡Reserva Confirmada! 🎉", `Tu localizador es: ${codigo}\n¿Deseas pagar ahora?`,
                    [
                        { text: "Pagar luego", onPress: () => navigation.navigate('MisBoletos'), style: "cancel" },
                        { text: "Pagar ahora", onPress: () => navigation.navigate('Pagos', { codigo }) }
                    ]
                );
            } else { 
                Alert.alert("Error", response.data.mensaje); 
            }
        } catch (error) {
            console.log(error);
            Alert.alert("Error de Conexión", "Revisa la consola para más detalles de tu backend.");
        } finally { setGuardando(false); }
    };

    const renderAvion = () => {
        if (!mapaVisible || capacidad === 0) return null;

        const totalFilas = Math.ceil(capacidad / 4.0);
        const limitePrimera = Math.ceil(totalFilas * 0.1);
        const limiteEjecutiva = Math.ceil(totalFilas * 0.3);
        const letras = ['A', 'B', 'C', 'D'];
        
        let asientoActual = 1;
        let filasHTML = [];

        for (let fila = 1; fila <= totalFilas; fila++) {
            let rowSeats = [];
            let claseCSS, precio, idClaseAsiento;
            
            if (fila <= limitePrimera) { claseCSS = styles.seatPrimera; precio = 950.0; idClaseAsiento = 3; } 
            else if (fila <= limiteEjecutiva) { claseCSS = styles.seatEjecutiva; precio = 550.0; idClaseAsiento = 2; } 
            else { claseCSS = styles.seatEconomica; precio = 250.0; idClaseAsiento = 1; }

            for (let col = 0; col < 4; col++) {
                if (asientoActual > capacidad) break;
                
                const codigoAsiento = `${fila}${letras[col]}`;
                const isOcupado = ocupados.includes(codigoAsiento);
                const isSeleccionado = asientosSeleccionados.find(a => a.asiento === codigoAsiento);
                const isLockedByOther = asientosBloqueados.includes(codigoAsiento) && !isSeleccionado;
                const isDimmed = !isOcupado && claseElegida !== '' && parseInt(claseElegida) !== idClaseAsiento;

                let seatStyle = [styles.seat, claseCSS];
                let seatText = codigoAsiento;
                
                if (isOcupado) seatStyle.push(styles.seatOccupied);
                else if (isSeleccionado) { seatStyle.push(styles.seatSelected); seatText = '✓'; } 
                else if (isLockedByOther) { seatStyle.push(styles.seatLocked); seatText = '🔒'; } 
                else if (isDimmed) seatStyle.push(styles.seatDimmed);

                rowSeats.push(
                    <TouchableOpacity 
                        key={codigoAsiento} style={seatStyle} activeOpacity={0.7}
                        disabled={isOcupado || isDimmed || isLockedByOther}
                        onPress={() => toggleAsiento(codigoAsiento, idClaseAsiento, precio)}
                    >
                        <Text style={[styles.seatText, isOcupado && styles.seatTextOccupied, isSeleccionado && styles.seatTextSelected, isDimmed && styles.seatTextDimmed, isLockedByOther && styles.seatTextLocked ]}>
                            {seatText}
                        </Text>
                    </TouchableOpacity>
                );

                if (col === 1) rowSeats.push(<View key={`pasillo-${fila}`} style={styles.aisle} />);
                asientoActual++;
            }
            filasHTML.push(<View key={`fila-${fila}`} style={styles.seatRow}>{rowSeats}</View>);
        }
        return <View style={styles.planeFuselage}>{filasHTML}</View>;
    };

    const totalPagar = asientosSeleccionados.reduce((sum, item) => sum + item.precio, 0);

    if (verificandoGuardia || (cargando && vuelos.length === 0)) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#0d47a1" />
                <Text style={{ marginTop: 15, color: '#6c757d', fontWeight: 'bold' }}>Sincronizando itinerarios...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <View style={styles.topBarLeft}>
                    <Image source={require('../../assets/icon.png')} style={styles.brandIconMini} />
                    <Text style={styles.topBarTitle}>Portal de Reservas</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Inicio</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                
                <View style={styles.bookingCard}>
                    
                    <View style={styles.headerContainer}>
                        <View style={styles.headerAccent} />
                        <Text style={styles.mainTitle}>Encuentre su Destino</Text>
                        <Text style={styles.subTitle}>Gestión de itinerarios en tiempo real</Text>
                    </View>

                    <Text style={styles.sectionSubtitle}>1. PARÁMETROS DEL VIAJE</Text>
                    
                    <Text style={styles.labelCustom}>Vuelos Disponibles</Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={vueloElegido} onValueChange={handleVueloChange} dropdownIconColor="#0d47a1">
                            <Picker.Item label="-- Seleccione su vuelo --" value="" color="#888" />
                            {vuelos.map((v) => (
                                <Picker.Item key={v.id_vuelo} label={v.detalle} value={v.id_vuelo} />
                            ))}
                        </Picker>
                    </View>

                    {mapaVisible && (
                        <>
                            <Text style={[styles.labelCustom, { marginTop: 20 }]}>Clase de Cabina Preferida</Text>
                            <View style={styles.pickerContainer}>
                                <Picker selectedValue={claseElegida} onValueChange={setClaseElegida} dropdownIconColor="#0d47a1">
                                    <Picker.Item label="-- Mostrar Todo --" value="" color="#888" />
                                    {clases.map((c) => (
                                        <Picker.Item key={c.id_tipo_boleto} label={c.nombre} value={c.id_tipo_boleto} />
                                    ))}
                                </Picker>
                            </View>

                            <Text style={[styles.sectionSubtitle, { marginTop: 40, textAlign: 'center' }]}>2. SELECCIÓN DE UBICACIÓN</Text>
                            
                            <View style={styles.leyendaContainer}>
                                <View style={styles.leyendaItem}><View style={[styles.leyendaCaja, { backgroundColor: '#fffdf0', borderColor: '#ffd700' }]} /><Text style={styles.leyendaTexto}> Primera</Text></View>
                                <View style={styles.leyendaItem}><View style={[styles.leyendaCaja, { backgroundColor: '#fdf0ff', borderColor: '#ab47bc' }]} /><Text style={styles.leyendaTexto}> Ejecutiva</Text></View>
                                <View style={styles.leyendaItem}><View style={[styles.leyendaCaja, { backgroundColor: '#f0f7ff', borderColor: '#0d47a1' }]} /><Text style={styles.leyendaTexto}> Económica</Text></View>
                                <View style={styles.leyendaItem}><View style={[styles.leyendaCaja, { backgroundColor: '#f1f3f5', borderColor: '#dee2e6', borderStyle: 'dashed' }]} /><Text style={styles.leyendaTexto}> Ocupado</Text></View>
                                <View style={styles.leyendaItem}><View style={[styles.leyendaCaja, { backgroundColor: '#e65100', borderColor: '#bf360c' }]} /><Text style={styles.leyendaTexto}> Bloqueado</Text></View>
                            </View>

                            {cargando ? (
                                <ActivityIndicator size="large" color="#0d47a1" style={{ marginVertical: 30 }} />
                            ) : (
                                renderAvion()
                            )}

                            {asientosSeleccionados.length > 0 && (
                                <View style={styles.priceBox}>
                                    <Text style={styles.labelCustom}>INVERSIÓN ESTIMADA</Text>
                                    <Text style={styles.priceNumber}>Q {totalPagar.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Text>
                                    <Text style={styles.priceDetail}>{asientosSeleccionados.length} asiento(s) seleccionado(s)</Text>
                                </View>
                            )}

                            <TouchableOpacity 
                                style={[styles.btnAuroraBook, asientosSeleccionados.length === 0 && styles.btnAuroraBookDisabled]} 
                                onPress={confirmarReserva} disabled={asientosSeleccionados.length === 0 || guardando}
                            >
                                {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnAuroraBookText}>CONFIRMAR RESERVA</Text>}
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fc' },
    topBar: { backgroundColor: '#2c3e50', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, elevation: 5 },
    topBarLeft: { flexDirection: 'row', alignItems: 'center' },
    brandIconMini: { width: 30, height: 30, borderRadius: 6, marginRight: 10, backgroundColor: 'white' },
    topBarTitle: { color: 'white', fontSize: 15, fontWeight: 'bold' },
    btnVolver: { borderColor: '#bdc3c7', borderWidth: 1, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
    btnVolverText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    bookingCard: { backgroundColor: 'white', borderRadius: 15, padding: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 3, borderWidth: 1, borderColor: '#edf2f9', marginBottom: 20 },
    headerContainer: { alignItems: 'center', marginBottom: 35 },
    headerAccent: { width: 60, height: 5, backgroundColor: '#0d47a1', borderRadius: 10, marginBottom: 15 },
    mainTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', letterSpacing: -0.5 },
    subTitle: { color: '#6c757d', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 5, fontWeight: 'bold' },
    sectionSubtitle: { fontSize: 13, fontWeight: '800', color: '#0d47a1', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 15 },
    labelCustom: { fontSize: 11, fontWeight: '800', color: '#6c757d', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    pickerContainer: { height: 48, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#dee2e6', justifyContent: 'center' },
    leyendaContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 25, gap: 12 },
    leyendaItem: { flexDirection: 'row', alignItems: 'center' },
    leyendaCaja: { width: 12, height: 12, borderRadius: 3, borderWidth: 1 },
    leyendaTexto: { fontSize: 10, fontWeight: '800', color: '#6c757d', textTransform: 'uppercase' },
    planeFuselage: { backgroundColor: '#ffffff', borderRadius: 50, borderBottomLeftRadius: 15, borderBottomRightRadius: 15, paddingVertical: 40, paddingHorizontal: 20, borderWidth: 1, borderColor: '#dee2e6', alignSelf: 'center', minWidth: 260, shadowColor: '#000', shadowOpacity: 0.02, elevation: 1 },
    seatRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
    aisle: { width: 25 },
    seat: { width: 38, height: 38, borderRadius: 8, marginHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: 'white' },
    seatText: { fontSize: 10, fontWeight: '800', color: '#2c3e50' },
    seatPrimera: { borderBottomWidth: 3, borderBottomColor: '#ffd700', backgroundColor: '#fffdf0' },
    seatEjecutiva: { borderBottomWidth: 3, borderBottomColor: '#ab47bc', backgroundColor: '#fdf0ff' },
    seatEconomica: { borderBottomWidth: 3, borderBottomColor: '#0d47a1', backgroundColor: '#f0f7ff' },
    seatOccupied: { backgroundColor: '#f1f3f5', borderColor: '#dee2e6', borderStyle: 'dashed' },
    seatTextOccupied: { color: '#adb5bd', textDecorationLine: 'line-through' },
    seatSelected: { backgroundColor: '#0d47a1', borderColor: '#0d47a1', transform: [{ scale: 1.1 }] },
    seatTextSelected: { color: 'white', fontSize: 14 },
    seatLocked: { backgroundColor: '#e65100', borderColor: '#bf360c' },
    seatTextLocked: { color: 'white', fontSize: 12 },
    seatDimmed: { opacity: 0.2 },
    seatTextDimmed: { color: '#2c3e50' },
    priceBox: { backgroundColor: '#f8f9fc', borderColor: '#edf2f9', borderWidth: 1, borderRadius: 12, padding: 20, marginTop: 30, alignItems: 'center' },
    priceNumber: { fontSize: 26, color: '#2c3e50', fontWeight: '900', marginVertical: 5 },
    priceDetail: { fontSize: 12, color: '#6c757d', fontWeight: 'bold' },
    btnAuroraBook: { backgroundColor: '#0d47a1', height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 25, shadowColor: '#0d47a1', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    btnAuroraBookDisabled: { backgroundColor: '#bdc3c7', shadowOpacity: 0 },
    btnAuroraBookText: { color: 'white', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }
});

export default Reservas;