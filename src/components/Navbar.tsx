import React, { createContext, useContext, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, 
  Map, 
  Plus, 
  LogOut, 
  Menu, 
  X,
} from "lucide-react";
import { auth, signInWithGoogle } from "@/src/lib/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";

// --- Contexts ---
interface AuthContextType {
  user: User | null;
  loading: boolean;
}
const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function Navbar() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { name: "Archive", path: "/archive" },
    { name: "Create", path: "/create", auth: true },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-paper/80 backdrop-blur-md border-b border-border-toned/60 px-12">
      <div className="max-w-7xl mx-auto h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-accent/20">
            <Camera size={16} />
          </div>
          <span className="text-xl tracking-tighter font-bold uppercase text-ink">
            Sandy's Wanderful Adventures
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            (!link.auth || user) && (
              <Link 
                key={link.path} 
                to={link.path}
                className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
                  location.pathname === link.path ? 'text-ink border-b-2 border-accent pb-1' : 'text-muted-gold hover:text-ink'
                }`}
              >
                {link.name}
              </Link>
            )
          ))}
          {user ? (
            <div className="flex items-center gap-8 border-l border-border-toned pl-10 ml-2">
              <div className="flex items-center gap-3">
                <span className="label-micro">{user.displayName}</span>
                {!!user.photoURL && (
                  <img src={user.photoURL} className="w-8 h-8 rounded-full border border-border-toned shadow-sm" alt="avatar" />
                )}
              </div>
              <button 
                onClick={() => signOut(auth)}
                className="p-2 text-muted-gold hover:text-red-800 transition-colors"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="bg-accent text-white px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#4A4A35] transition-all shadow-md shadow-accent/10"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden p-2 text-[#5A5A40]" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#FDFCF8] border-b border-[#5A5A40]/10 overflow-hidden shadow-2xl"
          >
            <div className="p-6 flex flex-col gap-6">
              {navLinks.map((link) => (
                (!link.auth || user) && (
                  <Link 
                    key={link.path} 
                    to={link.path} 
                    onClick={() => setIsOpen(false)}
                    className="text-2xl font-serif italic text-[#5A5A40]"
                  >
                    {link.name}
                  </Link>
                )
              ))}
              {!user ? (
                <button 
                  onClick={() => { signInWithGoogle(); setIsOpen(false); }}
                  className="bg-[#5A5A40] text-white p-4 rounded-2xl font-bold uppercase tracking-widest"
                >
                  Sign In with Google
                </button>
              ) : (
                <button 
                  onClick={() => { signOut(auth); setIsOpen(false); }}
                  className="flex items-center gap-2 text-red-800 font-bold uppercase tracking-widest"
                >
                  <LogOut size={20} /> Sign Out
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
