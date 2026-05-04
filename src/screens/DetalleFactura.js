import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../config';

// 1. Importas a tu guardia
import { useGuardia } from '../hooks/useGuardia'; 

const DetalleFactura = ({ route, navigation }) => {
    // 2. Contratas al guardia y le pides los datos
    const { correoAuth, tokenAuth, verificandoGuardia } = useGuardia(navigation);

    const { id_factura } = route.params; 
    const [cabecera, setCabecera] = useState(null);
    const [detalles, setDetalles] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [generandoPDF, setGenerandoPDF] = useState(false);

    // 3. Esperamos al guardia antes de cargar
    useEffect(() => {
        if (!verificandoGuardia && correoAuth && tokenAuth) {
            cargarFactura();
        }
    }, [verificandoGuardia, correoAuth, tokenAuth]);

    const cargarFactura = async () => {
        try {
            const formData = new FormData();
            formData.append('action', 'detalle_factura'); 
            formData.append('idFactura', id_factura);
            formData.append('email', correoAuth);
            formData.append('token', tokenAuth);

            const response = await axios.post(API_URL, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                setCabecera(response.data.cabecera);
                setDetalles(response.data.detalles);
            } else {
                Alert.alert("Error", response.data.mensaje);
            }
        } catch (error) {
            console.log("Error cargando factura:", error);
        } finally {
            setCargando(false);
        }
    };

    const generarPDF = async () => {
        setGenerandoPDF(true);
        try {
            const filasTabla = detalles.map(item => `
                <tr>
                    <td style="color: #2c3e50; font-weight: bold;">${item.descripcion}</td>
                    <td class="text-center">${item.cantidad}</td>
                    <td class="text-right text-secondary">Q ${parseFloat(item.subtotal).toFixed(2)}</td>
                </tr>
            `).join('');

            // 🔥 HTML DEL PDF ACTUALIZADO AL NUEVO DISEÑO 🔥
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #2c3e50; }
                        .header { border-bottom: 3px solid #2c3e50; padding-bottom: 20px; margin-bottom: 30px; }
                        .title { color: #2c3e50; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
                        .subtitle { color: #6c757d; font-size: 12px; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px; }
                        .info-table { width: 100%; margin-bottom: 40px; border-collapse: collapse; }
                        .info-table td { padding: 5px; vertical-align: top; }
                        .label { font-size: 11px; color: #6c757d; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
                        .value { font-size: 15px; font-weight: bold; color: #2c3e50; margin-bottom: 15px; }
                        .main-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                        .main-table th { background-color: #f8f9fc; padding: 15px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6c757d; border-bottom: 2px solid #edf2f9; letter-spacing: 1px; }
                        .main-table td { padding: 15px; border-bottom: 1px solid #f1f3f5; font-size: 14px; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .text-secondary { color: #6c757d; }
                        .total-row { background-color: #f8f9fc; }
                        .total-label { font-size: 18px; font-weight: 800; color: #2c3e50; padding: 20px 15px; }
                        .total-value { font-size: 22px; font-weight: 800; color: #0d47a1; padding: 20px 15px; }
                        .badge { background-color: #e0f2f1; color: #00695c; padding: 8px 15px; border-radius: 20px; font-size: 12px; font-weight: 800; display: inline-block; letter-spacing: 1px; }
                        .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #6c757d; border-top: 2px solid #bdc3c7; padding-top: 20px; width: 60%; margin-left: auto; margin-right: auto; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <table style="width: 100%;">
                            <tr>
                                <td>
                                    <div class="title">LA AURORA AIRLINES</div>
                                    <div class="subtitle">GUA • Aeropuerto Internacional, Guatemala</div>
                                </td>
                                <td class="text-right">
                                    <div class="label" style="margin-bottom: 5px;">NÚMERO DE DOCUMENTO</div>
                                    <div class="title" style="font-size: 22px;">${cabecera.numero_factura}</div>
                                    <div style="margin-top: 10px;"><span class="badge">PAGADO</span></div>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <table class="info-table">
                        <tr>
                            <td style="width: 50%;">
                                <div class="label">Facturado a:</div>
                                <div class="value">${cabecera.cliente}</div>
                                <div class="label">Correo Electrónico:</div>
                                <div class="value">${cabecera.correo}</div>
                            </td>
                            <td style="width: 50%; text-align: right;">
                                <div class="label">Fecha de Emisión:</div>
                                <div class="value">${new Date(cabecera.fecha_emision).toLocaleDateString()}</div>
                                <div class="label">Moneda:</div>
                                <div class="value">Quetzales (GTQ)</div>
                            </td>
                        </tr>
                    </table>

                    <table class="main-table">
                        <thead>
                            <tr>
                                <th>Descripción del Servicio</th>
                                <th class="text-center">Cant.</th>
                                <th class="text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filasTabla}
                            <tr class="total-row">
                                <td colspan="2" class="text-right total-label">TOTAL LIQUIDADO:</td>
                                <td class="text-right total-value">Q ${parseFloat(cabecera.total).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="footer">
                        <p style="color: #2c3e50; font-weight: bold; font-size: 14px; margin-bottom: 5px;">¡Gracias por volar con nosotros!</p>
                        <p>Este documento es un comprobante de pago válido generado por el sistema central del Aeropuerto La Aurora GUA.</p>
                    </div>
                </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ 
                html: htmlContent,
                base64: false 
            });

            const isSharingAvailable = await Sharing.isAvailableAsync();
            if (isSharingAvailable) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Guardar o Compartir Factura',
                    UTI: 'com.adobe.pdf' 
                });
            } else {
                Alert.alert("Aviso", "No se puede compartir o guardar el archivo en este dispositivo.");
            }

        } catch (error) {
            console.error("Error generando PDF: ", error);
            Alert.alert("Error", "Ocurrió un problema al intentar generar el PDF.");
        } finally {
            setGenerandoPDF(false);
        }
    };

    if (verificandoGuardia || cargando) return <ActivityIndicator size="large" color="#2c3e50" style={{ flex: 1, justifyContent: 'center' }} />;
    if (!cabecera) return <Text style={{ textAlign: 'center', marginTop: 50 }}>Factura no encontrada.</Text>;

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Cerrar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.btnPrint} 
                    onPress={generarPDF}
                    disabled={generandoPDF}
                >
                    {generandoPDF ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.btnVolverText}>🖨️ Guardar PDF</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <View style={styles.invoiceBox}>
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>LA AURORA AIRLINES</Text>
                            <Text style={styles.subTitle}>GUA • Aeropuerto Internacional</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.label}>DOCUMENTO</Text>
                            <Text style={styles.facNumber}>{cabecera.numero_factura}</Text>
                            <View style={styles.badgeContainer}>
                                <Text style={styles.badge}>PAGADO</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Facturado a:</Text>
                            <Text style={styles.value}>{cabecera.cliente}</Text>
                            <Text style={styles.label}>Correo:</Text>
                            <Text style={styles.value}>{cabecera.correo}</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={styles.label}>Fecha:</Text>
                            <Text style={styles.value}>{new Date(cabecera.fecha_emision).toLocaleDateString()}</Text>
                            <Text style={styles.label}>Moneda:</Text>
                            <Text style={styles.value}>Quetzales (GTQ)</Text>
                        </View>
                    </View>

                    <View style={styles.table}>
                        <View style={styles.tableHead}>
                            <Text style={[styles.th, { flex: 2 }]}>Descripción</Text>
                            <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Cant.</Text>
                            <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Subtotal</Text>
                        </View>

                        {detalles.map((item, index) => (
                            <View key={index} style={styles.tableRow}>
                                <Text style={[styles.td, { flex: 2, fontWeight: 'bold', color: '#2c3e50' }]}>{item.descripcion}</Text>
                                <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>{item.cantidad}</Text>
                                <Text style={[styles.td, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>
                                    Q {parseFloat(item.subtotal).toFixed(2)}
                                </Text>
                            </View>
                        ))}

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>TOTAL LIQUIDADO:</Text>
                            <Text style={styles.totalValue}>Q {parseFloat(cabecera.total).toFixed(2)}</Text>
                        </View>
                    </View>

                    <View style={styles.footerContainer}>
                        <View style={styles.footerLine} />
                        <Text style={styles.footerTextBold}>¡Gracias por volar con nosotros!</Text>
                        <Text style={styles.footerText}>Este documento es un comprobante de pago válido.</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fc' }, // Fondo web
    topBar: { backgroundColor: '#2c3e50', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between' }, // Tono carbón
    btnVolver: { borderColor: 'white', borderWidth: 1, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    btnPrint: { backgroundColor: '#1a252f', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, minWidth: 120, alignItems: 'center' }, // Botón ligeramente más oscuro que la barra
    btnVolverText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

    invoiceBox: { backgroundColor: 'white', borderRadius: 15, padding: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 3, borderWidth: 1, borderColor: '#edf2f9' },
    header: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 3, borderBottomColor: '#2c3e50', paddingBottom: 15, marginBottom: 20 },
    title: { fontSize: 20, fontWeight: '900', color: '#2c3e50', letterSpacing: -0.5 },
    subTitle: { fontSize: 10, color: '#6c757d', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
    facNumber: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
    
    badgeContainer: { marginTop: 5 },
    badge: { backgroundColor: '#e0f2f1', color: '#00695c', fontWeight: '800', fontSize: 10, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 15, overflow: 'hidden', letterSpacing: 1 },

    infoRow: { flexDirection: 'row', marginBottom: 25 },
    label: { fontSize: 10, fontWeight: '800', color: '#6c757d', textTransform: 'uppercase', marginTop: 5, letterSpacing: 1 },
    value: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50' },

    table: { borderRadius: 10, overflow: 'hidden', backgroundColor: 'white' },
    tableHead: { flexDirection: 'row', backgroundColor: '#f8f9fc', padding: 15 },
    th: { fontSize: 11, fontWeight: '800', color: '#6c757d', textTransform: 'uppercase', letterSpacing: 1 },
    tableRow: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
    td: { fontSize: 13, color: '#6c757d' },
    
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fc', padding: 20 },
    totalLabel: { fontSize: 15, fontWeight: '800', color: '#2c3e50' },
    totalValue: { fontSize: 20, fontWeight: '900', color: '#0d47a1' },

    footerContainer: { alignItems: 'center', marginTop: 40 },
    footerLine: { height: 2, width: 40, backgroundColor: '#bdc3c7', marginBottom: 15 },
    footerTextBold: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50', marginBottom: 4 },
    footerText: { textAlign: 'center', fontSize: 11, color: '#6c757d' }
});

export default DetalleFactura;