import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { SUPABASE_STORAGE_CONFIG } from '@/lib/config';

/**
 * Request body must be JSON only (userId, hash, fileExt) — no file. Avoids 413 / FUNCTION_PAYLOAD_TOO_LARGE.
 * - If file already exists: returns imageUrl (read URL) only.
 * - If new file: returns upload token/path/bucket; client uploads to Supabase, then calls this again to get imageUrl.
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json. Send userId, hash, fileExt. Client uploads the file directly to Supabase.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { userId, hash, fileExt } = body as { userId?: string; hash?: string; fileExt?: string };

    if (!userId || !hash) {
      return NextResponse.json(
        { error: 'userId and hash are required' },
        { status: 400 }
      );
    }

    const ext = (fileExt || 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `${userId}/${hash}.${ext}`;
    const supabase = getSupabaseClient();
    const bucket = SUPABASE_STORAGE_CONFIG.BUCKET_NAME;

    // Check if file already exists — createSignedUrl only works for existing objects
    const { data: existingRead, error: existingError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, SUPABASE_STORAGE_CONFIG.SIGNED_URL_EXPIRY_SECONDS);

    if (!existingError && existingRead?.signedUrl) {
      return NextResponse.json({
        success: true,
        imageUrl: existingRead.signedUrl,
        imageHash: hash,
      });
    }

    // New file: return only upload URL/token. Do NOT create read URL here (file doesn't exist yet → 500).
    const { data: uploadData, error: uploadUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert: false });

    if (uploadUrlError || !uploadData) {
      console.error('createSignedUploadUrl failed:', uploadUrlError);
      return NextResponse.json(
        { error: uploadUrlError?.message || 'Failed to create signed upload URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageHash: hash,
      bucket,
      uploadPath: uploadData.path,
      token: uploadData.token,
      needsUploadThenGetUrl: true,
    });
  } catch (error) {
    console.error('Error in upload-image (get URLs):', error);
    return NextResponse.json(
      { error: 'Failed to get upload URLs', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
