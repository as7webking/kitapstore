import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: { status: 'checking', isLoggedIn: false, role: 'user', user: null, message: '' },
  reducers: {
    checking(state) { state.status = 'checking'; state.isLoggedIn = false; state.user = null; state.role = 'user'; },
    authenticated(state, { payload }) {
      state.status = 'authenticated'; state.isLoggedIn = true;
      state.user = payload; state.role = payload.role; state.message = '';
    },
    logout(state, { payload }) {
      state.status = 'guest'; state.isLoggedIn = false; state.role = 'user'; state.user = null;
      state.message = payload || '';
    },
    unavailable(state) { state.status = 'error'; state.isLoggedIn = false; state.role = 'user'; state.user = null; },
  },
});
export const authActions = authSlice.actions;
export default authSlice.reducer;
