import { createSlice } from '@reduxjs/toolkit'

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    googleAccessToken: null,
    user: null,
    folderId: null,
  },
  reducers: {
    signInSucceeded: (state, action) => {
      state.googleAccessToken = action.payload.googleAccessToken;
      state.user = action.payload.user;

      state.folderId = action.payload.folderId;
    },
    signedOut: (state) => {
      state.token = null
      state.googleAccessToken = null
      state.user = null
      state.folderId = null
    },
  },
})

export const { signInSucceeded, signedOut } = authSlice.actions
export default authSlice.reducer
