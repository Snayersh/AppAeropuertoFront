import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const VueloCard = ({ vuelo, onPress }) => {
    // Función equivalente a tu ObtenerIconoEstado y ObtenerClaseEstado de VB
    const getEstadoEstilo = (estado) => {
        const est = estado?.toUpperCase() || '';
        switch (est) {
            case 'PROGRAMADO': return { icono: '📅', color: '#17a2b8', bg: '#e0f7fa' };
            case 'ABORDANDO': return { icono: '🚶', color: '#ffc107', bg: '#fff8e1' };
            case 'EN VUELO': return { icono: '✈️', color: '#28a745', bg: '#e8f5e9' };
            case 'ATERRIZADO': 
            case 'ATERRIZÓ': return { icono: '🛬', color: '#007bff', bg: '#e3f2fd' };
            case 'CANCELADO': return { icono: '❌', color: '#dc3545', bg: '#ffebee' };
            case 'RETRASADO': return { icono: '⏳', color: '#fd7e14', bg: '#fff3cd' };
            default: return { icono: '🟡', color: '#6c757d', bg: '#f8f9fa' };
        }
    };

    const estiloEstado = getEstadoEstilo(vuelo.estado);
    const esLlegada = vuelo.tipo === 'Llegada';

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.header}>
                <Text style={styles.vueloId}>{vuelo.numero_vuelo}</Text>
                <View style={[styles.badge, { backgroundColor: esLlegada ? '#e3f2fd' : '#fff3e0' }]}>
                    <Text style={[styles.badgeText, { color: esLlegada ? '#0d47a1' : '#e65100' }]}>
                        {esLlegada ? '🛬 Llegada' : '🛫 Salida'}
                    </Text>
                </View>
            </View>

            <View style={styles.body}>
                <Text style={styles.ruta}>{vuelo.ruta}</Text>
                <Text style={styles.aerolinea}>{vuelo.aerolinea}</Text>
            </View>

            <View style={styles.footer}>
                <Text style={styles.hora}>{vuelo.hora}</Text>
                <View style={[styles.estadoBadge, { backgroundColor: estiloEstado.bg }]}>
                    <Text style={{ color: estiloEstado.color, fontWeight: 'bold', fontSize: 12 }}>
                        {estiloEstado.icono} {vuelo.estado}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#edf2f9'
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    vueloId: { fontSize: 18, fontWeight: '900', color: '#0d47a1' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    badgeText: { fontSize: 12, fontWeight: 'bold' },
    body: { marginBottom: 10 },
    ruta: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    aerolinea: { fontSize: 14, color: '#666', marginTop: 2 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
    hora: { fontSize: 18, fontWeight: 'bold', color: '#000' },
    estadoBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }
});

export default VueloCard;