import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Linking from 'expo-linking'; // 🔥 Importamos Expo Linking

import Inicio from './src/screens/Inicio';
import Login from './src/screens/Login';
import Registro from './src/screens/Registro';
import MiPerfil from './src/screens/MiPerfil';
import Radar from './src/screens/Radar';
import MisBoletos from './src/screens/MisBoletos';
import Reservas from './src/screens/Reservas';
import Pagos from './src/screens/Pagos';
import Equipaje from './src/screens/Equipaje';
import DetalleFactura from './src/screens/DetalleFactura';
import DetalleVuelo from './src/screens/DetalleVuelo';
import MisFacturas from './src/screens/MisFacturas';
import PaseAbordar from './src/screens/PaseAbordar';
import RecuperarPassword from './src/screens/RecuperarPassword';
import SoporteTickets from './src/screens/SoporteTickets';

const Stack = createStackNavigator();

// 🔥 Configuramos los prefijos que la app va a escuchar
const prefix = Linking.createURL('/');

export default function App() {
  if (!__DEV__) {
    // Esto borra todas las funciones de consola en modo producción
    console.log = () => {};
    console.error = () => {};
    console.warn = () => {};
    console.info = () => {};
}
  // 🔥 Configuramos el objeto 'linking'
  const linking = {
    prefixes: [prefix, 'aeropuertoaurora://'],
    config: {
      screens: {
        // Mapeamos la ruta 'login' a la pantalla 'Login'
        Login: 'login', 
      }
    }
  };

  return (
    // 🔥 Le pasamos el prop 'linking' al NavigationContainer
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Inicio" component={Inicio} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Registro" component={Registro} />
        <Stack.Screen name="MiPerfil" component={MiPerfil} />
        <Stack.Screen name="Radar" component={Radar} />
        <Stack.Screen name="MisBoletos" component={MisBoletos} />
        <Stack.Screen name="Reservas" component={Reservas} />
        <Stack.Screen name="Pagos" component={Pagos} />
        <Stack.Screen name="Equipaje" component={Equipaje} />
        <Stack.Screen name="DetalleFactura" component={DetalleFactura} />
        <Stack.Screen name="DetalleVuelo" component={DetalleVuelo} />
        <Stack.Screen name="MisFacturas" component={MisFacturas} />
        <Stack.Screen name="PaseAbordar" component={PaseAbordar} />
        <Stack.Screen name="RecuperarPassword" component={RecuperarPassword} />
        <Stack.Screen name="SoporteTickets" component={SoporteTickets} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}