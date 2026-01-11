import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { SUPABASE_STORAGE_CONFIG } from '@/lib/config';
import { generateImageHash } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Upload image to storage
    const hash = await generateImageHash(file);
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${userId}/${hash}.${fileExt}`;

    const supabase = getSupabaseClient();

    // Check if file already exists
    const { data: existingSignedUrlData, error: existingSignedUrlError } = await supabase.storage
      .from(SUPABASE_STORAGE_CONFIG.BUCKET_NAME)
      .createSignedUrl(fileName, SUPABASE_STORAGE_CONFIG.SIGNED_URL_EXPIRY_SECONDS);

    if (!existingSignedUrlError && existingSignedUrlData?.signedUrl) {
      return NextResponse.json({
        success: true,
        imageUrl: existingSignedUrlData.signedUrl,
        imageHash: hash
      });
    }

    // Upload new file
    const { data, error } = await supabase.storage
      .from(SUPABASE_STORAGE_CONFIG.BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      // If it's a duplicate error, generate a signed URL
      if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from(SUPABASE_STORAGE_CONFIG.BUCKET_NAME)
          .createSignedUrl(fileName, SUPABASE_STORAGE_CONFIG.SIGNED_URL_EXPIRY_SECONDS);

        if (signedUrlError || !signedUrlData?.signedUrl) {
          return NextResponse.json(
            { error: 'Failed to generate signed URL for duplicate file' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          imageUrl: signedUrlData.signedUrl,
          imageHash: hash
        });
      }

      return NextResponse.json(
        { error: `Failed to upload image: ${error.message}` },
        { status: 500 }
      );
    }

    // Generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(SUPABASE_STORAGE_CONFIG.BUCKET_NAME)
      .createSignedUrl(fileName, SUPABASE_STORAGE_CONFIG.SIGNED_URL_EXPIRY_SECONDS);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: signedUrlData.signedUrl,
      imageHash: hash
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

