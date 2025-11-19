import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input: React.FC<InputProps> = ({ label, id, ...props }) => {
  return (
    <div>
      {label && <label htmlFor={id} className="block mb-2 text-sm font-medium text-[rgb(var(--text-color))]">{label}</label>}
      <input
        id={id}
        className="bg-[rgba(var(--text-color),0.02)] border border-[rgb(var(--border-color))] text-[rgb(var(--text-color))] placeholder:text-[rgb(var(--text-secondary-color))] sm:text-sm rounded-lg focus:ring-1 focus:ring-[rgb(var(--ring-color))] focus:border-[rgb(var(--primary-color))] block w-full p-2.5"
        {...props}
      />
    </div>
  );
};

export default Input;