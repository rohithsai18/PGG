import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const storage = {
  async setSession(token: string, user: unknown) {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(user)]
    ]);
  },

  async getSession() {
    const [token, user] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
    return {
      token: token[1],
      user: user[1] ? JSON.parse(user[1]) : null
    };
  },

  async clearSession() {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }
};
