import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/src/lib/firebase";
import { Album } from "@/src/types";
import { motion } from "framer-motion";
import { 
  Lock, 
  MapPin, 
  Calendar,
  ChevronRight,
  Search
} from "lucide-react";
import { cn } from "@/src/lib/utils";

export default function Archive() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const albumsPath = "albums";
    const q = query(collection(db, albumsPath), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Album));
      setAlbums(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, albumsPath);
    });
  }, []);

  const filteredAlbums = albums.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pt-32 pb-20 px-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12 mb-20">
        <div className="space-y-4">
          <span className="label-micro block">Adventure Ledger</span>
          <h1 className="text-5xl md:text-7xl font-bold italic text-ink tracking-tight leading-none">
            Sandy's <br /> <span className="text-accent underline decoration-border-toned underline-offset-8">Wanderlust</span>
          </h1>
          <div className="flex gap-10 pt-4">
            <div className="flex flex-col">
              <span className="text-3xl font-bold italic border-b border-border-toned/40">{albums.length}</span>
              <span className="label-micro opacity-40 mt-1">Expeditions</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold italic border-b border-border-toned/40">
                {albums.reduce((acc, a) => acc + (a.isProtected ? 1 : 0), 0)}
              </span>
              <span className="label-micro opacity-40 mt-1">Secured Logs</span>
            </div>
          </div>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-border-toned" size={16} />
          <input 
            type="text" 
            placeholder="FILTER BY STORY..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-border-toned rounded-full py-5 pl-14 pr-8 focus:outline-none focus:ring-1 ring-accent text-[10px] font-bold uppercase tracking-[0.2em] shadow-sm placeholder:text-border-toned/60"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="aspect-square bg-border-toned/20 rounded-sm animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-20">
          {filteredAlbums.map((album, i) => (
            <motion.div
              key={album.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to={`/album/${album.id}`} className="group block">
                <div className="card-rustic aspect-square mb-8 overflow-hidden relative group-hover:rotate-1 transition-transform duration-700">
                  <div className="w-full h-full bg-gray-100 overflow-hidden">
                    <img 
                      src={album.coverImageUrl || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=800"} 
                      className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" 
                      alt={album.title} 
                    />
                  </div>
                  
                  {album.isProtected && (
                    <div className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-sm text-muted-gold">
                      <Lock size={12} />
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                    <p className="text-white text-[10px] font-bold uppercase tracking-[0.3em]">
                      Explore Collection
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 px-1">
                  <p className="label-micro opacity-60">By {album.ownerName || 'Explorer'}</p>
                  <h3 className="text-3xl font-bold italic tracking-tight group-hover:text-accent transition-colors">{album.title}</h3>
                  <div className="flex items-center justify-between pt-2 border-t border-border-toned/40">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-gold">
                      {new Date(album.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                    </span>
                    <div className="text-border-toned group-hover:text-accent group-hover:translate-x-1 transition-all">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {filteredAlbums.length === 0 && !loading && (
        <div className="py-40 text-center">
          <p className="text-2xl font-serif italic text-[#5A5A40]/40">No journeys match your search.</p>
        </div>
      )}
    </div>
  );
}
