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

                // Si falta alguno de los dos, no lo deja pasar
                if (!email || !token) {
                    Alert.alert("🔒 Acceso Restringido", "Debes iniciar sesión para acceder a esta área.");
                    navigation.replace('Login'); 
                    return; // Cortamos la ejecución aquí
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