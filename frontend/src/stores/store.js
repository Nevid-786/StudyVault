import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice.js'
import fileReducer from './fileSlice.js'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    subjects: fileReducer,
  },
})
