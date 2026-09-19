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

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Seu nome';

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
            <Text style={styles.sectionHint}>Toque para editar</Text>
          </View>

          <View style={styles.grid}>
            <View style={styles.gridLeft}>
              {/* Dados pessoais: card branco sobre aba dourada */}
              <Pressable
                style={({ pressed }) => [styles.personalCard, pressed && styles.cardPressed]}
                onPress={() => setModalVisible('name')}
              >
                <View style={styles.personalTab}>
                  <Ionicons name="person-outline" size={20} color={colors.primary} />
                </View>
                <View style={[styles.personalFace, styles.cardShadow]}>
                  <Text style={styles.cardEyebrow}>DADOS PESSOAIS</Text>
                  <Text style={styles.personalName} numberOfLines={2}>{fullName}</Text>
                  <View style={styles.editRow}>
                    <Ionicons name="pencil" size={11} color={colors.disabled} />
                    <Text style={styles.editText}>Editar</Text>
                  </View>
                </View>
              </Pressable>

              {/* Segurança: bloco escuro */}
              <Pressable
                style={({ pressed }) => [styles.securityCard, pressed && styles.cardPressed]}
                onPress={() => setModalVisible('password')}
              >
                <View style={styles.securityTopRow}>
                  <View style={styles.securityIcon}>
                    <Ionicons name="lock-closed-outline" size={19} color={colors.background} />
                  </View>
                  <Ionicons name="arrow-up-right" size={18} color="#AAA49B" />
                </View>
                <View>
                  <Text style={styles.securityTitle}>Segurança</Text>
                  <Text style={styles.securityHint}>Senha e acesso</Text>
                </View>
              </Pressable>
            </View>

            {/* E-mail: aba escura no topo + card branco sobreposto */}
            <Pressable
              style={({ pressed }) => [styles.emailCard, pressed && styles.cardPressed]}
              onPress={() => setModalVisible('email')}
            >
              <View style={styles.emailTab}>
                <Ionicons name="mail-outline" size={22} color={colors.background} />
              </View>
              <View style={[styles.emailFace, styles.cardShadow]}>
                <Text style={styles.emailAt}>@</Text>
                <Text style={styles.cardEyebrow}>E-MAIL</Text>
                <Text style={styles.emailValue} numberOfLines={2}>{user?.email}</Text>
                <View style={styles.editRow}>
                  <Ionicons name="pencil" size={11} color={colors.disabled} />
                  <Text style={styles.editText}>Editar</Text>
                </View>
              </View>
            </Pressable>
          </View>

          {/* Local de trabalho */}
          <Pressable
            style={({ pressed }) => [styles.workplaceCard, styles.cardShadow, pressed && styles.cardPressed]}
            onPress={() => setModalVisible('workplace')}
          >
            <View style={styles.workplaceIcon}>
              <Ionicons name="business-outline" size={22} color={colors.background} />
            </View>
            <View style={styles.workplaceText}>
              <Text style={styles.cardEyebrow}>LOCAL DE TRABALHO</Text>
              <Text style={styles.workplaceName} numberOfLines={1}>{user?.workplace || 'Definir local'}</Text>
            </View>
            <View style={styles.workplaceArrow}>
              <Ionicons name="arrow-up-right" size={16} color={colors.primary} />
            </View>
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
    marginBottom: 14,
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

  // Grid de atividades
  grid: {
    flexDirection: 'row',
    gap: 12,
    height: 214,
    marginBottom: 12,
  },
  gridLeft: {
    flex: 1.35,
    gap: 12,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
  },
  cardEyebrow: {
    color: colors.disabled,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  editRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  editText: {
    color: colors.disabled,
    fontSize: 10,
    fontWeight: '600',
  },

  // Dados pessoais
  personalCard: {
    height: 100,
  },
  personalTab: {
    alignItems: 'flex-end',
    backgroundColor: '#D6A85F',
    borderRadius: 22,
    bottom: 10,
    justifyContent: 'center',
    paddingRight: 9,
    position: 'absolute',
    right: 0,
    top: 10,
    width: 64,
  },
  personalFace: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAE5DE',
    borderRadius: 22,
    borderWidth: 1,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 14,
    position: 'absolute',
    right: 34,
    top: 0,
  },
  personalName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
  },

  // Segurança
  securityCard: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 46,
    borderRadius: 22,
    flex: 1,
    justifyContent: 'space-between',
    padding: 14,
  },
  securityTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  securityIcon: {
    alignItems: 'center',
    backgroundColor: '#383631',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  securityTitle: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  securityHint: {
    color: '#C7C0B7',
    fontSize: 10,
    marginTop: 2,
  },

  // E-mail
  emailCard: {
    flex: 1,
  },
  emailTab: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 26,
    height: 88,
    left: 0,
    paddingTop: 13,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  emailFace: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAE5DE',
    borderRadius: 26,
    borderWidth: 1,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    paddingHorizontal: 10,
    paddingTop: 20,
    position: 'absolute',
    right: 0,
    top: 46,
  },
  emailAt: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '700',
    lineHeight: 42,
    marginBottom: 4,
  },
  emailValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Local de trabalho
  workplaceCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAE5DE',
    borderRadius: 22,
    borderTopRightRadius: 46,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  workplaceIcon: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  workplaceText: {
    flex: 1,
    marginLeft: 12,
  },
  workplaceName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  workplaceArrow: {
    alignItems: 'center',
    backgroundColor: '#D6A85F',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginLeft: 8,
    marginRight: 8,
    width: 32,
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