import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getImgUrl } from '../Utils/firebase';
import { saveAs } from 'file-saver';

function Client() {
  const { id } = useParams();
  const [downloadURL, setDownloadURL] = useState(null);

  useEffect(() => {
    const fetchData = async (id) => {
      const url = await getImgUrl(id);
      setDownloadURL(url);
    };

    fetchData(id);
  }, [id]);

  const handleDownload = async () => {
    if (downloadURL) {
      try {
        // Fetch the image as a blob
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        // Use FileSaver to save the blob as a file
        saveAs(blob, `sigmaAgro_photo-${id}.png`);
      } catch (error) {
        console.error('Error downloading the image:', error);
      }
    }
  };

  const handleShare = async () => {
    if (downloadURL) {
      try {
        // Fetch the image as a blob
        const response = await fetch(downloadURL);
        const blob = await response.blob();

        // Check if the Web Share API is available
        if (navigator.share) {
          await navigator.share({
            files: [new File([blob], `sigmaAgro_photo-${id}.png`, { type: blob.type })],
            title: 'Check out this image!',
            text: 'Shared from SigmaAgro'
          });
        } else {
          // Fallback for browsers that don't support the Web Share API
          console.log('Web Share API not supported');
          // Here you could implement a custom share dialog or other sharing methods
        }
      } catch (error) {
        console.error('Error sharing the image:', error);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div class="flex space-x-4">
      <button 
        onClick={handleDownload} 
        disabled={!downloadURL}
        class="px-4 py-2 font-semibold text-white bg-blue-500 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 active:bg-blue-700"
      >
        Descargar Foto
      </button>
      <button 
        onClick={handleShare} 
        disabled={!downloadURL}
        class="px-4 py-2 font-semibold text-white bg-green-500 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 active:bg-green-700"
      >
        Compartir
      </button>
    </div>
      <h1>CLIENT {id}</h1>
      {downloadURL ? (
        <img src={downloadURL} alt="Downloaded" className="max-w-full h-auto" />
      ) : (
        <p>Loading image...</p>
      )}
    </div>
  );
}

export default Client;