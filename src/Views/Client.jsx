import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getImgUrl } from '../Utils/firebase';

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

  const handleDownload = () => {
    if (downloadURL) {
      const link = document.createElement('a');
      link.href = downloadURL;
      link.download = `sigmaAgro_photo-${id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = async () => {
    if (downloadURL) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Sigma Agro Foto',
            text: 'Comparti la foto en redes sociales!',
            url: window.location.href,
          });
        } catch (error) {
          console.error('Error sharing:', error);
        }
      } else {
        alert('Web Share API is not supported in your browser. You can manually copy the URL to share.');
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