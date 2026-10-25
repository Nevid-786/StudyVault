import { createSlice } from '@reduxjs/toolkit'

const filesSlice = createSlice({
  name: 'files',
  initialState: {
    dProgress:[],
    uProgress:[],
    manifest:null,
  },

  reducers: {
    loadmanifest:(state,action)=>{
      const req=indexedDB.open("studyVault",1);
      req.onupgradeneeded=(e)=>{
        const db=req.result;
        const store=db.createObjectStore("subject",{
          keyPath:"id",
          autoIncrement:true
        });
        const filestore=db.createObjectStore("files",{
          keyPath:"id",
          autoIncrement:true
        });
       
        const unitsStore=db.createObjectStore("units",{
          keyPath:"id",
          autoIncrement:true
        });
       
        store.createIndex("by_name","name",{unique:false})
        filestore.createIndex("by_location",["semester","subject","unit"],{unique:false})
        unitsStore.createIndex("by_subject","name",{unique:false})
      }

      req.onsuccess=(e)=>{
        const db=req.result;
        const tx= db.transaction("subject","readonly");
        const store=tx.objectStore("subject");
        const res=store.getAll();
        res.onsuccess=()=>{
          console.log(res.result)
         
        }
      }


    },
    fileAdded: (state, action) => {
    
    },
    fileUpdated: (state, action) => {
      const file = state.find((item) => item.id === action.payload.id)
      if (file) {
        file.name = action.payload.name
      }
    },
    fileDeleted: (state, action) =>
      state.filter((file) => file.id !== action.payload),
    filesCleared: () => [],
  },
})

export const {
  fileAdded,
  fileUpdated,
  fileDeleted,
  filesCleared,
  loadmanifest
} = filesSlice.actions

export default filesSlice.reducer
