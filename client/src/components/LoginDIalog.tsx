import React, { useState } from 'react';
import { Eye, EyeOff, BookOpen, CheckCircle, AlertTriangle } from 'lucide-react';


interface FormData {
  registrationNumber: string;
  password: string;
  rememberMe: boolean;
}

const LoginDialog: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    registrationNumber: '',
    password: '',
    rememberMe: false,
  });

  
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.registrationNumber) {
      newErrors.registrationNumber = 'Registration number is required';
    } else if (!formData.registrationNumber) {
      newErrors.registrationNumber = 'Please enter a valid 10-digit registration number';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const saveToLocalStorage = () => {
    localStorage.setItem('gguRegistrationNumber', formData.registrationNumber);
    localStorage.setItem('gguPass', formData.password);
    localStorage.setItem('loginDate', new Date().toISOString());
  };

  const initializeBrowser = async () => {
    try {
      console.log('Sending request with data:', {
        registrationNumber: formData.registrationNumber,
        password: '***' // Don't log actual password
      });
      
      const response = await fetch('http://localhost:5173/api/initilizethebrowser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registrationNumber: formData.registrationNumber,
          password: formData.password
        }),
      });
      
      const data = await response.json();
      console.log(data)
      
      if (!response.ok) {
        console.error('Server returned error:', data);
        throw new Error(data.error || 'Login failed. Please check your credentials.');
      }
      
      console.log('Response data:', data);
      return data;
    } catch (error) {
      console.error('Error initializing browser:', error);
      setLoginError((error as Error).message || 'Login failed. Please try again.');
      throw error;
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    if (validateForm()) {
      setIsLoading(true);
      
      try {
        // Call the API endpoint
        await initializeBrowser();
        saveToLocalStorage();
        setIsSuccess(true);
        
        // Reset success message after 3 seconds
        setTimeout(() => {
          setIsSuccess(false);
          window.location.reload();
        }, 3000);
      } catch (error) {
        // Error is handled in initializeBrowser
        console.error('Login failed:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-gray-800 shadow-2xl transition-all duration-300 border border-gray-700">
        {/* University Header */}
        <div className="bg-gradient-to-r from-purple-900 to-indigo-800 p-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/api/placeholder/400/200')] opacity-10 mix-blend-overlay"></div>
          <div className="relative z-10">
            <div className="mb-2 flex items-center justify-center">
              <BookOpen size={32} className="mr-2 text-amber-400" />
              <h1 className="text-xl font-bold tracking-wider text-white">GURU GHASI DAS UNIVERSITY</h1>
            </div>
            <p className="text-sm italic text-gray-300">(A Central University established by the Central Universities Act 2009)</p>
          </div>
        </div>
        
        {/* Form */}
        <div className="p-6">
          <h2 className="mb-6 text-center text-xl font-semibold text-gray-200">Samarth Portal Login</h2>
          
          {isSuccess && (
            <div className="mb-4 flex items-center rounded-md bg-green-900/30 p-3 text-green-400 border border-green-700">
              <CheckCircle size={20} className="mr-2 text-green-400" />
              <span>Login successful!</span>
            </div>
          )}

          {loginError && (
            <div className="mb-4 flex items-center rounded-md bg-red-900/30 p-3 text-red-400 border border-red-700">
              <AlertTriangle size={20} className="mr-2 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="registrationNumber" className="mb-1.5 block text-sm font-medium text-gray-300">
                GGU Registration Number
              </label>
              <input
                type="text"
                id="registrationNumber"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleInputChange}
                className={`w-full rounded-md border bg-gray-700 ${
                  errors.registrationNumber ? 'border-red-500' : 'border-gray-600'
                } px-3 py-2.5 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-200 text-gray-200`}
                placeholder="Enter 10-digit registration number"
              />
              {errors.registrationNumber && (
                <p className="mt-1.5 text-sm text-red-400">{errors.registrationNumber}</p>
              )}
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-300">
                Samarth Portal Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full rounded-md border bg-gray-700 ${
                    errors.password ? 'border-red-500' : 'border-gray-600'
                  } px-3 py-2.5 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-200 text-gray-200`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-sm text-red-400">{errors.password}</p>
              )}
            </div>
            
            <div className="mb-6 flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-800"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-300">
                Remember me
              </label>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-center font-medium text-white shadow-sm 
                hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800
                transition-all duration-200 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="mr-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </span>
              ) : (
                'Save & Login'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
           
            <p className="mt-4 text-xs text-gray-400">
              © 2025 Guru Ghasi Das University. For Testing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginDialog;