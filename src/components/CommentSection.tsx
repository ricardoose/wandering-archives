import React, { useState, useEffect } from "react";
import { MessageSquare, Send, Trash2, Loader2, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, handleFirestoreError, OperationType } from "@/src/lib/firebase";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";
import { useAuth } from "@/src/App";
import { cn } from "@/src/lib/utils";

interface Comment {
  id: string;
  authorName: string;
  authorId: string;
  content: string;
  createdAt: any;
}

interface CommentSectionProps {
  albumId: string;
  albumOwnerId: string;
}

export default function CommentSection({ albumId, albumOwnerId }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const commentsPath = `albums/${albumId}/comments`;
    const q = query(
      collection(db, commentsPath),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(docs);
      setLoading(false);
    }, (error) => {
      console.warn("Comments listener error (likely restricted album):", error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [albumId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSending(true);
    try {
      await addDoc(collection(db, `albums/${albumId}/comments`), {
        albumId,
        authorName: user.displayName || "Unknown Wanderer",
        authorId: user.uid,
        content: newComment.trim(),
        createdAt: new Date().toISOString()
      });
      setNewComment("");
    } catch (err) {
      console.error("Error posting comment:", err);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, `albums/${albumId}/comments`, commentId));
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-accent/10 text-accent rounded-full">
          <MessageSquare size={18} />
        </div>
        <div>
          <span className="label-micro block opacity-40">Adventure Dialogue</span>
          <h3 className="text-2xl font-bold italic text-ink">The Guestbook</h3>
        </div>
      </div>

      <div className="bg-white border border-border-toned p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="mb-12">
          <div className="space-y-4">
            <span className="label-micro opacity-40">Leave a postcard</span>
            <div className="relative">
              <textarea 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts on this journey..."
                className="w-full bg-paper border border-border-toned/30 p-6 text-sm font-serif italic focus:outline-none focus:border-accent transition-colors min-h-[120px] resize-none"
              />
              <button 
                type="submit"
                disabled={sending || !newComment.trim() || !user}
                className="absolute bottom-4 right-4 bg-accent text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-0"
              >
                {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              </button>
            </div>
            {!user && (
              <p className="text-[10px] uppercase tracking-widest text-muted-gold text-center pt-2">
                Sign in to leave a message
              </p>
            )}
          </div>
        </form>

        <div className="space-y-8 max-h-[500px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-border-toned">
          <AnimatePresence initial={false}>
            {comments.map((comment) => (
              <motion.div 
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group border-b border-border-toned/10 pb-8 last:border-0"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-border-toned/10 flex items-center justify-center text-muted-gold">
                      <User size={14} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest block">{comment.authorName}</span>
                      <span className="text-[9px] opacity-40 uppercase tracking-tighter">
                        {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'Just now'}
                      </span>
                    </div>
                  </div>
                  
                  {(user?.uid === comment.authorId || user?.uid === albumOwnerId) && (
                    <button 
                      onClick={() => handleDelete(comment.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-full transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <p className="text-sm font-serif italic text-ink leading-relaxed pl-11">
                  "{comment.content}"
                </p>
              </motion.div>
            ))}
          </AnimatePresence>

          {comments.length === 0 && !loading && (
            <div className="text-center py-10">
              <span className="label-micro opacity-30 italic">Silence on the road. Be the first to speak.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
