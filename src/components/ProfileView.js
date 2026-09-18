import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../styles/colors';

export default function ProfileView() {
  const { user, logout, updateProfile, updateEmail, updatePassword, updatePhoto } = useAuth();

  const [modalVisible, setModalVisible] = useState(null); // 'name', 'email', 'password'
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
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

  return (
    <View style={styles.container}>
      <View style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Perfil</Text>
          <View style={styles.headerInfo}>
            <View>
              <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
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
          <Text style={styles.sectionTitle}>Opções da Conta</Text>

          <View style={styles.combinedCardContainer}>
            <Pressable 
              style={styles.combinedCardLeft} 
              onPress={() => setModalVisible('name')}
            >
              <Ionicons name="person-outline" size={24} color={colors.text} style={{ marginBottom: 4 }} />
              <Text style={styles.combinedCardLeftText}>Dados Pessoais</Text>
            </Pressable>

            <Pressable 
              style={styles.combinedCardRight} 
              onPress={() => setModalVisible('password')}
            >
              <Ionicons name="lock-closed-outline" size={24} color={colors.background} style={{ marginRight: 8 }} />
              <Text style={styles.combinedCardRightText}>Segurança</Text>
            </Pressable>
          </View>

          {/* Email Card */}
          <Pressable style={styles.fullCard} onPress={() => setModalVisible('email')}>
            <View style={styles.fullCardIcon}>
              <Ionicons name="mail-outline" size={24} color={colors.background} />
            </View>
            <Text style={styles.fullCardTitle}>Endereço de E-mail</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.background} />
          </Pressable>

          {/* Logout Card */}
          <Pressable style={styles.fullCardRed} onPress={logout}>
            <View style={styles.fullCardIconRed}>
              <Ionicons name="log-out-outline" size={24} color="#FF4B4B" />
            </View>
            <Text style={styles.fullCardTitleRed}>Sair da Conta</Text>
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
    height: 240,
    borderBottomRightRadius: 60,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  headerTitle: {
    color: colors.background,
    fontSize: 22,
    fontWeight: '600',
  },
  headerInfo: {
    marginTop: 40,
    alignItems: 'flex-end',
  },
  userName: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  userEmail: {
    color: '#D8D2C9',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'right',
  },
  photoContainerWrapper: {
    marginTop: -80,
    marginLeft: 30,
    zIndex: 10,
  },
  photoContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#EAE5DE',
    borderRadius: 36,
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
    borderRadius: 36,
  },
  editBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EAE5DE',
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  combinedCardContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    height: 100,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  combinedCardLeft: {
    flex: 0.45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  combinedCardLeftText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  combinedCardRight: {
    flex: 0.55,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  combinedCardRightText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
  },
  fullCard: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fullCardIcon: {
    marginRight: 16,
  },
  fullCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  fullCardRed: {
    backgroundColor: '#FFF0F0',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  fullCardIconRed: {
    marginRight: 16,
  },
  fullCardTitleRed: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#FF4B4B',
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

