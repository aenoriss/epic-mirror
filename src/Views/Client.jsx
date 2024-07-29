import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import  ImageDisplay from '../Components/ImageDisplay';
import  UserForm  from '../Components/UserForm';
import { validatePhoto } from '../Utils/firebase';
import { getImgData } from '../Utils/firebase';

function Client() {
  const { id } = useParams();
  const [stage, setStage] = useState(1);
  const [downloadURL, setDownloadURL] = useState(null);
  const [imgStatus, setImgStatus] = useState(false);

  useEffect(() => {
    const fetchData = async (id) => {
      const data = await getImgData(id);
      setDownloadURL(data["url"]);
      setImgStatus(data["status"]);
    };

    fetchData(id);
  }, [id]);

  const changeStage = (formData) => {
    validatePhoto(formData, id);
    setStage(2);
  }

  return (
    <div>
      {imgStatus && <div>
        {stage == 1 && imgStatus != "validated" ? <UserForm changeStage={changeStage} /> : <ImageDisplay downloadURL={downloadURL} id={id}/>}
      </div>}
    </div>
  );
}

export default Client;