

import { useEffect } from 'react'
import { Outlet } from 'react-router'
import AuthService from '../services/authService'
import { useDispatch } from 'react-redux'
import {signInSucceeded}from "../stores/authSlice"
import GoogleDriveService from '../services/googleDrive'


const AuthenticateLayout = () => {
    const dispatch=useDispatch();
    const getuser= async ()=>{
      try {
         const res= await AuthService.currentUser();
         console.log("user",res);
         dispatch(signInSucceeded(res.data));

        

      } catch (error) {
        
      }

    }
useEffect(() => {
     getuser();
     console.log("auth layout loaded")
  return () => {
    
  }
}, [])


  return <Outlet />
}

export default AuthenticateLayout