import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className, ...props }) => {
  const baseStyles = "font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles = {
    primary: "bg-[rgb(var(--primary-color))] hover:bg-[rgb(var(--primary-color-dark))] text-[rgb(var(--primary-text-color))] focus:ring-[rgb(var(--ring-color))]",
    secondary: "bg-[rgba(var(--text-secondary-color),0.1)] hover:bg-[rgba(var(--text-secondary-color),0.2)] text-[rgb(var(--text-color))] focus:ring-[rgb(var(--ring-color))]",
    danger: "bg-[rgb(var(--danger-color))] hover:bg-[rgb(var(--danger-color-dark))] text-[rgb(var(--primary-text-color))] focus:ring-[rgb(var(--danger-color))]",
    outline: "bg-transparent border-2 border-[rgb(var(--primary-color))] text-[rgb(var(--primary-color))] hover:bg-[rgb(var(--primary-color))] hover:text-[rgb(var(--primary-text-color))] rounded-full",
  };

  const sizeStyles = {
    sm: "py-1 px-2 text-sm",
    md: "py-2 px-4",
    lg: "py-3 px-6 text-lg",
  };

  return (
    <button className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
