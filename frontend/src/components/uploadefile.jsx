import { useState } from 'react'
import localDB from '../config/indexdb';

const Uploadefile = () => {
    const [file, setFile] = useState(null);
    const onChange = (event) => {
        setFile(event.target.files?.[0] ?? null);
    }
    const handleclick=async ()=>{
        console.log("uplaod clicked")
        if(!file)return;
        
       const result= await localDB.upload(file,file.name,"semester","subject","unit");
       console.log(result)
        
    }
  return (
    <div>
      <label htmlFor="file">  {file && <p>Selected: {file.name}</p>}</label>
      <input className='p-2 bg-blue-600 rounded-2xl' type="file" onChange={onChange} name="file" id="file" />
      <button onClick={handleclick}>
        upload
      </button>
    
    </div>
  )
}

export default Uploadefile