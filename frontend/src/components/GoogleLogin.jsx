import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useGoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { signInSucceeded } from '../stores/authSlice.js'
import { useEffect } from 'react'
import AuthService from '../services/authService.js'

const GoogleLogin = () => {
  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)
  const [loggedIn, setLoggedIn] = useState(false);

  const [error, setError] = useState('')
  useEffect(() => {
    if(user){
      setLoggedIn(true)
    }
  
    return () => {
      
    }
  }, [user])
  

  const login = useGoogleLogin({
    flow: 'auth-code',
    scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
    onSuccess: async ({ code }) => {
      setError('')

      try {
        const result = await AuthService.login(code)
        dispatch(signInSucceeded(result))
      } catch (signInError) {
        setError(signInError instanceof Error ? signInError.message : 'Google sign-in failed')
      }
    },
    onError: () => setError('Google sign-in failed'),
  })

  return (
    <>
      <button className='border-black-2' onClick={() => login()}>{
        loggedIn?"logged":"signIn"}</button>
      {user && <p>Signed in as {user.email}</p>}
      {error && <p role="alert">{error}</p>}
    </>
  )
}

const GoogleLoginPage = () => {
  const clientId = import.meta.env.VITE_CLIENT_ID

  if (!clientId) {
    return <p role="alert">Google sign-in is not configured. Set VITE_CLIENT_ID in the frontend deployment environment and redeploy.</p>
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleLogin />
    </GoogleOAuthProvider>
  )
}

export default GoogleLoginPage