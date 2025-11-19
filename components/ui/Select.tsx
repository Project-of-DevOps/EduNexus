
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({ label, id, children, ...props }) => {
  return (
    <div>
      {label && <label htmlFor={id} className="block mb-2 text-sm font-medium text-[rgb(var(--text-color))]">{label}</label>}
      <select
        id={id}
        className="bg-[rgb(var(--subtle-background-color))] border border-[rgb(var(--border-color))] text-[rgb(var(--text-color))] sm:text-sm rounded-lg focus:ring-1 focus:ring-[rgb(var(--ring-color))] focus:border-[rgb(var(--primary-color))] block w-full p-2.5"
        {...props}
      >
        {children}
      </select>
    </div>
  );
};

export default Select;
