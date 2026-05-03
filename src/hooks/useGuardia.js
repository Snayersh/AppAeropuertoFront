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
                // El guardia busca en la memoria del celular
                const email = await AsyncStorage.getItem('UserEmail');
                const token = await AsyncStorage.getItem('UserToken');
                const rol = await AsyncStorage.getItem('UserRole'); // 🔥 NUEVO: El guardia revisa el rol

                // Si falta alguno de los dos, no lo deja pasar
                if (!email || !token) {
                    Alert.alert("🔒 Acceso Restringido", "Debes iniciar sesión para acceder a esta área.");
                    navigation.replace('Login'); 
                    return; // Cortamos la ejecución aquí
                }

                // 🔥 NUEVO FILTRO: Si NO es cliente (Ajusta el '3' al ID real de tu rol Cliente)
                if (rol !== '2') {
                    Alert.alert(
                        "⛔ Acceso Denegado", 
                        "Esta aplicación es exclusiva para pasajeros. Por favor, utiliza el portal web para personal administrativo."
                    );
                    await AsyncStorage.clear(); // Le quitamos las llaves por si acaso
                    navigation.replace('Login');
                    return;
                }

                // Si todo está bien, le entrega las credenciales a la pantalla
                setCorreoAuth(email);
                setTokenAuth(token);
            } catch (error) {
                console.log("Error del Guardia:", error);
                navigation.replace('Login');
            } finally {
                // El guardia termina su revisión
                setVerificandoGuardia(false);
            }
        };

        revisarCredenciales();
    }, [navigation]);

    // Devolvemos los datos listos para que cualquier pantalla los use
    return { correoAuth, tokenAuth, verificandoGuardia };
};