import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../styles/colors';

export default function ProfileView() {
  const { user, logout, updateProfile, updateEmail, updateWorkplace, updatePassword, updatePhoto, resetWorkplaceLocation } = useAuth();

  const [modalVisible, setModalVisible] = useState(null); // 'name', 'email', 'workplace', 'password'
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [workplace, setWorkplace] = useState(user?.workplace || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      try {
        await updatePhoto(result.assets[0].uri);
      } catch (err) {
        Alert.alert('Erro', err.message || 'Não foi possível atualizar a foto.');
      }
    }
  };

  const handleSaveName = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Erro', 'Nome e sobrenome são obrigatórios.');
      return;
    }
    setIsLoading(true);
    try {
      await updateProfile(firstName, lastName);
      setModalVisible(null);
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'E-mail é obrigatório.');
      return;
    }
    setIsLoading(true);
    try {
      await updateEmail(email);
      setModalVisible(null);
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWorkplace = async () => {
    if (!workplace.trim()) {
      Alert.alert('Erro', 'Local de trabalho é obrigatório.');
      return;
    }
    setIsLoading(true);
    try {
      await updateWorkplace(workplace);
      setModalVisible(null);
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Erro', 'Preencha ambas as senhas.');
      return;
    }
    setIsLoading(true);
    try {
      await updatePassword(currentPassword, newPassword);
      setModalVisible(null);
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Sucesso', 'Senha atualizada com sucesso.');
    } catch (err) {
      Alert.alert('Erro', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetWorkplaceLocation = () => {
    Alert.alert('Reiniciar local', 'Remover o local de trabalho marcado no mapa?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reiniciar',
        style: 'destructive',
        onPress: async () => {
          try {
            await resetWorkplaceLocation();
          } catch (err) {
            Alert.alert('Erro', err.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Perfil</Text>
            <Pressable onPress={logout} hitSlop={8}>
              <Ionicons name="log-out-outline" size={22} color={colors.background} />
            </Pressable>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.userName}>{user?.firstName}</Text>
            <Text style={styles.userLastName}>{user?.lastName}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <Text style={styles.companyName}>{user?.workplace || 'Local de trabalho'}</Text>
          </View>
        </View>

        <View style={styles.photoContainerWrapper}>
          <Pressable style={styles.photoContainer} onPress={handlePickImage}>
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={styles.photo} />
            ) : (
              <Ionicons name="person" size={50} color={colors.disabled} />
            )}
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={12} color={colors.background} />
            </View>
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Atividades</Text>
          </View>

          <View style={styles.combinedCardContainer}>
            <Pressable
              style={styles.combinedCardLeft}
              onPress={() => setModalVisible('name')}
            >
              <Ionicons name="person-outline" size={22} color={colors.text} style={{ marginBottom: 4 }} />
              <Text style={styles.combinedCardLeftText} numberOfLines={1}>Dados Pessoais</Text>
            </Pressable>

            <Pressable
              style={styles.combinedCardMiddle}
              onPress={() => setModalVisible('password')}
            >
              <Ionicons name="lock-closed-outline" size={22} color={colors.background} style={{ marginBottom: 4 }} />
              <Text style={styles.combinedCardMiddleText}>Segurança</Text>
              <Text style={styles.combinedCardMiddleHint}>Senha e acesso</Text>
            </Pressable>

            <Pressable
              style={styles.combinedCardEmail}
              onPress={() => setModalVisible('email')}
            >
              <Ionicons name="mail-outline" size={22} color={colors.text} style={{ marginBottom: 4 }} />
              <Text style={styles.combinedCardEmailText}>E-mail</Text>
            </Pressable>
          </View>

          <Pressable style={styles.fullCard} onPress={() => setModalVisible('workplace')}>
            <View style={styles.fullCardIcon}>
              <Ionicons name="business-outline" size={24} color={colors.background} />
            </View>
            <Text style={styles.fullCardTitle}>Local de trabalho</Text>
            <Ionicons name="arrow-up-right" size={20} color={colors.background} />
          </Pressable>

          <Pressable style={styles.resetButton} onPress={handleResetWorkplaceLocation}>
            <Ionicons name="refresh-outline" size={16} color={colors.disabled} />
            <Text style={styles.resetButtonText}>Reiniciar local no mapa</Text>
          </Pressable>

        </View>
      </View>

      {/* Name Modal */}
      <Modal visible={modalVisible === 'name'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Nome</Text>
            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="Nome" />
            <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Sobrenome" />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonCancel} onPress={() => setModalVisible(null)}><Text style={styles.modalButtonTextDark}>Cancelar</Text></Pressable>
              <Pressable style={styles.modalButtonSave} onPress={handleSaveName}>{isLoading ? <ActivityIndicator color={colors.background} /> : <Text style={styles.modalButtonText}>Salvar</Text>}</Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Email Modal */}
      <Modal visible={modalVisible === 'email'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar E-mail</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" autoCapitalize="none" />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonCancel} onPress={() => setModalVisible(null)}><Text style={styles.modalButtonTextDark}>Cancelar</Text></Pressable>
              <Pressable style={styles.modalButtonSave} onPress={handleSaveEmail}>{isLoading ? <ActivityIndicator color={colors.background} /> : <Text style={styles.modalButtonText}>Salvar</Text>}</Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible === 'workplace'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Local de trabalho</Text>
            <TextInput style={styles.input} value={workplace} onChangeText={setWorkplace} placeholder="Nome do local de trabalho" />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonCancel} onPress={() => setModalVisible(null)}><Text style={styles.modalButtonTextDark}>Cancelar</Text></Pressable>
              <Pressable style={styles.modalButtonSave} onPress={handleSaveWorkplace}>{isLoading ? <ActivityIndicator color={colors.background} /> : <Text style={styles.modalButtonText}>Salvar</Text>}</Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Modal */}
      <Modal visible={modalVisible === 'password'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Alterar Senha</Text>
            <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Senha atual" secureTextEntry />
            <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="Nova senha" secureTextEntry />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonCancel} onPress={() => setModalVisible(null)}><Text style={styles.modalButtonTextDark}>Cancelar</Text></Pressable>
              <Pressable style={styles.modalButtonSave} onPress={handleSavePassword}>{isLoading ? <ActivityIndicator color={colors.background} /> : <Text style={styles.modalButtonText}>Salvar</Text>}</Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // space for bottom nav
  },
  header: {
    backgroundColor: colors.primary,
    height: 290,
    borderBottomRightRadius: 68,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  headerTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: colors.background,
    fontSize: 30,
    fontWeight: '700',
  },
  headerInfo: {
    alignItems: 'flex-start',
    position: 'absolute',
    right: 24,
    top: 142,
    width: 168,
  },
  userName: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'left',
  },
  userEmail: {
    color: '#D8D2C9',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'left',
  },
  userLastName: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 21,
    textAlign: 'left',
  },
  companyName: {
    color: '#D6A85F',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  photoContainerWrapper: {
    marginTop: -154,
    marginLeft: 30,
    zIndex: 10,
  },
  photoContainer: {
    width: 132,
    height: 174,
    backgroundColor: '#EAE5DE',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  editBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: colors.primary,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EAE5DE',
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  sectionHeading: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 0,
  },
  sectionHint: {
    color: colors.disabled,
    fontSize: 11,
  },
  combinedCardContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 26,
    height: 108,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  combinedCardLeft: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  combinedCardLeftText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  combinedCardMiddle: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  combinedCardMiddleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background,
    textAlign: 'center',
  },
  combinedCardMiddleHint: {
    color: '#C7C0B7',
    fontSize: 9,
    marginTop: 3,
    textAlign: 'center',
  },
  combinedCardEmail: {
    flex: 1,
    backgroundColor: '#D6A85F',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  combinedCardEmailText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  fullCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fullCardIcon: {
    marginRight: 16,
  },
  fullCardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
  },
  resetButton: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 8,
  },
  resetButtonText: {
    color: colors.disabled,
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2DDD5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    color: colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalButtonCancel: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#EAE5DE',
  },
  modalButtonSave: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.primary,
    minWidth: 90,
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextDark: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});