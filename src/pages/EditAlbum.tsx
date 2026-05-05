import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  FolderOpen, 
  Lock, 
  Image as ImageIcon, 
  Save, 
  ArrowLeft,
  Loader2,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/src/App";
import { useGoogleDrive } from "@/src/lib/drive";
import { db } from "@/src/lib/firebase";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  serverTimestamp,
  setDoc,
  addDoc
} from "firebase/firestore";
import axios from "axios";
import { cn } from "@/src/lib/utils";

export default function EditAlbum() {
  const { id } = useParams();
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
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fetchingAlbum, setFetchingAlbum] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchAlbum = async () => {
      if (!id) return;
      try {
        const albumDoc = await getDoc(doc(db, "albums", id));
        if (albumDoc.exists()) {
          const data = albumDoc.data();
          if (data.ownerId !== user?.uid) {
            navigate("/");
            return;
          }
          setTitle(data.title);
          setLocation(data.location || "");
          setDescription(data.description);
          setIsProtected(data.isProtected || false);
          
          // Fetch current photos to pre-select them
          const photosSnap = await getDocs(collection(db, `albums/${id}/photos`));
          const currentPhotoIds = photosSnap.docs.map(d => d.data().driveFileId);
          setSelectedFiles(currentPhotoIds);
        }
      } catch (err) {
        console.error("Error fetching album:", err);
      } finally {
        setFetchingAlbum(false);
      }
    };

    if (user) {
      fetchAlbum();
    }
  }, [id, user, navigate]);

  useEffect(() => {
    if (tokens) {
      loadFiles();
    }
  }, [tokens]);

  const loadFiles = async () => {
    setLoadingFiles(true);
    const files = await fetchFiles();
    setDriveFiles(files);
    setLoadingFiles(false);
  };

  const toggleFile = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) ? prev.filter(f => f !== fileId) : [...prev, fileId]
    );
  };

  const handleUpdate = async () => {
    if (!user || !title || selectedFiles.length === 0 || !id) return;
    
    if (isProtected && password) {
      if (password !== confirmPassword) {
        setError("Secret keys do not match");
        return;
      }
    }

    setSaving(true);
    setError("");
    
    try {
      let passwordHash = "";
      const albumUpdate: any = {
        title,
        location,
        description,
        isProtected,
        coverImageUrl: driveFiles.find(f => f.id === selectedFiles[0])?.thumbnailLink || "",
        updatedAt: new Date().toISOString(),
      };

      if (isProtected && password) {
        const hashRes = await axios.post("/api/hash-password", { password });
        passwordHash = hashRes.data.hash;
        albumUpdate.passwordHash = passwordHash;
        
        // Update hash in private subcollection
        await setDoc(doc(db, `albums/${id}/private`, "security"), {
          passwordHash
        });
      }

      await updateDoc(doc(db, "albums", id), albumUpdate);

      // Sync photos (simple version: delete all and re-add)
      const photosSnap = await getDocs(collection(db, `albums/${id}/photos`));
      const deletePromises = photosSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      const photoPromises = selectedFiles.map(fileId => {
        const file = driveFiles.find(f => f.id === fileId);
        return addDoc(collection(db, `albums/${id}/photos`), {
          albumId: id,
          driveFileId: fileId,
          driveThumbnailUrl: file?.thumbnailLink || "",
          uploadedById: user.uid,
          createdAt: new Date().toISOString(),
        });
      });

      await Promise.all(photoPromises);
      navigate(`/album/${id}`);
    } catch (err) {
      console.error("Error updating album:", err);
      setError("Failed to update archive. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm("Are you sure you want to permanently delete this archive?")) return;
    setDeleting(true);
    try {
      // In a real app, you'd want to delete subcollections too
      // For now, let's just delete the main doc
      await deleteDoc(doc(db, "albums", id));
      navigate("/archive");
    } catch (err) {
      console.error("Error deleting album:", err);
    } finally {
      setDeleting(false);
    }
  };

  if (fetchingAlbum) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <Loader2 className="animate-spin text-accent" size={40} />
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 px-12 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-12">
        <button 
          onClick={() => navigate(-1)}
          className="label-micro flex items-center gap-2 hover:text-ink transition-colors"
        >
          <ArrowLeft size={14} /> Abandon Edits
        </button>
        
        <button 
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 hover:text-red-700 transition-colors"
        >
          {deleting ? <Loader2 className="animate-spin" size={14} /> : <><Trash2 size={14} /> Destroy Archive</>}
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-20">
        {/* Left Side: Photo Picker */}
        <section>
          <div className="flex items-center justify-between mb-8 border-b border-border-toned pb-6">
            <div>
              <span className="label-micro block mb-1">Visual Curation</span>
              <h2 className="text-3xl font-bold italic text-ink tracking-tight">Modify Selection</h2>
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
                {loadingFiles ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
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
              {driveFiles.length === 0 && !loadingFiles && (
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
              <span className="label-micro block mb-1">Archive Integrity</span>
              <h3 className="text-3xl font-bold italic text-ink tracking-tight">Update Details</h3>
            </div>

            <div className="space-y-8">
              <div className="space-y-2">
                <label className="label-micro opacity-60">Journey Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="JOURNEY TITLE"
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
                  placeholder="Update the tale..."
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
                      <p className="text-[9px] uppercase tracking-widest text-muted-gold mb-2">Leave blank to keep existing passcode</p>
                      <div className="space-y-1">
                        <label className="label-micro opacity-40">New Secret Key</label>
                        <input 
                          type="password" 
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setError("");
                          }}
                          placeholder="ENTER NEW KEY"
                          className="w-full bg-transparent border-b border-border-toned py-3 text-lg font-serif italic focus:outline-none focus:border-accent transition-colors placeholder:text-border-toned/30 tracking-widest"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="label-micro opacity-40">Confirm New Key</label>
                        <input 
                          type="password" 
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setError("");
                          }}
                          placeholder="RE-ENTER NEW KEY"
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
                  onClick={handleUpdate}
                  disabled={saving || !title || selectedFiles.length === 0}
                  className="w-full bg-accent text-white py-6 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] shadow-2xl shadow-accent/20 disabled:opacity-50 disabled:shadow-none hover:bg-[#4A4A35] transition-all flex items-center justify-center gap-3 hover:scale-[1.02]"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Commit Changes</>}
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
