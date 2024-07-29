import React, { useState } from 'react';

const UserForm = ({ changeStage }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return re.test(String(email).toLowerCase());
  };

  const validatePhoneNumber = (phoneNumber) => {
    const re = /^\+?[1-9]\d{1,14}$/;
    return re.test(phoneNumber);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!validateEmail(email)) {
        setEmailError('Por favor, ingresa un correo valido.');
        return;
      }
      setEmailError('');
    }
    setStep(step + 1);
  };

  const handlePreviousStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validatePhoneNumber(phoneNumber)) {
      setPhoneError('Por favor, ingresa un numero de telefono valido.');
      return;
    }
    setPhoneError('');
    changeStage({ email, phoneNumber });
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div>
            <label htmlFor="email" className="block mb-2 font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-4 py-2 mb-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {emailError && <p className="text-red-500 text-sm mb-2">{emailError}</p>}
          </div>
        )}

        {step === 2 && (
          <div>
            <label htmlFor="phoneNumber" className="block mb-2 font-medium text-gray-700">
              Phone Number
            </label>
            <input
              type="tel"
              id="phoneNumber"
              className="w-full px-4 py-2 mb-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
            {phoneError && <p className="text-red-500 text-sm mb-2">{phoneError}</p>}
          </div>
        )}

        <div className="flex justify-between">
          {step > 1 && (
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={handlePreviousStep}
            >
              Previous
            </button>
          )}

          {step < 2 ? (
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
              onClick={handleNextStep}
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
            >
              Submit
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default UserForm;