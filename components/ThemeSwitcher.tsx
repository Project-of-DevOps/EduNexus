
import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeSwitcher: React.FC = () => {
    const { currentTheme, setTheme, availableThemes } = useTheme();

    return (
        <div>
            <select
                value={currentTheme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="bg-[rgb(var(--subtle-background-color))] border border-[rgb(var(--border-color))] text-[rgb(var(--text-color))] text-sm rounded-lg focus:ring-1 focus:ring-[rgb(var(--ring-color))] focus:border-[rgb(var(--primary-color))] block w-full p-1.5"
                aria-label="Select theme"
            >
                {availableThemes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                ))}
            </select>
        </div>
    );
};

export default ThemeSwitcher;
