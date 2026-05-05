import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FolderOpen, 
  Lock, 
  Image as ImageIcon, 
  Save, 
  ArrowLeft,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/App"; // Need to export useAuth from App or move to separate file
import { useGoogleDrive } from "@/lib/drive";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, setDoc, doc } from "firebase/firestore";
import axios from "axios";
import { cn } from "@/lib/utils";

export default function CreateAlbum() {
  const { user } = useAuth();
  const { tokens, connect, fetchFiles } = useGoogleDrive();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isProtected, setIsProtected] = useState(false);
  
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tokens) {
      loadFiles();
    }
  }, [tokens]);

  const loadFiles = async () => {
    setLoading(true);
    const files = await fetchFiles();
    setDriveFiles(files);
    setLoading(false);
  };

  const toggleFile = (id: string) => {
    setSelectedFiles(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!user || !title || selectedFiles.length === 0) return;
    
    if (isProtected) {
      if (!password) {
        setError("Secret key is required for protection");
        return;
      }
      if (password !== confirmPassword) {
        setError("Secret keys do not match");
        return;
      }
    }

    setSaving(true);
    setError("");
    
    try {
      let passwordHash = "";
      if (isProtected && password) {
        const hashRes = await axios.post("/api/hash-password", { password });
        passwordHash = hashRes.data.hash;
      }

      const albumData = {
        title,
        location,
        description,
        ownerId: user.uid,
        ownerName: user.displayName,
        isProtected,
        passwordHash,
        coverImageUrl: driveFiles.find(f => f.id === selectedFiles[0])?.thumbnailLink || "",
        createdAt: new Date().toISOString(),
        serverCreatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "albums"), albumData);

      // Save password hash to private subcollection
      if (isProtected && passwordHash) {
        await setDoc(doc(db, `albums/${docRef.id}/private`, "security"), {
          passwordHash
        });
      }

      // Add photos
      const photoPromises = selectedFiles.map(fileId => {
        const file = driveFiles.find(f => f.id === fileId);
        return addDoc(collection(db, `albums/${docRef.id}/photos`), {
          albumId: docRef.id,
          driveFileId: fileId,
          driveThumbnailUrl: file?.thumbnailLink || "",
          uploadedById: user.uid,
          createdAt: new Date().toISOString(),
        });
      });

      await Promise.all(photoPromises);
      navigate(`/album/${docRef.id}`);
    } catch (err) {
      console.error("Error saving album:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="pt-32 text-center">
        <h2 className="text-2xl font-serif italic text-[#5A5A40]">Please sign in to create an archive.</h2>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 px-12 max-w-7xl mx-auto">
      <button 
        onClick={() => navigate(-1)}
        className="label-micro flex items-center gap-2 mb-12 hover:text-ink transition-colors"
      >
        <ArrowLeft size={14} /> Back to Archives
      </button>

      <div className="grid lg:grid-cols-[1fr_400px] gap-20">
        {/* Left Side: Photo Picker */}
        <section>
          <div className="flex items-center justify-between mb-8 border-b border-border-toned pb-6">
            <div>
              <span className="label-micro block mb-1">Step One</span>
              <h2 className="text-3xl font-bold italic text-ink tracking-tight">Visual Selection</h2>
            </div>
            {!tokens ? (
              <button 
                onClick={connect}
                className="bg-accent text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-accent/20 hover:scale-105 transition-transform"
              >
                Connect Drive
              </button>
            ) : (
              <button onClick={loadFiles} className="text-muted-gold hover:text-accent transition-colors">
                {loading ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
              </button>
            )}
          </div>

          {!tokens ? (
            <div className="aspect-video bg-border-toned/5 rounded-sm border border-dashed border-border-toned flex flex-col items-center justify-center text-muted-gold">
              <FolderOpen size={40} className="mb-4 opacity-40" />
              <p className="font-serif italic text-lg opacity-60">Authentication required to browse media</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 max-h-[700px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-border-toned">
              {driveFiles.map(file => (
                <div 
                  key={file.id} 
                  onClick={() => toggleFile(file.id)}
                  className={cn(
                    "card-rustic relative aspect-square overflow-hidden cursor-pointer group",
                    selectedFiles.includes(file.id) ? "scale-95 shadow-inner" : "hover:scale-[1.02]"
                  )}
                >
                  {!!file.thumbnailLink && (
                    <img src={file.thumbnailLink} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700" alt={file.name} />
                  )}
                  {selectedFiles.includes(file.id) && (
                    <div className="absolute inset-x-0 bottom-0 py-2 bg-accent/80 backdrop-blur-md flex items-center justify-center text-white text-[10px] font-bold tracking-widest">
                      SELECTED
                    </div>
                  )}
                </div>
              ))}
              {driveFiles.length === 0 && !loading && (
                <p className="col-span-full text-center py-20 text-muted-gold font-serif italic">
                  No images found in your Google Drive.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Right Side: Form */}
        <aside className="relative">
          <div className="sticky top-32 space-y-10">
            <div>
              <span className="label-micro block mb-1">Step Two</span>
              <h3 className="text-3xl font-bold italic text-ink tracking-tight">Archive Details</h3>
            </div>

            <div className="space-y-8">
              <div className="space-y-2">
                <label className="label-micro opacity-60">Journey Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.G. AUTUMN IN TUSCANY"
                  className="w-full bg-transparent border-b border-border-toned py-4 text-2xl font-serif italic focus:outline-none focus:border-accent transition-colors placeholder:text-border-toned/30 uppercase tracking-tight"
                />
              </div>
              <div className="space-y-2">
                <label className="label-micro opacity-60">Destination (e.g. Kyoto, Japan)</label>
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="LOCATION"
                  className="w-full bg-transparent border-b border-border-toned py-4 text-xl font-serif italic focus:outline-none focus:border-accent transition-colors placeholder:text-border-toned/30 uppercase tracking-widest"
                />
              </div>
              <div className="space-y-2">
                <label className="label-micro opacity-60">Story</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell the tale of this adventure..."
                  className="w-full bg-transparent border-b border-border-toned py-4 text-lg font-serif italic focus:outline-none focus:border-accent transition-colors placeholder:text-border-toned/30 h-32 resize-none"
                />
              </div>

              <div className="pt-6 border-t border-border-toned/40">
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-full transition-colors", isProtected ? "bg-accent/10 text-accent" : "bg-border-toned/10 text-muted-gold")}>
                        <Lock size={16} />
                      </div>
                      <span className="label-micro">Secure Archive</span>
                   </div>
                   <button
                    type="button"
                    onClick={() => setIsProtected(!isProtected)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      isProtected ? "bg-accent" : "bg-border-toned"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                      isProtected ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
                
                <AnimatePresence>
                  {isProtected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-4"
                    >
                      <div className="space-y-1">
                        <label className="label-micro opacity-40">Choose Secret Key</label>
                        <input 
                          type="password" 
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setError("");
                          }}
                          placeholder="ENTER SECRET KEY"
                          className="w-full bg-transparent border-b border-border-toned py-3 text-lg font-serif italic focus:outline-none focus:border-accent transition-colors placeholder:text-border-toned/30 tracking-widest"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="label-micro opacity-40">Confirm Secret Key</label>
                        <input 
                          type="password" 
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setError("");
                          }}
                          placeholder="RE-ENTER SECRET KEY"
                          className="w-full bg-transparent border-b border-border-toned py-3 text-lg font-serif italic focus:outline-none focus:border-accent transition-colors placeholder:text-border-toned/30 tracking-widest"
                        />
                      </div>
                      {error && (
                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">
                          {error}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={handleSave}
                  disabled={saving || !title || selectedFiles.length === 0}
                  className="w-full bg-accent text-white py-6 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] shadow-2xl shadow-accent/20 disabled:opacity-50 disabled:shadow-none hover:bg-[#4A4A35] transition-all flex items-center justify-center gap-3 hover:scale-[1.02]"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Preserve Archive</>}
                </button>
                
                <p className="label-micro text-center opacity-40">
                  {selectedFiles.length} MEDIA ELEMENTS SELECTED
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
