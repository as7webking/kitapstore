import React from 'react'
import { RxCross1 } from "react-icons/rx";

/**
 * Inline SVG component for the close icon to avoid dependency issues in Canvas.
 */
const CrossIcon = () => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

/**
 * Компонент для отображения детальной информации о пользователе.
 * @param {Object} user - Объект с данными пользователя (username, email, address и т.д.)
 * @param {Function} setSeeUserData - Функция для управления состоянием видимости (закрытия модального окна)
 */
const SeeUserData = ({ user, setSeeUserData }) => {
  // Проверка на наличие данных, чтобы избежать ошибок при рендеринге
  if (!user) return null;

  return (
    <>
      {/* Затемнение фона (Backdrop) */}
      <div 
        className="fixed top-0 left-0 h-screen w-full bg-zinc-800 opacity-80 z-50"
        onClick={() => setSeeUserData("hidden")}
      ></div>
      
      {/* Контейнер модального окна */}
      <div className="fixed top-0 left-0 h-screen w-full flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-white text-zinc-800 rounded-lg p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-300 pointer-events-auto">
          
          {/* Кнопка закрытия */}
          <div className="flex items-center justify-between mb-4 border-b pb-2">
            <h1 className="text-2xl font-bold text-zinc-700">User Information</h1>
            <button 
              onClick={() => setSeeUserData("hidden")}
              className="text-zinc-500 hover:text-red-500 transition-colors"
              title="Close"
            >
              <CrossIcon />
            </button>
          </div>

          {/* Данные пользователя */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Username</label>
              <span className="text-lg font-medium">{user.username}</span>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email</label>
              <span className="text-lg font-medium">{user.email}</span>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Address</label>
              <span className="text-lg font-medium leading-relaxed">
                {user.address || "No address provided"}
              </span>
            </div>
          </div>

          {/* Кнопка "Ок" для быстрого закрытия */}
          <div className="mt-8 flex justify-end">
            <button 
              onClick={() => setSeeUserData("hidden")}
              className="bg-zinc-800 text-white px-6 py-2 rounded hover:bg-zinc-700 transition-all font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SeeUserData;