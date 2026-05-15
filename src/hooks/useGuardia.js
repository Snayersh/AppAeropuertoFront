import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useGuardia = (navigation) => {
    const [correoAuth, setCorreoAuth] = useState('');
    const [tokenAuth, setTokenAuth] = useState('');
    const [verificandoGuardia, setVerificandoGuardia] = useState(true);

    useEffect(() => {
        const revisarCredenciales = async () => {
            try {
                const email = await AsyncStorage.getItem('UserEmail');
                const token = await AsyncStorage.getItem('UserToken');
                const rol = await AsyncStorage.getItem('UserRole');

                // 🔥 MEJORA 1: Validación de Integridad Estricta
                // No solo revisamos que "exista", sino que no sea un string vacío o basura (ej. longitud mínima).
                if (!email || !token || token.trim().length < 10 || email.indexOf('@') === -1) {
                    await AsyncStorage.clear(); // Defensa activa: destruimos cualquier rastro corrupto
                    Alert.alert("🔒 Acceso Restringido", "Tu sesión es inválida o ha expirado. Por favor, ingresa de nuevo.");
                    navigation.replace('Login'); 
                    return; 
                }

                // El guardia revisa el rol
                if (rol !== '2') {
                    await AsyncStorage.clear(); // Limpieza profunda inmediata
                    Alert.alert(
                        "⛔ Acceso Denegado", 
                        "Esta aplicación es exclusiva para pasajeros. El personal administrativo debe usar el portal web."
                    );
                    navigation.replace('Login');
                    return;
                }

                // 🔥 MEJORA 2: Sanitización de variables en memoria
                // Eliminamos espacios en blanco accidentales antes de pasarlos al estado
                setCorreoAuth(email.trim());
                setTokenAuth(token.trim());

            } catch (error) {
                console.log("Error de Integridad en Guardia:", error);
                // 🔥 MEJORA 3: Política de "Fail-Safe" (Fallo Seguro)
                // Si la memoria falla o el celular da error al leer, asumimos que es un ataque o corrupción y cerramos todo.
                await AsyncStorage.clear();
                navigation.replace('Login');
            } finally {
                setVerificandoGuardia(false);
            }
        };

        revisarCredenciales();
    }, [navigation]);

    return { correoAuth, tokenAuth, verificandoGuardia };
};