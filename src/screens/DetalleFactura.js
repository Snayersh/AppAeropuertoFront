import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../config';

const DetalleFactura = ({ route, navigation }) => {
    const { id_factura } = route.params; 
    const [cabecera, setCabecera] = useState(null);
    const [detalles, setDetalles] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [generandoPDF, setGenerandoPDF] = useState(false);

    useEffect(() => {
        cargarFactura();
    }, []);

    const cargarFactura = async () => {
        try {
            // Ya con la ruta corregida hacia /detalle/
            const response = await axios.get(`${API_URL}/pagos/detalle/${id_factura}`);
            if (response.data.success) {
                setCabecera(response.data.cabecera);
                setDetalles(response.data.detalles);
            }
        } catch (error) {
            console.log("Error cargando factura:", error);
        } finally {
            setCargando(false);
        }
    };

    // 🔥 NUEVA FUNCIÓN: Generar y Compartir PDF
    const generarPDF = async () => {
        setGenerandoPDF(true);
        try {
            // 1. Armamos las filas de la tabla leyendo los detalles
            const filasTabla = detalles.map(item => `
                <tr>
                    <td>${item.DESCRIPCION || item.descripcion}</td>
                    <td class="text-center">${item.CANTIDAD || item.cantidad}</td>
                    <td class="text-right font-bold">Q ${parseFloat(item.SUBTOTAL || item.subtotal).toFixed(2)}</td>
                </tr>
            `).join('');

            // 2. Armamos el diseño de la hoja (HTML + CSS)
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; }
                        .header { border-bottom: 3px solid #0d47a1; padding-bottom: 10px; margin-bottom: 20px; }
                        .title { color: #0d47a1; font-size: 26px; font-weight: 900; letter-spacing: 1px; }
                        .subtitle { color: #777; font-size: 14px; margin-top: 5px; }
                        .info-table { width: 100%; margin-bottom: 30px; border-collapse: collapse; }
                        .info-table td { padding: 5px; vertical-align: top; }
                        .label { font-size: 11px; color: #777; font-weight: bold; text-transform: uppercase; }
                        .value { font-size: 15px; font-weight: bold; color: #333; margin-bottom: 10px; }
                        .main-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                        .main-table th { background-color: #f8f9fa; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #ddd; }
                        .main-table td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .font-bold { font-weight: bold; }
                        .total-row { background-color: #f8f9fa; }
                        .total-label { font-size: 16px; font-weight: bold; color: #555; }
                        .total-value { font-size: 20px; font-weight: bold; color: #0d47a1; }
                        .badge { background-color: #28a745; color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px; font-weight: bold; display: inline-block; }
                        .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #777; font-style: italic; border-top: 1px solid #eee; padding-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <table style="width: 100%;">
                            <tr>
                                <td>
                                    <div class="title">✈️ LA AURORA</div>
                                    <div class="subtitle">Aeropuerto Internacional, Guatemala</div>
                                </td>
                                <td class="text-right">
                                    <div class="title" style="color: #333;">${cabecera.NUMERO_FACTURA || cabecera.numero_factura}</div>
                                    <div class="badge">PAGADO</div>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <table class="info-table">
                        <tr>
                            <td style="width: 50%;">
                                <div class="label">Facturado a:</div>
                                <div class="value">${cabecera.CLIENTE || cabecera.cliente}</div>
                                <div class="label">Correo:</div>
                                <div class="value">${cabecera.CORREO || cabecera.correo}</div>
                            </td>
                            <td style="width: 50%; text-align: right;">
                                <div class="label">Fecha de Emisión:</div>
                                <div class="value">${new Date(cabecera.FECHA_EMISION || cabecera.fecha_emision).toLocaleDateString()}</div>
                                <div class="label">Moneda:</div>
                                <div class="value">Quetzales (GTQ)</div>
                            </td>
                        </tr>
                    </table>

                    <table class="main-table">
                        <thead>
                            <tr>
                                <th>Descripción</th>
                                <th class="text-center">Cant.</th>
                                <th class="text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filasTabla}
                            <tr class="total-row">
                                <td colspan="2" class="text-right total-label">TOTAL PAGADO:</td>
                                <td class="text-right total-value">Q ${parseFloat(cabecera.TOTAL || cabecera.total).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="footer">
                        <p><strong>¡Gracias por volar con nosotros!</strong></p>
                        <p>Este documento es un comprobante de pago electrónico válido. Consérvelo para cualquier aclaración.</p>
                    </div>
                </body>
                </html>
            `;

            // 3. Generamos el archivo PDF en la memoria oculta de la app
            const { uri } = await Print.printToFileAsync({ 
                html: htmlContent,
                base64: false 
            });

            // 4. Verificamos si el dispositivo permite compartir archivos
            const isSharingAvailable = await Sharing.isAvailableAsync();
            if (isSharingAvailable) {
                // Abrimos el menú del celular (WhatsApp, Guardar en Archivos, Correo, etc.)
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Guardar o Compartir Factura',
                    UTI: 'com.adobe.pdf' // Etiqueta especial para que los iPhone reconozcan que es un PDF
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

    if (cargando) return <ActivityIndicator size="large" color="#0d47a1" style={{ flex: 1, justifyContent: 'center' }} />;
    if (!cabecera) return <Text style={{ textAlign: 'center', marginTop: 50 }}>Factura no encontrada.</Text>;

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
                    <Text style={styles.btnVolverText}>← Cerrar</Text>
                </TouchableOpacity>
                
                {/* 🔥 BOTÓN ACTUALIZADO PARA DISPARAR LA FUNCIÓN */}
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
                        <View>
                            <Text style={styles.title}>✈️ LA AURORA</Text>
                            <Text style={styles.subTitle}>Aeropuerto Internacional</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.facNumber}>{cabecera.NUMERO_FACTURA || cabecera.numero_factura}</Text>
                            <Text style={styles.badge}>PAGADO</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Facturado a:</Text>
                            <Text style={styles.value}>{cabecera.CLIENTE || cabecera.cliente}</Text>
                            <Text style={styles.label}>Correo:</Text>
                            <Text style={styles.value}>{cabecera.CORREO || cabecera.correo}</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={styles.label}>Fecha:</Text>
                            <Text style={styles.value}>{new Date(cabecera.FECHA_EMISION || cabecera.fecha_emision).toLocaleDateString()}</Text>
                            <Text style={styles.label}>Moneda:</Text>
                            <Text style={styles.value}>Quetzales (GTQ)</Text>
                        </View>
                    </View>

                    {/* TABLA DE DETALLES */}
                    <View style={styles.table}>
                        <View style={styles.tableHead}>
                            <Text style={[styles.th, { flex: 2 }]}>Desc.</Text>
                            <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Cant.</Text>
                            <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Subtotal</Text>
                        </View>

                        {detalles.map((item, index) => (
                            <View key={index} style={styles.tableRow}>
                                <Text style={[styles.td, { flex: 2 }]}>{item.DESCRIPCION || item.descripcion}</Text>
                                <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>{item.CANTIDAD || item.cantidad}</Text>
                                <Text style={[styles.td, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>
                                    Q {parseFloat(item.SUBTOTAL || item.subtotal).toFixed(2)}
                                </Text>
                            </View>
                        ))}

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>TOTAL PAGADO:</Text>
                            <Text style={styles.totalValue}>Q {parseFloat(cabecera.TOTAL || cabecera.total).toFixed(2)}</Text>
                        </View>
                    </View>

                    <Text style={styles.footerText}>¡Gracias por volar con nosotros!</Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#e9ecef' },
    topBar: { backgroundColor: '#333', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between' },
    btnVolver: { borderColor: 'white', borderWidth: 1, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    btnPrint: { backgroundColor: '#0d47a1', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, minWidth: 120, alignItems: 'center' },
    btnVolverText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

    invoiceBox: { backgroundColor: 'white', borderRadius: 10, padding: 25, shadowColor: '#000', shadowOpacity: 0.1, elevation: 3 },
    header: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: '#0d47a1', paddingBottom: 15, marginBottom: 15 },
    title: { fontSize: 20, fontWeight: '900', color: '#0d47a1' },
    subTitle: { fontSize: 12, color: '#777' },
    facNumber: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    badge: { backgroundColor: '#28a745', color: 'white', fontWeight: 'bold', fontSize: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, marginTop: 5, overflow: 'hidden' },

    infoRow: { flexDirection: 'row', marginBottom: 20 },
    label: { fontSize: 10, fontWeight: 'bold', color: '#777', textTransform: 'uppercase', marginTop: 5 },
    value: { fontSize: 14, fontWeight: 'bold', color: '#333' },

    table: { borderWidth: 1, borderColor: '#dee2e6', borderRadius: 5, overflow: 'hidden' },
    tableHead: { flexDirection: 'row', backgroundColor: '#f8f9fa', padding: 10, borderBottomWidth: 1, borderBottomColor: '#dee2e6' },
    th: { fontSize: 12, fontWeight: 'bold', color: '#555', textTransform: 'uppercase' },
    tableRow: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    td: { fontSize: 12, color: '#333' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8f9fa', padding: 15 },
    totalLabel: { fontSize: 14, fontWeight: 'bold', color: '#555' },
    totalValue: { fontSize: 18, fontWeight: 'bold', color: '#0d47a1' },

    footerText: { textAlign: 'center', marginTop: 30, fontSize: 12, color: '#777', fontStyle: 'italic' }
});

export default DetalleFactura;