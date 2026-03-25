import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Inicio from './src/screens/Inicio';
import Login from './src/screens/Login';
import Registro from './src/screens/Registro';
import MiPerfil from './src/screens/MiPerfil';
import Radar from './src/screens/Radar';
import MisBoletos from './src/screens/MisBoletos';
import Reservas from './src/screens/Reservas';
import Pagos from './src/screens/Pagos';
import Equipaje from './src/screens/Equipaje';
import DetalleFactura from './src/screens/DetalleFactura'
import DetalleVuelo from './src/screens/DetalleVuelo'
import MisFacturas from './src/screens/MisFacturas'
import PaseAbordar from './src/screens/PaseAbordar';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}