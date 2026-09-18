import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import MapView, { Circle, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../styles/colors';
import { savePoint } from '../services/pointService';
import { useAuth } from '../hooks/useAuth';

const FALLBACK_REGION = { latitude: -22.9068, longitude: -43.1729 };

function distanceInMeters(from, to) {
  const earthRadius = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const latitudeDistance = toRadians(to.latitude - from.latitude);
  const longitudeDistance = toRadians(to.longitude - from.longitude);
  const a = Math.sin(latitudeDistance / 2) ** 2 + Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(longitudeDistance / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function PointValidationScreen({ navigation, route }) {
  const { user, updateWorkplaceLocation } = useAuth();
  const workplaceName = user?.workplace || 'Local de trabalho';
  const hasWorkplaceLocation = !!user?.workplaceLocation;
  const workplace = hasWorkplaceLocation ? { ...user.workplaceLocation, name: workplaceName } : null;
  
  const [step, setStep] = useState('location');
  const backArrowOffset = useRef(new Animated.Value(0)).current;
  const stepOpacity = useRef(new Animated.Value(0)).current;
  const stepScale = useRef(new Animated.Value(0.9)).current;
  const identityFillAnimation = useRef(new Animated.Value(0)).current;
  const qrButtonAnimation = useRef(new Animated.Value(0)).current;
  const scanLocked = useRef(false);
  
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState('Buscando sua localização…');
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [identityFeedback, setIdentityFeedback] = useState(null);
  const [showQrAction, setShowQrAction] = useState(false);
  const [identityFullscreen, setIdentityFullscreen] = useState(false);
  const [identityFillActive, setIdentityFillActive] = useState(false);
  const [scannerSize, setScannerSize] = useState(null);
  const [recordedAt, setRecordedAt] = useState(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const { height: windowHeight } = useWindowDimensions();

  // Estados da Primeira Página (Setup)
  const [selectedSetupCoords, setSelectedSetupCoords] = useState(null);
  const [radiusInput, setRadiusInput] = useState('300');
  const [isLocatingSetup, setIsLocatingSetup] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(stepOpacity, { toValue: 1, duration: 230, useNativeDriver: true }),
      Animated.spring(stepScale, { toValue: 1, friction: 8, tension: 85, useNativeDriver: true }),
    ]).start();
  }, [stepOpacity, stepScale]);

  useEffect(() => {
    async function loadLocation() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationMessage('Permita o acesso à localização para continuar.');
        setIsLoadingLocation(false);
        return;
      }
      try {
        const { coords } = await Location.getCurrentPositionAsync({});
        setCurrentLocation({ latitude: coords.latitude, longitude: coords.longitude });
      } catch {
        setLocationMessage('Não foi possível obter sua localização.');
      } finally {
        setIsLoadingLocation(false);
      }
    }
    loadLocation();
  }, []);

  // Preenche a localização inicial no mapa de Setup
  useEffect(() => {
    if (!hasWorkplaceLocation && currentLocation && !selectedSetupCoords) {
      setSelectedSetupCoords(currentLocation);
    }
  }, [currentLocation, hasWorkplaceLocation, selectedSetupCoords]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(backArrowOffset, { toValue: -3, duration: 650, useNativeDriver: true }),
        Animated.timing(backArrowOffset, { toValue: 0, duration: 650, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [backArrowOffset]);

  const transitionTo = (nextStep) => {
    Animated.parallel([
      Animated.timing(stepOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(stepScale, { toValue: 0.94, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      stepScale.setValue(0.9);
      Animated.parallel([
        Animated.timing(stepOpacity, { toValue: 1, duration: 230, useNativeDriver: true }),
        Animated.spring(stepScale, { toValue: 1, friction: 8, tension: 85, useNativeDriver: true }),
      ]).start();
    });
  };

  const distance = useMemo(
    () => (currentLocation && workplace) ? Math.round(distanceInMeters(currentLocation, workplace)) : null,
    [currentLocation, workplace]
  );
  const isAllowed = distance !== null && distance <= (workplace?.allowedRadius || 0);
  const mapRegion = currentLocation
    ? { ...currentLocation, latitudeDelta: 0.006, longitudeDelta: 0.006 }
    : workplace
      ? { latitude: workplace.latitude, longitude: workplace.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }
      : { ...FALLBACK_REGION, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  useEffect(() => {
    if (!hasWorkplaceLocation) return;
    if (distance !== null) setLocationMessage(isAllowed ? 'Local permitido' : 'Você está fora do raio permitido.');
  }, [distance, isAllowed, hasWorkplaceLocation]);

  const confirmIdentity = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) {
      Alert.alert('Biometria indisponível', 'Configure a biometria do aparelho para registrar o ponto.');
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirme sua identidade para registrar o ponto', cancelLabel: 'Cancelar' });
    const feedback = result.success ? 'success' : 'error';
    setIdentityFeedback(feedback);
    setIdentityFillActive(true);
    identityFillAnimation.setValue(0);
    Animated.timing(identityFillAnimation, { toValue: 1, duration: 700, useNativeDriver: true }).start(() => {
      setIdentityFillActive(false);
      setIdentityFullscreen(true);
      if (result.success) {
        setIdentityConfirmed(true);
        setShowQrAction(true);
        qrButtonAnimation.setValue(0);
        Animated.timing(qrButtonAnimation, { toValue: 1, duration: 700, delay: 250, useNativeDriver: true }).start();
      }
    });
  };

  const openScanner = async () => {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) return;
    }
    scanLocked.current = false;
    setStep('scan');
  };

  const handleBarcodeScanned = ({ bounds, cornerPoints }) => {
    if (scanLocked.current || !scannerSize) return;
    const points = cornerPoints?.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)) || [];
    const barcodeBounds = bounds?.origin && bounds?.size ? {
      left: bounds.origin.x,
      top: bounds.origin.y,
      right: bounds.origin.x + bounds.size.width,
      bottom: bounds.origin.y + bounds.size.height,
    } : points.length ? {
      left: Math.min(...points.map((point) => point.x)),
      top: Math.min(...points.map((point) => point.y)),
      right: Math.max(...points.map((point) => point.x)),
      bottom: Math.max(...points.map((point) => point.y)),
    } : null;
    if (!barcodeBounds) return;
    const frameLeft = (scannerSize.width - 220) / 2;
    const frameTop = (scannerSize.height - 220) / 2;
    const frameRight = frameLeft + 220;
    const frameBottom = frameTop + 220;
    if (barcodeBounds.left < frameLeft || barcodeBounds.top < frameTop || barcodeBounds.right > frameRight || barcodeBounds.bottom > frameBottom) return;
    scanLocked.current = true;
    finishValidation();
  };

  const finishValidation = async () => {
    const recordedAtValue = new Date();
    await savePoint(route.params?.pointType || 'entry');
    setRecordedAt(recordedAtValue);
    setStep('success');
  };

  // Funções da Primeira Página (Setup)
  const useSetupCurrentLocation = async () => {
    setIsLocatingSetup(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erro', 'Permita o acesso à localização para usar essa opção.');
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({});
      setSelectedSetupCoords({ latitude: coords.latitude, longitude: coords.longitude });
    } catch {
      Alert.alert('Erro', 'Não foi possível obter sua localização.');
    } finally {
      setIsLocatingSetup(false);
    }
  };

  const handleSaveSetupLocation = async () => {
    if (!selectedSetupCoords) {
      Alert.alert('Erro', 'Toque no mapa para marcar o local.');
      return;
    }
    const radiusValue = Number(radiusInput);
    if (!Number.isFinite(radiusValue) || radiusValue <= 0) {
      Alert.alert('Erro', 'Informe um raio válido em metros.');
      return;
    }
    setIsSavingLocation(true);
    try {
      await updateWorkplaceLocation(selectedSetupCoords.latitude, selectedSetupCoords.longitude, radiusValue);
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setIsSavingLocation(false);
    }
  };

  const setupMapRegion = selectedSetupCoords
    ? { ...selectedSetupCoords, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : currentLocation
      ? { ...currentLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 }
      : { ...FALLBACK_REGION, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  const setupRadiusValue = Number(radiusInput) || 0;

  // Render da Primeira Página (Setup)
  const renderSetup = () => (
    <>
      <View style={styles.mapCard}>
        {Platform.OS === 'web' ? <Text style={styles.mapFallback}>Mapa disponível no aplicativo móvel</Text> : (
          <MapView
            style={styles.map}
            region={setupMapRegion}
            onPress={(e) => setSelectedSetupCoords(e.nativeEvent.coordinate)}
          >
            {selectedSetupCoords && (
              <>
                <Marker
                  coordinate={selectedSetupCoords}
                  draggable
                  onDragEnd={(e) => setSelectedSetupCoords(e.nativeEvent.coordinate)}
                  pinColor="#1C1B18"
                />
                {setupRadiusValue > 0 && (
                  <Circle center={selectedSetupCoords} radius={setupRadiusValue} fillColor="rgba(28,27,24,.10)" strokeColor="rgba(28,27,24,.35)" />
                )}
              </>
            )}
          </MapView>
        )}
        <View pointerEvents="none" style={styles.mapLegend}>
          <View style={styles.legendItem}>
            <View style={styles.workplaceDot} />
            <Text style={styles.legendText}>{selectedSetupCoords ? 'Local selecionado' : 'Toque no mapa'}</Text>
          </View>
        </View>
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.currentTime}>{selectedSetupCoords ? '📍' : '—'}</Text>
        <View style={styles.statusBadge}>
          <Ionicons name={selectedSetupCoords ? 'checkmark' : 'information'} size={17} color={colors.background} />
          <Text style={styles.statusText}>{selectedSetupCoords ? 'Toque e arraste para ajustar' : 'Toque no mapa para marcar o local'}</Text>
        </View>
      </View>
      <View style={styles.locationDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="business-outline" size={18} color={colors.primary} />
          <Text style={styles.detailLabel}>LOCAL</Text>
          <Text style={styles.detailValue}>{workplaceName}</Text>
        </View>
        <View style={styles.detailSeparator} />
        <Pressable style={styles.detailItem} onPress={useSetupCurrentLocation} disabled={isLocatingSetup}>
          <Ionicons name="locate-outline" size={18} color={colors.primary} />
          <Text style={styles.detailLabel}>ATUAL</Text>
          {isLocatingSetup ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.detailValue}>Usar</Text>}
        </Pressable>
        <View style={styles.detailSeparator} />
        <View style={styles.detailItem}>
          <Ionicons name="radio-outline" size={18} color={colors.primary} />
          <Text style={styles.detailLabel}>RAIO (M)</Text>
          <TextInput
            style={styles.radiusInlineInput}
            value={radiusInput}
            onChangeText={setRadiusInput}
            keyboardType="numeric"
            placeholder="300"
          />
        </View>
      </View>
      <Pressable
        disabled={!selectedSetupCoords || isSavingLocation}
        style={[styles.primaryButton, styles.locationPrimaryButton, (!selectedSetupCoords || isSavingLocation) && styles.buttonDisabled]}
        onPress={handleSaveSetupLocation}
      >
        {isSavingLocation ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryButtonText}>Salvar local de trabalho</Text>}
      </Pressable>
    </>
  );

  // Render da Segunda Página (mantido exatamente do seu código)
  const renderLocation = () => (
    <>
      <View style={styles.mapCard}>
        {Platform.OS === 'web' ? <Text style={styles.mapFallback}>Mapa disponível no aplicativo móvel</Text> : <MapView style={styles.map} region={mapRegion} scrollEnabled={false} rotateEnabled={false}><Marker coordinate={workplace} title={workplace.name} pinColor="#1C1B18" />{currentLocation && <Marker coordinate={currentLocation} title="Você está aqui" pinColor="#5E7A68" />}<Circle center={workplace} radius={workplace.allowedRadius} fillColor="rgba(28,27,24,.10)" strokeColor="rgba(28,27,24,.35)" /></MapView>}
        <View pointerEvents="none" style={styles.mapLegend}>
          <View style={styles.legendItem}><View style={styles.workplaceDot} /><Text style={styles.legendText}>{workplace.name}</Text></View>
          <View style={styles.legendItem}><View style={styles.currentLocationDot} /><Text style={styles.legendText}>Você está aqui</Text></View>
        </View>
      </View>
      <View style={styles.timeRow}><Text style={styles.currentTime}>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text><View style={[styles.statusBadge, !isAllowed && !isLoadingLocation && styles.statusBadgeDenied]}><Ionicons name={isAllowed ? 'checkmark' : 'information'} size={17} color={colors.background} /><Text style={[styles.statusText, !isAllowed && !isLoadingLocation && styles.statusTextDenied]}>{locationMessage}</Text></View></View>
      <View style={styles.locationDetails}>
        <View style={styles.detailItem}><Ionicons name="business-outline" size={18} color={colors.primary} /><Text style={styles.detailLabel}>LOCAL</Text><Text style={styles.detailValue}>{workplace.name}</Text></View>
        <View style={styles.detailSeparator} />
        <View style={styles.detailItem}><Ionicons name="navigate-outline" size={18} color={colors.primary} /><Text style={styles.detailLabel}>DISTÂNCIA</Text>{isLoadingLocation ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.detailValue}>{distance !== null ? `${distance} m` : 'Indisponível'}</Text>}</View>
        <View style={styles.detailSeparator} />
        <View style={styles.detailItem}><Ionicons name="radio-outline" size={18} color={colors.primary} /><Text style={styles.detailLabel}>RAIO</Text><Text style={styles.detailValue}>{workplace.allowedRadius} m</Text></View>
        <View style={styles.detailRow}><Ionicons name="business-outline" size={18} color={colors.primary} /><View><Text style={styles.detailLabel}>LOCAL DE TRABALHO</Text><Text style={styles.detailValue}>{workplace.name}</Text></View></View>
        <View style={styles.detailRow}><Ionicons name="navigate-outline" size={18} color={colors.primary} /><View><Text style={styles.detailLabel}>DISTÂNCIA ATUAL</Text>{isLoadingLocation ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.detailValue}>{distance !== null ? `${distance} m do local` : 'Localização indisponível'}</Text>}</View></View>
        <View style={styles.detailRow}><Ionicons name="radio-outline" size={18} color={colors.primary} /><View><Text style={styles.detailLabel}>RAIO PERMITIDO</Text><Text style={styles.detailValue}>Até {workplace.allowedRadius} m</Text></View></View>
      </View>
      <Pressable disabled={!isAllowed} style={[styles.primaryButton, styles.locationPrimaryButton, !isAllowed && styles.buttonDisabled]} onPress={() => transitionTo('identity')}><Text style={styles.primaryButtonText}>Confirmar localização</Text></Pressable>
    </>
  );

  const renderIdentity = () => (
    <View style={styles.identityLayout}>
      {identityFullscreen && identityFeedback ? <View style={styles.identityResult}>
        <Ionicons name={identityFeedback === 'success' ? 'checkmark-circle-outline' : 'close-circle-outline'} size={96} color={identityFeedback === 'success' ? '#A9C9B0' : colors.background} />
        <Text style={styles.identityFeedbackTitle}>{identityFeedback === 'success' ? 'Identidade confirmada' : 'Identidade não confirmada'}</Text>
        <Text style={styles.identityFeedbackText}>{identityFeedback === 'success' ? 'Biometria validada com sucesso.' : 'Tente confirmar sua biometria novamente.'}</Text>
      </View> : <Pressable style={styles.identityBiometricArea} onPress={confirmIdentity}>
        <Ionicons name="finger-print-outline" size={92} color={colors.background} />
        <Text style={styles.identityBiometricTitle}>Toque para confirmar</Text>
        <Text style={styles.identityBiometricHint}>Use a biometria configurada neste aparelho.</Text>
      </Pressable>}
      {showQrAction && <Animated.View style={[styles.identityFooter, { opacity: qrButtonAnimation, transform: [{ translateY: qrButtonAnimation.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }] }]}><Text style={styles.identityQrHint}>Agora, confirme o local com o QR Code.</Text><Pressable style={styles.identityQrButton} onPress={openScanner}><Ionicons name="scan-outline" size={22} color={colors.primary} /><Text style={styles.identityQrButtonText}>Escanear QR Code</Text></Pressable></Animated.View>}
    </View>
  );

  const renderScanner = () => (
    <View onLayout={({ nativeEvent }) => setScannerSize(nativeEvent.layout)} style={[styles.cameraOnlyPage, { height: Math.max(windowHeight, 1) }]}>
      {cameraPermission?.granted ? <CameraView style={styles.cameraOnly} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={handleBarcodeScanned} /> : <Pressable style={styles.permissionButton} onPress={openScanner}><Text style={styles.secondaryButtonText}>Permitir câmera</Text></Pressable>}
      <View pointerEvents="none" style={styles.scannerFrame} />
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.successContent}>
      <Ionicons name="checkmark" size={52} color="#41634D" />
      <Text style={styles.successTitle}>Ponto registrado.</Text>
      <Text style={styles.recordTime}>{recordedAt?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
      <Text style={styles.recordDate}>{recordedAt?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</Text>
      <Text style={styles.successWorkplace}>{workplace.name}</Text>
      <Text style={styles.confirmation}>✓ Local confirmado</Text>
      <Text style={styles.confirmation}>✓ Identidade confirmada</Text>
      <Text style={styles.confirmation}>✓ QR Code confirmado</Text>
      <Pressable style={styles.primaryButton} onPress={() => navigation.popToTop()}><Text style={styles.primaryButtonText}>Voltar ao início</Text></Pressable>
    </View>
  );

  // Se não tem local salvo, exibe a Primeira Página (Setup)
  if (!hasWorkplaceLocation) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => navigation.goBack()}>
              <Animated.View style={{ transform: [{ translateX: backArrowOffset }] }}>
                <Ionicons name="chevron-back" size={27} color={colors.background} />
              </Animated.View>
            </Pressable>
            <Text style={styles.brand}>Timen.</Text>
            <View style={styles.headerSpacer} />
          </View>
          <Text style={styles.headerTitle}>Onde fica seu trabalho?</Text>
        </View>
        <ScrollView
          style={styles.sheet}
          contentContainerStyle={[styles.content, styles.locationContent]}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.stepContent, { opacity: stepOpacity, transform: [{ scale: stepScale }] }]}>
            {renderSetup()}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Se já tem local, exibe a Segunda Página normalmente
  return (
    <SafeAreaView style={[styles.root, step === 'identity' && styles.identityRoot, identityFullscreen && styles.identityFullscreenRoot]} edges={['top']}>
      <StatusBar style={step === 'identity' && !identityFullscreen ? 'dark' : 'light'} />
      <View style={[styles.header, step === 'identity' && styles.identityHeader, identityFullscreen && styles.hiddenHeader]}>
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => navigation.goBack()}>
            <Animated.View style={{ transform: [{ translateX: backArrowOffset }] }}>
              <Ionicons name="chevron-back" size={27} color={step === 'identity' ? colors.primary : colors.background} />
            </Animated.View>
          </Pressable>
          <Text style={[styles.brand, step === 'identity' && styles.identityBrand]}>Timen.</Text>
          <View style={styles.headerSpacer} />
        </View>
        {step === 'location' && <Text style={styles.headerTitle}>Aonde você está?</Text>}
        {step === 'identity' && <Text style={styles.identityHeaderTitle}>Por favor, confirme que é você.</Text>}
      </View>
      <ScrollView style={[styles.sheet, step === 'identity' && styles.identitySheet, step === 'scan' && styles.cameraPage, identityFullscreen && styles.fullscreenIdentitySheet]} contentContainerStyle={[styles.content, step === 'location' && styles.locationContent, step === 'identity' && styles.identityContent, step === 'scan' && styles.cameraContent]} scrollEnabled={step !== 'location' && step !== 'identity' && step !== 'scan'} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.stepContent, { opacity: stepOpacity, transform: [{ scale: stepScale }] }]}>
          {step === 'location' && renderLocation()}
          {step === 'identity' && renderIdentity()}
          {step === 'scan' && renderScanner()}
          {step === 'success' && renderSuccess()}
        </Animated.View>
      </ScrollView>
      {step === 'identity' && identityFillActive && <Animated.View pointerEvents="none" style={[styles.identityFill, { transform: [{ translateY: identityFillAnimation.interpolate({ inputRange: [0, 1], outputRange: [windowHeight, 0] }) }] }]} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary }, header: { height: 128, justifyContent: 'space-between', paddingBottom: 24, paddingHorizontal: 18 }, headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 }, headerSpacer: { width: 27 }, brand: { color: colors.background, fontSize: 20, fontWeight: '600', letterSpacing: -.5 }, headerTitle: { color: colors.background, fontSize: 25, fontWeight: '500', textAlign: 'center' }, sheet: { backgroundColor: colors.background, borderTopLeftRadius: 40, borderTopRightRadius: 40, flex: 1 }, content: { alignItems: 'center', flexGrow: 1, paddingBottom: 42, paddingHorizontal: 24, paddingTop: 38 }, locationContent: { paddingHorizontal: 0, paddingTop: 0 }, title: { alignSelf: 'stretch', color: colors.text, fontSize: 27, fontWeight: '500', lineHeight: 34, marginBottom: 22, textAlign: 'center' }, mapCard: { alignSelf: 'stretch', aspectRatio: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }, map: { flex: 1 }, mapFallback: { alignSelf: 'center', color: colors.disabled, marginTop: '48%', textAlign: 'center' }, mapLegend: { alignItems: 'center', bottom: 12, flexDirection: 'row', gap: 8, justifyContent: 'center', left: 12, position: 'absolute', right: 12 }, legendItem: { alignItems: 'center', backgroundColor: 'rgba(245,241,232,.94)', borderRadius: 12, flexDirection: 'row', gap: 6, paddingHorizontal: 9, paddingVertical: 7 }, workplaceDot: { backgroundColor: colors.primary, borderRadius: 5, height: 10, width: 10 }, currentLocationDot: { backgroundColor: '#5E7A68', borderRadius: 5, height: 10, width: 10 }, legendText: { color: colors.text, fontSize: 10, fontWeight: '600' }, locationDetails: { alignSelf: 'stretch', backgroundColor: '#FCFAF8', borderColor: '#E2DDD5', borderRadius: 18, borderWidth: 1, marginHorizontal: 24, marginTop: 16, overflow: 'hidden' }, timeRow: { alignItems: 'center', borderBottomColor: '#EAE5DE', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 }, currentTime: { color: colors.text, fontSize: 27, fontWeight: '500' }, detailRow: { alignItems: 'center', borderBottomColor: '#EAE5DE', borderBottomWidth: 1, flexDirection: 'row', gap: 12, minHeight: 60, paddingHorizontal: 16 }, detailLabel: { color: colors.disabled, fontSize: 10, fontWeight: '700', letterSpacing: .5, marginBottom: 3 }, detailValue: { color: colors.text, fontSize: 13, fontWeight: '600' }, statusBadge: { alignItems: 'center', backgroundColor: '#E2EADF', borderRadius: 14, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 7 }, statusBadgeDenied: { backgroundColor: '#F1E3D8' }, statusText: { color: '#41634D', fontSize: 12, fontWeight: '600' }, statusTextDenied: { color: '#8A5D3D', fontSize: 12, fontWeight: '600' }, primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 28, justifyContent: 'center', marginTop: 22, minHeight: 56, paddingHorizontal: 32, width: '100%' }, locationPrimaryButton: { alignSelf: 'stretch', marginHorizontal: 24, width: 'auto' }, buttonDisabled: { backgroundColor: '#A8A49C' }, primaryButtonText: { color: colors.background, fontSize: 15, fontWeight: '700' }, biometricCard: { alignItems: 'center', backgroundColor: '#FCFAF8', borderColor: '#D8D2C9', borderRadius: 24, borderWidth: 1, height: 210, justifyContent: 'center', width: 210 }, biometricCardConfirmed: { backgroundColor: '#E2EADF', borderColor: '#8FA795' }, biometricLabel: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 14 }, nextLabel: { color: colors.disabled, fontSize: 13, marginVertical: 24 }, secondaryButton: { alignItems: 'center', borderColor: colors.primary, borderRadius: 28, borderWidth: 1, flexDirection: 'row', gap: 9, justifyContent: 'center', minHeight: 56, paddingHorizontal: 28 }, secondaryButtonDisabled: { borderColor: '#D8D2C9', opacity: .45 }, secondaryButtonText: { color: colors.primary, fontSize: 14, fontWeight: '700' }, scannerCard: { backgroundColor: '#1C1B18', borderRadius: 24, height: 300, overflow: 'hidden', width: '100%' }, camera: { flex: 1 }, scannerFrame: { borderColor: colors.background, borderRadius: 16, borderWidth: 2, height: 170, left: '18%', position: 'absolute', top: 65, width: '64%' }, permissionButton: { alignItems: 'center', backgroundColor: colors.background, borderRadius: 22, left: 60, padding: 16, position: 'absolute', right: 60, top: 120 }, scannerHelp: { color: colors.disabled, fontSize: 13, marginTop: 18, textAlign: 'center' }, successContent: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: 46, width: '100%' }, successTitle: { color: colors.text, fontSize: 29, fontWeight: '600', marginTop: 18 }, recordTime: { color: colors.text, fontSize: 42, fontWeight: '500', marginTop: 32 }, recordDate: { color: colors.disabled, fontSize: 15, marginTop: 5, textTransform: 'capitalize' }, successWorkplace: { color: colors.text, fontSize: 17, fontWeight: '600', marginTop: 34 }, confirmation: { color: '#41634D', fontSize: 14, marginTop: 10 },
  mapLegend: { alignItems: 'center', bottom: 10, flexDirection: 'row', gap: 5, justifyContent: 'flex-end', left: 12, position: 'absolute', right: 12 },
  legendItem: { alignItems: 'center', backgroundColor: 'rgba(245,241,232,.94)', borderRadius: 9, flexDirection: 'row', gap: 4, paddingHorizontal: 7, paddingVertical: 5 },
  workplaceDot: { backgroundColor: colors.primary, borderRadius: 4, height: 8, width: 8 },
  currentLocationDot: { backgroundColor: '#5E7A68', borderRadius: 4, height: 8, width: 8 },
  legendText: { color: colors.text, fontSize: 9, fontWeight: '600' },
  timeRow: { alignItems: 'stretch', backgroundColor: '#E9E4DC', borderRadius: 16, borderBottomWidth: 0, flexDirection: 'row', justifyContent: 'space-between', margin: 10, overflow: 'hidden', paddingHorizontal: 0, paddingVertical: 0 },
  currentTime: { backgroundColor: '#E9E4DC', color: colors.text, fontSize: 25, fontWeight: '600', paddingVertical: 17, textAlign: 'center', width: '36%' },
  statusBadge: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: 0, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 7 },
  statusBadgeDenied: { backgroundColor: colors.primary },
  timeRow: { alignItems: 'stretch', alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderRadius: 16, flexDirection: 'row', marginHorizontal: 16, marginTop: 16, minHeight: 62, overflow: 'hidden' },
  statusBadge: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.primary, borderBottomLeftRadius: 0, borderBottomRightRadius: 14, borderTopLeftRadius: 30, borderTopRightRadius: 14, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', marginRight: 8, minHeight: 50, paddingHorizontal: 10, paddingVertical: 7 },
  timeRow: { alignItems: 'stretch', alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderRadius: 16, flexDirection: 'row', marginHorizontal: 10, marginTop: 16, minHeight: 62, overflow: 'hidden' },
  statusBadge: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.primary, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 30, borderTopRightRadius: 0, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', marginRight: 0, minHeight: 0, paddingHorizontal: 10, paddingVertical: 7 },
  locationDetails: { alignItems: 'stretch', alignSelf: 'stretch', backgroundColor: '#FCFAF8', borderColor: '#EAE5DE', borderRadius: 8, borderWidth: 1, flexDirection: 'row', marginHorizontal: 16, marginTop: 16, minHeight: 100, overflow: 'hidden' },
  detailRow: { display: 'none' },
  detailItem: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 7, paddingVertical: 14 },
  detailSeparator: { alignSelf: 'center', backgroundColor: '#E2DDD5', height: 48, width: 1 },
  detailLabel: { color: colors.disabled, fontSize: 9, fontWeight: '700', letterSpacing: .5, marginBottom: 6, textAlign: 'center' },
  detailValue: { color: colors.text, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  locationDetails: { alignItems: 'stretch', alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderColor: '#EAE5DE', borderRadius: 16, borderWidth: 1, flexDirection: 'row', marginHorizontal: 20, marginTop: 14, minHeight: 86, overflow: 'hidden' },
  detailItem: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 10 },
  detailSeparator: { alignSelf: 'center', backgroundColor: '#E2DDD5', height: 40, width: 1 },
  identityRoot: { backgroundColor: colors.background },
  identityFullscreenRoot: { backgroundColor: colors.primary },
  identityHeader: { backgroundColor: colors.background, height: 128, paddingBottom: 24 },
  hiddenHeader: { display: 'none' },
  identityBrand: { color: colors.primary },
  identityHeaderTitle: { color: colors.primary, fontSize: 24, fontWeight: '500', lineHeight: 29, textAlign: 'center' },
  identitySheet: { backgroundColor: colors.primary, borderTopLeftRadius: 40, borderTopRightRadius: 40, flex: 1 },
  fullscreenIdentitySheet: { borderRadius: 0 },
  identityContent: { flexGrow: 1, minHeight: '100%', paddingHorizontal: 0, paddingTop: 0 },
  identityLayout: { alignItems: 'center', flex: 1, justifyContent: 'space-between', minHeight: 560, paddingHorizontal: 24, paddingVertical: 40, position: 'relative', width: '100%' },
  identityBiometricArea: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingTop: 0, width: '100%' },
  identityResult: { alignItems: 'center', bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  identityBiometricTitle: { color: colors.background, fontSize: 20, fontWeight: '600', marginTop: 18 },
  identityBiometricHint: { color: '#C7C0B7', fontSize: 13, marginTop: 7, textAlign: 'center' },
  identityFooter: { alignItems: 'center', bottom: 40, left: 24, position: 'absolute', right: 24 },
  identityQrHint: { color: '#C7C0B7', fontSize: 13, lineHeight: 19, marginBottom: 14, textAlign: 'center' },
  identityQrButton: { alignItems: 'center', backgroundColor: colors.background, borderRadius: 28, flexDirection: 'row', gap: 9, justifyContent: 'center', minHeight: 56, width: '100%' },
  identityQrButtonDisabled: { opacity: .42 },
  identityQrButtonText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  identityFill: { backgroundColor: colors.primary, bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, zIndex: 10 },
  identityFeedbackTitle: { color: colors.background, fontSize: 25, fontWeight: '600', marginTop: 18 },
  identityFeedbackText: { color: '#E2EADF', fontSize: 14, marginTop: 8, textAlign: 'center' },
  stepContent: { alignItems: 'center', width: '100%' },
  statusText: { color: '#D8D2C9', fontSize: 12, fontWeight: '600' },
  statusTextDenied: { color: '#D8D2C9', fontSize: 12, fontWeight: '600' },
  timeRow: { alignItems: 'stretch', alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderRadius: 16, flexDirection: 'row', marginHorizontal: 24, marginTop: 16, minHeight: 62, overflow: 'hidden' },
  currentTime: { alignSelf: 'center', backgroundColor: '#FFFFFF', color: colors.text, fontSize: 25, fontWeight: '600', paddingVertical: 17, textAlign: 'center', width: '36%' },
  statusBadge: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.primary, borderBottomLeftRadius: 0, borderRadius: 0, borderTopLeftRadius: 30, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 7 },
  statusBadgeDenied: { backgroundColor: colors.primary },
  cameraPage: { backgroundColor: colors.primary },
  cameraContent: { flexGrow: 1, paddingBottom: 0, paddingHorizontal: 0, paddingTop: 0 },
  cameraOnlyPage: { alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: 40, flex: 0, overflow: 'hidden', position: 'relative' },
  cameraOnly: { flex: 1 },
  scannerFrame: { borderColor: colors.background, borderRadius: 16, borderWidth: 2, height: 220, left: '50%', position: 'absolute', top: '50%', transform: [{ translateX: -110 }, { translateY: -110 }], width: 220 },
});