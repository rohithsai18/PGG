import * as DocumentPicker from 'expo-document-picker';
import { apiFetch } from '../lib/api';
import { KycDTO, KycPayload } from '../types';

type UploadUrlResponse = {
  uploadUrl: string;
  publicUrl: string;
  assetId: string;
  signature: string;
  apiKey: string;
  timestamp: number;
  folder: string;
};

export type UploadKycDocumentResult = {
  id: string;
  panFileUrl: string | null;
  aadhaarFileUrl: string | null;
};

export async function upsertKyc(token: string, payload: KycPayload) {
  return apiFetch('/kyc', {
    method: 'PUT',
    body: JSON.stringify(payload)
  }, token);
}

export async function getKyc(token: string) {
  return apiFetch<KycDTO | null>('/kyc', {}, token);
}

export async function pickDocument() {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: ['image/*', 'application/pdf']
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0];
}

export async function uploadKycDocument(token: string, type: 'PAN' | 'AADHAAR', doc: DocumentPicker.DocumentPickerAsset) {
  let uploadData: UploadUrlResponse;

  try {
    uploadData = await apiFetch<UploadUrlResponse>('/documents/upload-url', {
      method: 'POST',
      body: JSON.stringify({
        type,
        mimeType: doc.mimeType ?? 'application/octet-stream',
        fileName: doc.name
      })
    }, token);
  } catch (error) {
    throw new Error(`Failed to prepare ${type} upload. ${(error as Error).message}`);
  }

  const form = new FormData();
  form.append('file', {
    uri: doc.uri,
    name: doc.name,
    type: doc.mimeType ?? 'application/octet-stream'
  } as never);
  form.append('api_key', uploadData.apiKey);
  form.append('timestamp', String(uploadData.timestamp));
  form.append('signature', uploadData.signature);
  form.append('public_id', uploadData.assetId);
  form.append('folder', uploadData.folder);

  let uploadResult: Response;

  try {
    uploadResult = await fetch(uploadData.uploadUrl, {
      method: 'POST',
      body: form
    });
  } catch (error) {
    throw new Error(`Failed to upload ${type} document to storage. ${(error as Error).message}`);
  }

  if (!uploadResult.ok) {
    const errorBody = await uploadResult.json().catch(() => null);
    const uploadMessage =
      errorBody?.error?.message ??
      errorBody?.message ??
      (uploadResult.status === 401 ? 'Document upload was rejected. Please sign in again and retry.' : null);
    throw new Error(uploadMessage ?? 'Document upload failed');
  }

  const uploaded = await uploadResult.json();
  const finalUrl = uploaded.secure_url ?? uploadData.publicUrl;

  try {
    return await apiFetch<UploadKycDocumentResult>('/documents/confirm', {
      method: 'POST',
      body: JSON.stringify({
        type,
        publicUrl: finalUrl,
        assetId: uploadData.assetId
      })
    }, token);
  } catch (error) {
    throw new Error(`Failed to save uploaded ${type} document. ${(error as Error).message}`);
  }
}
