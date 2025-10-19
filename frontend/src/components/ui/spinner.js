import React from 'react';

export const Spinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={`inline-block ${sizeClasses[size]} border-current border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="loading"
    />
  );
};

export const LoadingOverlay = ({ message = 'Memuat...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Spinner size="lg" className="text-blue-600 mb-4" />
      <p className="text-gray-600 text-lg">{message}</p>
    </div>
  );
};

export const ButtonSpinner = () => {
  return <Spinner size="sm" className="text-white mr-2" />;
};
