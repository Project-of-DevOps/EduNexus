import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import ThemeSwitcher from './ThemeSwitcher';
import { useData } from '../context/DataContext';

interface LayoutProps {
  children: React.ReactNode;
  navItems: { name: string; icon: React.ReactElement }[];
  activeItem: string;
  setActiveItem: (item: string) => void;
  setShowMessages?: (show: boolean) => void;
}

const Icon = ({ path, className }: { path: string, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

const Layout: React.FC<LayoutProps> = ({ children, navItems, activeItem, setActiveItem, setShowMessages }) => {
  const { user, logout } = useAuth();
  const { messages } = useData();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const roleName = user?.role.charAt(0).toUpperCase() + user?.role.slice(1);

  const unreadMessagesCount = messages.filter(m => !m.readBy.includes(user?.id ?? '')).length;

  return (
    <div className="flex h-screen bg-[rgb(var(--background-color))] text-[rgb(var(--text-color))]">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-[rgb(var(--foreground-color))] shadow-xl transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex md:flex-shrink-0`}>
        <div className="flex flex-col h-full">
          <div className="h-20 flex items-center justify-center bg-[rgba(var(--primary-color),0.05)]">
            <h1 className="text-2xl font-bold text-[rgb(var(--primary-color))]">EduNexus AI</h1>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  setActiveItem(item.name);
                  if (setShowMessages) setShowMessages(false);
                }}
                className={`flex items-center w-full px-4 py-2 text-left rounded-lg transition-colors duration-200 ${
                  activeItem === item.name
                    ? 'bg-[rgb(var(--primary-color))] text-[rgb(var(--primary-text-color))]'
                    : 'hover:bg-[rgba(var(--primary-color),0.1)]'
                }`}
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </button>
            ))}
          </nav>
           <div className="p-4 border-t border-[rgb(var(--border-color))]">
             <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-left rounded-lg transition-colors duration-200 hover:bg-[rgb(var(--danger-subtle-color))] text-[rgb(var(--danger-color))]">
                <Icon path="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                <span className="ml-3">Logout</span>
             </button>
           </div>
        </div>
      </aside>
      
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-20 px-6 bg-[rgb(var(--foreground-color))] border-b border-[rgb(var(--border-color))]">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-[rgb(var(--text-secondary-color))] focus:outline-none">
             <Icon path="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </button>
          <div className="flex items-center">
            {/* Header Content can go here */}
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            {setShowMessages && (
              <button onClick={() => setShowMessages(true)} className="relative text-[rgb(var(--text-secondary-color))] hover:text-[rgb(var(--text-color))]">
                <Icon path="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[rgb(var(--danger-color))] text-xs font-bold text-[rgb(var(--primary-text-color))]">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
            )}
            <div className="text-right">
                <p className="font-semibold">{user?.name}</p>
                <p className="text-sm text-[rgb(var(--text-secondary-color))]">{roleName}</p>
            </div>
             <img className="w-10 h-10 rounded-full" src={`https://i.pravatar.cc/150?u=${user?.id}`} alt="User Avatar" />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[rgb(var(--background-color))] p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
