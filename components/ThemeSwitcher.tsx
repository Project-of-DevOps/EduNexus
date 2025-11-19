
import React from 'react';
import { useTheme } from '../context/ThemeContext';

const themes = [
    { id: 'light-white', name: 'Default Light' },
    { id: 'light-pink', name: 'Light Pink' },
    { id: 'light-green', name: 'Light Green' },
    { id: 'light-brown', name: 'Light Brown' },
    { id: 'black', name: 'Default Dark' },
];

const ThemeSwitcher: React.FC = () => {
    const { theme, setTheme } = useTheme();

    return (
        <div>
            <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="bg-[rgb(var(--subtle-background-color))] border border-[rgb(var(--border-color))] text-[rgb(var(--text-color))] text-sm rounded-lg focus:ring-1 focus:ring-[rgb(var(--ring-color))] focus:border-[rgb(var(--primary-color))] block w-full p-1.5"
                aria-label="Select theme"
            >
                {themes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </select>
        </div>
    );
};

export default ThemeSwitcher;
