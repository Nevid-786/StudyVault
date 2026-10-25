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
      console.log("payload",action.payload)
      state.googleAccessToken = action.payload.googleAccessToken;
      state.user = action.payload.user;

      console.log("folderId", action.payload.folderId);
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
