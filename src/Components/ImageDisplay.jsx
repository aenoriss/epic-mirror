import React, { useEffect, useState } from "react";
import { getImageBlob } from '../Utils/firebase';

const ImageDisplay = ({downloadURL, id}) => {
  const [imageBlob, setImageBlob] = useState(null);

  useEffect(() => {
    const blobCreation = async (downloadURL) => {
      const blob = await getImageBlob(downloadURL);
      setImageBlob(blob);
    };

    downloadURL && blobCreation(downloadURL);

  }, [downloadURL]);

  const handleDownload = async () => {
    if (downloadURL) {
      try {
        saveAs(imageBlob, `sigmaAgro_photo-${id}.png`);
      } catch (error) {
        console.error("Error downloading the image:", error);
      }
    }
  };

  const handleShare = async () => {
    if (downloadURL) {
      try {
        if (navigator.share) {
          await navigator.share({
            files: [
              new File([imageBlob], `sigmaAgro_photo-${id}.png`, {
                type: "image/png",
              }),
            ],
            title: "Check out this image!",
            text: "Shared from SigmaAgro",
          });
        } else {
          console.log("Web Share API not supported");
          // Implement a fallback sharing method here
        }
      } catch (error) {
        console.error("Error sharing the image:", error);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="flex space-x-4">
        <button
          onClick={handleDownload}
          disabled={!downloadURL && !imageBlob}
          className="px-4 py-2 font-semibold text-white bg-blue-500 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 active:bg-blue-700"
        >
          Descargar Foto
        </button>
        <button
          onClick={handleShare}
          disabled={!downloadURL && !imageBlob}
          className="px-4 py-2 font-semibold text-white bg-green-500 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 active:bg-green-700"
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
};

export default ImageDisplay;
