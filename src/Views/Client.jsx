import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getImgUrl } from '../Utils/firebase';

function Client() {
  const { id } = useParams();
  const [downloadURL, setDownloadURL] = useState(null);

  //Generates Photo Download URL from ID
  useEffect(() => {

    const fetchData = async (id) => {
      const url = await getImgUrl(id);
      setDownloadURL(url) 
    }

    fetchData(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
    <h1>CLIENT {id}</h1>
    {downloadURL ? (
      <img src={downloadURL} alt="Downloaded" />
    ) : (
      <p>Loading image...</p>
    )}
  </div>
  )
}

export default Client