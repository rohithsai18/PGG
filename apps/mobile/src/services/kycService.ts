import * as DocumentPicker from 'expo-document-picker';
import { apiFetch } from '../lib/api';
import { KycPayload } from '../types';

type UploadUrlResponse = {
  uploadUrl: string;
  publicUrl: string;
  assetId: string;
  signature: string;
  apiKey: string;
  timestamp: number;
};

export async function upsertKyc(token: string, payload: KycPayload) {
  return apiFetch('/kyc', {
    method: 'PUT',
    body: JSON.stringify(payload)
  }, token);
}

export async function getKyc(token: string) {
  return apiFetch('/kyc', {}, token);
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
  const uploadData = await apiFetch<UploadUrlResponse>('/documents/upload-url', {
    method: 'POST',
    body: JSON.stringify({
      type,
      mimeType: doc.mimeType ?? 'application/octet-stream',
      fileName: doc.name
    })
  }, token);

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

  const uploadResult = await fetch(uploadData.uploadUrl, {
    method: 'POST',
    body: form
  });

  if (!uploadResult.ok) {
    throw new Error('Document upload failed');
  }

  const uploaded = await uploadResult.json();
  const finalUrl = uploaded.secure_url ?? uploadData.publicUrl;

  return apiFetch('/documents/confirm', {
    method: 'POST',
    body: JSON.stringify({
      type,
      publicUrl: finalUrl,
      assetId: uploadData.assetId
    })
  }, token);
}
