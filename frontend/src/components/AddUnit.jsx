import { useState,useEffect } from 'react'
import SubjectService from '../services/subjectService'


const AddUnit = ({name,setIsOpen,isOpen}) => {

  const [subjectname, setSubjectname] = useState('')
  const [title, setTitle] = useState('')
  const [number, setNumber] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => {
    if(name){
      setSubjectname(name)
    }

  
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    console.log("Adding unit:", subjectname, title, number)
    try {
      const res=await SubjectService.addUnit(subjectname, title, Number(number))
      console.log("Unit added:", res)
      setMessage('Unit added successfully.')
      setIsOpen(false)
      setSubjectname('')
      setTitle('')
      setNumber('')
    } catch (error) {
      setMessage(error.message || 'Unable to add unit.')
    }
  }

  return (
    isOpen && (
      <div className="add-unit-modal flex flex-col z-10  justify-center items-center">
   {message && <p role="status">{message}</p>}
        <div role="dialog" aria-modal="true" aria-labelledby="add-unit-heading">
          <form onSubmit={handleSubmit}>
            <h2 id="add-unit-heading">Add a unit</h2>
            <label>
              Unit title
              <input value={title} onChange={(event) => setTitle(event.target.value)} required />
            </label>
            <label>
              Unit number
              <input type="number" value={number} onChange={(event) => setNumber(event.target.value)} required />
            </label>
            <button type="submit">Save unit</button>
            <button type="button" onClick={() => setIsOpen(false)}>Cancel</button>
          </form>
        </div>  
      
         </div> 
  )
)
}

export default AddUnit;