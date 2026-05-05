import React from "react";
import { 
  HashRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useLocation, 
  useNavigate 
} from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, 
  ChevronRight,
  Globe,
  Plus
} from "lucide-react";
import { signInWithGoogle } from "@/lib/firebase";
import { cn } from "@/src/lib/utils";
import { AuthProvider, Navbar } from "./components/Navbar";
import { GoogleDriveProvider } from "./lib/drive";
import Archive from "./pages/Archive";
import CreateAlbum from "./pages/CreateAlbum";
import AlbumDetails from "./pages/AlbumDetails";
import EditAlbum from "./pages/EditAlbum";

export { useAuth } from "./components/Navbar";

// --- Components ---

function Hero() {
  return (
    <section className="relative pt-48 pb-20 px-12 overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full md:w-1/2"
        >
          <span className="label-micro mb-8 inline-block px-4 py-1.5 border border-border-toned rounded-full">
            Featured Collections
          </span>
          <h1 className="text-6xl md:text-[7rem] font-bold italic text-ink mb-10 leading-[0.85] tracking-tight">
            Wanderful <br />
            <span className="text-accent underline decoration-border-toned decoration-4 underline-offset-[12px]">Sandy.</span>
          </h1>
          <p className="max-w-xl text-muted-gold text-lg md:text-xl font-serif italic mb-14 leading-relaxed">
            "We travel not to escape life, but for life not to escape us." — A dedicated space for Sandy's world explorations and cherished moments.
          </p>
          <div className="flex flex-col sm:flex-row gap-6">
            <Link 
              to="/archive"
              className="bg-accent text-white px-10 py-5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#4A4A35] transition-all shadow-2xl shadow-accent/20 hover:scale-105 flex items-center gap-3"
            >
              Explore Archive <ChevronRight size={14} />
            </Link>
            <button 
              onClick={signInWithGoogle}
              className="bg-white border border-border-toned text-ink px-10 py-5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-paper transition-all shadow-sm flex items-center gap-3"
            >
              Start Journaling
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="w-full md:w-1/2 relative aspect-[4/5]"
        >
          <div className="absolute inset-0 bg-white p-4 shadow-2xl shadow-black/5 rotate-[-2deg] transition-transform hover:rotate-0 duration-700">
             <div className="w-full h-full bg-gray-100 overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800" 
                  className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-1000" 
                  alt="Featured Mountainscape" 
                />
             </div>
             <div className="absolute bottom-10 left-10 text-white drop-shadow-lg">
                <p className="label-micro text-white/90 mb-1">Dolomites, Italy</p>
                <p className="text-3xl font-serif italic">The Peak of Serenity</p>
             </div>
          </div>
          
          <div className="hidden md:block absolute -bottom-12 -left-12 w-48 aspect-square bg-white p-2 border border-border-toned shadow-xl rotate-[6deg]">
             <img 
              src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=400" 
              className="w-full h-full object-cover" 
              alt="Thumbnail" 
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
    >
      {children}
    </motion.div>
  );
}

// --- Main App ---

export default function App() {
  return (
    <AuthProvider>
      <GoogleDriveProvider>
        <Router>
          <div className="min-h-screen bg-paper font-sans text-ink selection:bg-accent/20">
            <Navbar />
            <main className="relative min-h-[80vh]">
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<PageTransition><Hero /></PageTransition>} />
                  <Route path="/archive" element={<PageTransition><Archive /></PageTransition>} />
                  <Route path="/create" element={<PageTransition><CreateAlbum /></PageTransition>} />
                  <Route path="/edit/:id" element={<PageTransition><EditAlbum /></PageTransition>} />
                  <Route path="/album/:id" element={<PageTransition><AlbumDetails /></PageTransition>} />
                </Routes>
              </AnimatePresence>
            </main>
            
            <footer className="mt-40 py-20 border-t border-border-toned bg-paper">
              <div className="max-w-7xl mx-auto px-12 flex flex-col md:flex-row justify-between items-center gap-12 text-center md:text-left">
                <div className="space-y-4">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <div className="p-2 bg-accent rounded-full text-white shadow-lg"><Globe size={16} /></div>
                    <span className="text-xl tracking-tighter font-bold uppercase">Sandy's Wanderful Adventures</span>
                  </div>
                  <p className="max-w-xs text-[11px] text-muted-gold font-sans uppercase tracking-widest leading-relaxed">
                    A digital gallery for the nomadic soul. Preserve your stories, protected and personal.
                  </p>
                </div>
                
                <div className="flex flex-col items-center md:items-end gap-6 text-muted-gold">
                  <div className="flex gap-8">
                    {['Instagram', 'Twitter', 'Pinterest'].map(social => (
                      <a key={social} href="#" className="text-[10px] uppercase tracking-[0.2em] font-bold hover:text-ink transition-colors">
                        {social}
                      </a>
                    ))}
                  </div>
                  <p className="label-micro opacity-50">
                    Handcrafted for Modern Travelers • 2026
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </Router>
      </GoogleDriveProvider>
    </AuthProvider>
  );
}
