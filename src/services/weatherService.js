
import * as Location from 'expo-location';
import Constants from 'expo-constants';

const WEATHER_API_URL = 'https://api.weatherapi.com/v1/current.json';

const weatherMessages = {
  storm: [
    'O tempo virou, hein?',
    'Tem trovoada por aí.',
    'Melhor ir com calma.',
    'O céu está bravo hoje.',
  ],
  rain: [
    'Vai chover, viu?',
    'O céu fechou, não?',
    'Dia de chuva por aí.',
    'Esqueceu o guarda-chuva?',
    'Chove lá fora. Tudo bem.',
  ],
  cold: [
    'Esfriou, não?',
    'Um friozinho hoje.',
    'Hoje pede um café.',
    'Saiu de casaco?',
    'Que frio lá fora.',
  ],
  hot: [
    'Sol forte hoje, hein?',
    'Pegou calor por aí?',
    'Hoje o sol veio forte.',
    'Não esquece a água.',
    'Que calor, não?',
  ],
  cloudy: [
    'Céu fechado hoje, né?',
    'Dia meio cinza por aí.',
    'O sol resolveu sumir.',
    'Um dia mais quieto.',
  ],
  pleasant: [
    'Que dia bonito, não?',
    'O tempo está uma beleza.',
    'Até o clima ajuda.',
    'Um bom dia lá fora.',
    'Hoje está agradável.',
  ],
};

function getRandomMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)];
}

function getWeatherMessage(current) {
  const temperature = current.temp_c;
  const conditionCode = current.condition.code;

  if ([1087, 1273, 1276, 1279, 1282].includes(conditionCode)) {
    return getRandomMessage(weatherMessages.storm);
  }

  if ([1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(conditionCode)) {
    return getRandomMessage(weatherMessages.rain);
  }

  if ([1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(conditionCode)) {
    return getRandomMessage(weatherMessages.cold);
  }

  if (temperature >= 30) {
    return getRandomMessage(weatherMessages.hot);
  }

  if (temperature <= 15) {
    return getRandomMessage(weatherMessages.cold);
  }

  if ([1030, 1135, 1147].includes(conditionCode)) {
    return getRandomMessage(weatherMessages.cloudy);
  }

  return getRandomMessage(weatherMessages.pleasant);
}

export async function getWeatherMessageForCurrentLocation() {
  const apiKey =
    Constants.expoConfig?.extra?.weatherApiKey ||
    process.env.EXPO_PUBLIC_WEATHER_API_KEY ||
    process.env.WEATHER_API_KEY;

  if (!apiKey) {
    throw new Error('WEATHER_API_KEY não configurada.');
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const { latitude, longitude } = position.coords;
  const query = encodeURIComponent(`${latitude},${longitude}`);

  const response = await fetch(
    `${WEATHER_API_URL}?key=${encodeURIComponent(apiKey)}&q=${query}&lang=pt`,
  );

  if (!response.ok) {
    throw new Error(`WeatherAPI respondeu com status ${response.status}.`);
  }

  const data = await response.json();

  if (!data.current?.condition || typeof data.current.temp_c !== 'number') {
    throw new Error('Resposta da WeatherAPI inválida.');
  }

  return getWeatherMessage(data.current);
}
