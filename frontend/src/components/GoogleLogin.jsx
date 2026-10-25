import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useGoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { signInSucceeded } from '../stores/authSlice.js'
import { useEffect } from 'react'

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
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
        const response = await fetch(`${apiUrl}/google/code`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        const result = await response.json()
        console.log("user login:", result);

        if (!response.ok) {
          throw new Error(result.message || 'Google sign-in failed')
        }

        dispatch(
          signInSucceeded(result),
        )
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

const GoogleLoginPage = () => (
  <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID}>
    <GoogleLogin />
  </GoogleOAuthProvider>
)

export default GoogleLoginPage