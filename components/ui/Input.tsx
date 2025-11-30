import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  rightElement?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, id, error, className, rightElement, ...props }) => {
  return (
    <div>
      {label && <label htmlFor={id} className="block mb-2 text-sm font-medium text-[rgb(var(--text-color))]">{label}</label>}
      <div className="relative">
        <input
          id={id}
          className={`bg-[var(--input-bg)] border border-[rgb(var(--border-color))] text-[rgb(var(--text-color))] caret-[rgb(var(--text-color))] placeholder:text-[rgb(var(--text-secondary-color))] sm:text-sm rounded-lg focus:ring-1 focus:ring-[rgb(var(--ring-color))] focus:border-[rgb(var(--primary-color))] block w-full p-2.5 ${error ? 'border-red-500' : ''} ${rightElement ? 'pr-10' : ''} ${className || ''}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default Input;