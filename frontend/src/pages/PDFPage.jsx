import React from 'react'
import { useParams } from 'react-router-dom'
import subjectService from '../services/subjectService'
import { PDFViewer } from '../components/PdfViewer';

function PDFPage() {
    const { lid } = useParams();
    const [pdfFile, setPdfFile] = React.useState(null);
    const loadFile=async ()=>{
      const file= await subjectService.getFileByLid(lid);
        if (file) {
            setPdfFile(file.file);
        }
        console.log(file)
}
    React.useEffect(() => {
      loadFile()
    }, [lid]);
  return (
    <div  className=' h-screen w-full border-black-2 bg-blue-300'>
        {pdfFile ? (
            <PDFViewer pdfFile={pdfFile} />
        ) : (
            <p>Loading PDF...</p>
        )}


    </div>
  ) 
}

export default PDFPage