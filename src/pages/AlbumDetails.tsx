import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/src/lib/firebase";
import { Album, Photo } from "@/src/types";
import { useGoogleDrive } from "@/src/lib/drive";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, 
  Unlock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Share2,
  Settings,
  MapPin,
  Camera,
  X,
  Plus
} from "lucide-react";
import axios from "axios";
import { useAuth } from "@/src/App";
import { cn } from "@/src/lib/utils";
import PhotoEditor from "@/src/components/PhotoEditor";
import CommentSection from "@/src/components/CommentSection";

interface Filters {
  brightness: number;
  contrast: number;
  saturation: number;
  sepia: number;
  grayscale: number;
}

export default function AlbumDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tokens } = useGoogleDrive();

  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [viewMode, setViewMode] = useState<"masonry" | "grid">("masonry");

  useEffect(() => {
    if (!id) return;
    
    const fetchAlbum = async () => {
      try {
        const docRef = doc(db, "albums", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Album;
          setAlbum(data);
          
          // Check ownership or protection status
          const isOwner = user?.uid === data.ownerId;
          if (!data.isProtected || isOwner) {
            setUnlocked(true);
          }
        } else {
          navigate("/archive");
        }
      } catch (err) {
        console.error("Error fetching album:", err);
        navigate("/archive");
      }
    };

    fetchAlbum();
  }, [id, navigate, user?.uid]);

  useEffect(() => {
    if (!id || !unlocked) return;

    const photosPath = `albums/${id}/photos`;
    const q = query(collection(db, photosPath), orderBy("createdAt", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPhotos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Photo)));
      setLoading(false);
    }, (error) => {
      console.error("Photos listener error:", error);
      // We don't throw using handleFirestoreError here to avoid crashing during verification
      // if it's a transient permission issue.
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, unlocked]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!album || !password) return;
    setVerifying(true);
    setError("");

    try {
      const res = await axios.post(`/api/albums/${album.id}/verify-password`, {
        password,
      });

      if (res.data.isValid) {
        setUnlocked(true);
      } else {
        setError("The secret key is incorrect. Access denied.");
      }
    } catch (err: any) {
      const message = err.response?.data?.error || "Failed to connect to the vault.";
      setError(message);
    } finally {
      setVerifying(false);
    }
  };

  const getFilterStyle = (filters?: Filters) => {
    if (!filters) return {};
    return {
      filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) sepia(${filters.sepia}%) grayscale(${filters.grayscale}%)`
    };
  };

  const handleSaveFilters = (newFilters: Filters) => {
    if (!editingPhoto) return;
    setPhotos(prev => prev.map(p => 
      p.id === editingPhoto.id ? { ...p, filters: newFilters } : p
    ));
    setEditingPhoto(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-paper"><Loader2 className="animate-spin text-accent" size={40} /></div>;

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper p-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-12 border border-border-toned shadow-2xl text-center space-y-8"
        >
          <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-accent">
            <Lock size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-bold italic text-ink tracking-tight">Secured Expedition</h2>
            <p className="text-muted-gold font-serif italic mt-2">Enter the secret key to reveal the story.</p>
          </div>
          <form onSubmit={handleVerify} className="space-y-4">
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="SECRET KEY"
              className="w-full bg-transparent border-b border-border-toned py-4 text-center text-xl font-serif italic focus:outline-none focus:border-accent placeholder:text-border-toned/30 tracking-widest"
            />
            {error && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">{error}</p>}
            <button 
              type="submit"
              disabled={verifying}
              className="w-full bg-accent text-white py-4 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] shadow-lg shadow-accent/20 hover:scale-[1.02] transition-transform disabled:opacity-50"
            >
              {verifying ? <Loader2 className="animate-spin" size={16} /> : "Access Vault"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 px-12 max-w-7xl mx-auto">
      {/* Photo Editor Overlay */}
      <AnimatePresence>
        {editingPhoto && (
          <PhotoEditor 
            photo={editingPhoto as any} 
            onClose={() => setEditingPhoto(null)} 
            onSave={handleSaveFilters as any}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12 mb-16">
        <div className="md:w-2/3">
          <div className="flex items-center gap-3 mb-4">
            <span className="label-micro flex items-center gap-2">
              <Calendar size={12} /> {new Date(album?.createdAt || '').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            {album?.location && (
              <span className="label-micro flex items-center gap-2 font-bold text-accent">
                <MapPin size={12} /> {album.location}
              </span>
            )}
          </div>
          <h1 className="text-5xl md:text-7xl font-bold italic text-ink tracking-tighter leading-none mb-6">
            {album?.title}
          </h1>
          <p className="text-xl md:text-2xl font-serif italic text-muted-gold leading-relaxed max-w-2xl">
            "{album?.description}"
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:w-1/3 flex flex-col items-end gap-6"
        >
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <div className="flex gap-4">
              {album?.ownerId === user?.uid && (
                <Link 
                  to={`/edit/${id}`}
                  className="p-4 border border-border-toned rounded-full hover:bg-white hover:shadow-xl transition-all text-muted-gold flex items-center gap-2"
                >
                    <Settings size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest hidden lg:inline">Settings</span>
                </Link>
              )}
              <button className="p-4 border border-border-toned rounded-full hover:bg-white hover:shadow-xl transition-all text-muted-gold">
                  <Share2 size={16} />
              </button>
            </div>
            <div className="flex border border-border-toned rounded-full overflow-hidden">
               <button 
                 onClick={() => setViewMode("masonry")}
                 className={cn(
                   "px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                   viewMode === "masonry" ? "bg-accent text-white" : "hover:bg-white text-muted-gold"
                 )}
               >
                 Masonry
               </button>
               <button 
                 onClick={() => setViewMode("grid")}
                 className={cn(
                   "px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                   viewMode === "grid" ? "bg-accent text-white" : "hover:bg-white text-muted-gold"
                 )}
               >
                 Grid
               </button>
            </div>
          </div>

          <div className="w-full max-w-sm p-8 bg-white border border-border-toned shadow-sm space-y-6 overflow-hidden relative">
            {/* Travel Stamp Decor */}
            <div className="absolute -top-4 -right-4 w-24 h-24 border border-accent/20 rounded-full flex items-center justify-center rotate-12 pointer-events-none">
              <span className="text-[8px] font-bold text-accent/20 uppercase tracking-widest text-center">
                VOYAGER<br/>CERTIFIED
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-border-toned/20 pb-4">
              <div className="flex items-center gap-3">
                {!!album?.ownerPhoto && (
                  <img src={album.ownerPhoto} className="w-8 h-8 rounded-full border border-border-toned" alt="Explorer" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-widest">{album?.ownerName || 'Sandy'}</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Active Log</span>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[11px] uppercase tracking-wider">
                <span className="text-muted-gold flex items-center gap-2"><Camera size={12} /> Elements</span>
                <span className="font-bold">{photos.length}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] uppercase tracking-wider">
                <span className="text-muted-gold flex items-center gap-2"><Lock size={12} /> Privacy</span>
                <span className="font-bold text-accent">{album?.isProtected ? 'ENCRYPTED' : 'OPEN'}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] uppercase tracking-wider">
                <span className="text-muted-gold flex items-center gap-2"><Calendar size={12} /> Revised</span>
                <span className="font-bold">{album?.updatedAt ? new Date(album.updatedAt).toLocaleDateString() : 'Original'}</span>
              </div>
            </div>
            <p className="text-[10px] italic font-serif text-muted-gold/60 leading-relaxed border-t border-border-toned/20 pt-4">
              This adventure has been digitally preserved for Sandy's private collection. Each pixel carries a story.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Photo Grid */}
      <div className={cn(
        "mb-20 gap-8",
        viewMode === "masonry" 
          ? "columns-1 sm:columns-2 md:columns-3 xl:columns-4 space-y-8" 
          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start"
      )}>
        {photos.map((photo, index) => (
          <motion.div 
            key={photo.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "group relative cursor-pointer",
              viewMode === "masonry" ? "break-inside-avoid" : ""
            )}
          >
            <div className="bg-white p-4 shadow-sm border border-border-toned group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-700 h-full flex flex-col">
              <div className="overflow-hidden bg-ink/5 flex-grow" onClick={() => setSelectedPhotoIndex(index)}>
                {!!(tokens?.access_token || photo.driveThumbnailUrl) && (
                  <img 
                    src={tokens?.access_token ? `/api/drive/photo/${photo.driveFileId}` : photo.driveThumbnailUrl} 
                    style={getFilterStyle(photo.filters as any)}
                    className={cn(
                       "w-full grayscale-[0.3] group-hover:grayscale-0 transition-all duration-1000 origin-center group-hover:scale-105",
                       viewMode === "grid" ? "aspect-square object-cover" : "aspect-auto"
                    )}
                    alt="Adventure Shot"
                    loading="lazy"
                  />
                )}
              </div>
              <div className="mt-4 flex justify-between items-center">
                <span className="label-micro opacity-30 mt-2 block tracking-[0.3em]">
                  OBSERVATION {index + 1}
                </span>
                {album?.ownerId === user?.uid && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPhoto(photo);
                    }}
                    className="p-2 text-muted-gold hover:text-accent transition-all"
                  >
                    <Settings size={14} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Guestbook Section */}
      <div className="grid lg:grid-cols-2 gap-20 border-t border-border-toned pt-20">
        <div>
           <CommentSection albumId={id!} albumOwnerId={album?.ownerId || ''} />
        </div>
        <div className="space-y-8 h-fit lg:sticky lg:top-32">
          <div className="bg-accent/5 border border-accent/10 p-12 rounded-sm relative overflow-hidden">
             <div className="absolute -bottom-10 -right-10 opacity-5">
               <Camera size={200} />
             </div>
             <h4 className="text-3xl font-bold italic text-ink mb-6">Voyage Ethics</h4>
             <ul className="space-y-6">
                {[
                  "Leave only footprints, take only photos.",
                  "Respect the local culture and the land.",
                  "Share your story to inspire the next wanderer.",
                  "Privacy is preserved through the secret key."
                ].map((item, i) => (
                  <li key={i} className="flex gap-4 text-sm font-serif italic text-muted-gold">
                    <span className="text-accent font-bold font-sans">0{i+1}</span>
                    {item}
                  </li>
                ))}
             </ul>
          </div>
        </div>
      </div>

      {/* Lightbox / Expanded View */}
      <AnimatePresence>
        {selectedPhotoIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-paper/95 backdrop-blur-xl p-6"
          >
            <div className="absolute top-12 left-12 flex items-center gap-4">
               <button onClick={() => setSelectedPhotoIndex(null)} className="label-micro flex items-center gap-2 hover:text-ink transition-colors">
                  <ChevronLeft size={16} /> Retreat
               </button>
            </div>

            <button 
              className="absolute left-6 top-1/2 -translate-y-1/2 p-4 text-muted-gold hover:text-ink transition-colors"
              onClick={() => setSelectedPhotoIndex(prev => prev! > 0 ? prev! - 1 : photos.length - 1)}
            >
              <ChevronLeft size={60} />
            </button>

            <button 
              className="absolute right-6 top-1/2 -translate-y-1/2 p-4 text-muted-gold hover:text-ink transition-colors"
              onClick={() => setSelectedPhotoIndex(prev => prev! < photos.length - 1 ? prev! + 1 : 0)}
            >
              <ChevronRight size={60} />
            </button>
            
            <div className="relative max-w-6xl w-full h-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
              {!!(tokens?.access_token || photos[selectedPhotoIndex].driveThumbnailUrl) && (
                <motion.img 
                  key={photos[selectedPhotoIndex].id}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  src={tokens?.access_token ? `/api/drive/photo/${photos[selectedPhotoIndex].driveFileId}` : photos[selectedPhotoIndex].driveThumbnailUrl}
                  style={getFilterStyle(photos[selectedPhotoIndex].filters as any)}
                  className="max-w-full max-h-[80vh] object-contain shadow-2xl grayscale-0"
                  alt="Enlarged Memory"
                />
              )}
              <div className="mt-8 text-center">
                 <p className="label-micro opacity-40 mb-2">ARCHIVE SPECIMEN {selectedPhotoIndex + 1}</p>
                 <h2 className="text-2xl font-bold italic text-ink">The Wandering Eye</h2>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!tokens && photos.length > 0 && (
         <div className="mt-12 p-8 bg-accent/5 rounded-3xl border border-accent/10 text-center">
            <p className="text-muted-gold font-serif italic mb-4">View photos in high resolution?</p>
            <button 
              onClick={() => navigate('/create')}
              className="text-xs font-bold uppercase tracking-widest text-accent border-b-2 border-accent pb-1"
            >
              Connect your Google Drive
            </button>
         </div>
      )}
    </div>
  );
}
