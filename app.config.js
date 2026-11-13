module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    weatherApiKey: process.env.EXPO_PUBLIC_WEATHER_API_KEY || process.env.WEATHER_API_KEY,
  },
});
