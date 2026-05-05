export interface Album {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  ownerId: string;
  ownerName?: string;
  isProtected: boolean;
  passwordHash?: string;
  createdAt: string;
}

export interface Photo {
  id: string;
  albumId: string;
  driveFileId: string;
  driveThumbnailUrl?: string;
  caption?: string;
  uploadedById: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  driveFolderId?: string;
  hasDriveAccess?: boolean;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}
