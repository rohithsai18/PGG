import { randomUUID } from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
});

export const documentsCloudinary = cloudinary;

export const shortId = (length: number) => randomUUID().replace(/-/g, '').slice(0, length);
