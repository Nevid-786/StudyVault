import Login from "../pages/Login"
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import GoogleDriveService from "../services/googleDrive";
import {syncFilesWithGoogleDrive} from "../config/sync"
const TopBar = ({ islogged, user }) => {
  const [syncStatus, setSyncStatus] = useState(false);

  const googleAccessToken = useSelector((state) => state.auth.googleAccessToken);


  const handleSyncClick = async () => {
    setSyncStatus(true);
    

    if (!islogged) {
      alert("Please log in to sync with Google Drive.");
      return;
    }

    const result = await syncFilesWithGoogleDrive(googleAccessToken) 
    // Implement the sync functionality here
    console.log(result);
    setSyncStatus(false);
  };







  return (
    <header className="topbar">
      <div className="topbar-search">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span>Search notes, lectures, transcripts…</span>
        <kbd>⌘K</kbd>
      </div>
      <div className="topbar-right">
        {
          islogged && (<div className="topbar-sync" disabled={syncStatus} onClick={handleSyncClick}>
            <span>Sync</span> <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </div>)
        }
        <span>{
          islogged ? "Google Connected" : "Google Drive Disconnected"
        }
        </span>
      <button className="topbar-bell">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span className="topbar-bell-dot" />
      </button>

      {
        islogged ? (<div className="topbar-avatar">
          <div className="avatar-circle overflow-hidden"><img src={user?.picture} /></div>
          <div>
            <div className="avatar-name">{user.name}</div>
            {/* <div className="avatar-role">{user.role}</div> */}
          </div>  </div>
        ) : (<Login />)
      }

    </div>
    </header >
  )
}

export default TopBar
