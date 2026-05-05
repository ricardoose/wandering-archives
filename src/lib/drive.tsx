import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

interface GoogleDriveContextType {
  tokens: GoogleTokens | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  fetchFiles: (folderId?: string) => Promise<any[]>;
}

const GoogleDriveContext = createContext<GoogleDriveContextType>({
  tokens: null,
  connect: async () => {},
  disconnect: () => {},
  fetchFiles: async () => [],
});

export function GoogleDriveProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokens] = useState<GoogleTokens | null>(() => {
    const saved = localStorage.getItem("google_drive_tokens");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        const newTokens = event.data.tokens;
        setTokens(newTokens);
        localStorage.setItem("google_drive_tokens", JSON.stringify(newTokens));
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const connect = async () => {
    const res = await axios.get("/api/auth/google/url");
    const { url } = res.data;
    window.open(url, "google_oauth", "width=600,height=700");
  };

  const disconnect = () => {
    setTokens(null);
    localStorage.removeItem("google_drive_tokens");
  };

  const fetchFiles = async (folderId?: string) => {
    if (!tokens?.access_token) return [];
    
    let query = "mimeType contains 'image/'";
    if (folderId) {
      query = `'${folderId}' in parents and ${query}`;
    }

    try {
      const res = await axios.get("https://www.googleapis.com/drive/v3/files", {
        params: {
          q: query,
          fields: "files(id, name, thumbnailLink, webViewLink, webContentLink)",
          pageSize: 100,
        },
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });
      return res.data.files || [];
    } catch (err) {
      console.error("Error fetching drive files:", err);
      return [];
    }
  };

  return (
    <GoogleDriveContext.Provider value={{ tokens, connect, disconnect, fetchFiles }}>
      {children}
    </GoogleDriveContext.Provider>
  );
}

export const useGoogleDrive = () => useContext(GoogleDriveContext);
