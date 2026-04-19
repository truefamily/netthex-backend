export default function SplashScreen() {
  return (
    <div className="min-h-screen bg-[#eef3fb] flex items-center justify-center">
      <div className="relative">
        {/* Fond animé */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-sky-200/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/3 left-1/4 -translate-x-1/2 w-48 h-48 bg-sky-100/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Contenu principal */}
        <div className="flex flex-col items-center gap-8">
          {/* Logo animé */}
          <div className="animate-bounce">
            <svg
              viewBox="0 0 256 256"
              aria-hidden="true"
              className="h-20 w-20 text-black/70"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M90 90c0-27 5-44 10-44 4 0 7 5 10 10 5 9 13 18 30 18h23c38 0 57 18 57 58v37c0 30-3 45-23 58v-93c0-22-11-32-35-32h-52c-19 0-27-9-27-28V90Z"
                fill="currentColor"
              />
              <path
                d="M110 190c0 11-6 23-15 31-7 6-13 10-19 12-3 1-5-1-5-4V130c0-8 17-19 32-24 4-2 7 0 7 4v80Z"
                fill="currentColor"
              />
            </svg>
          </div>

         
          
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  )
}
