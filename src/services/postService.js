import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../utils/supabase';

/**
 * Uploads a local image file to Supabase Storage and inserts a new post record.
 * 
 * @param {string} localUri - The local URI of the image (e.g. from ImagePicker or Camera)
 * @param {string} userId - The authenticated user's ID
 * @param {string} taskTitle - The title/description of the daily task
 * @param {string} journalEntry - The journal entry or description for the post
 * @returns {Promise<object>} The created post data
 */
export async function createPostWithMedia(localUri, userId, taskTitle, journalEntry) {
  let mediaUrl = null;

  if (localUri) {
    try {
      // 1. Determine file extension and dynamic MIME type
      const fileExt = localUri.split('.').pop().toLowerCase() || 'jpg';
      const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
      
      // Store in user-specific folder in bucket with timestamp filename
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // 2. Read the local file as base64 using expo-file-system
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: 'base64',
      });

      // 3. Decode base64 to ArrayBuffer for Supabase Storage compatibility in React Native
      const arrayBuffer = decode(base64);

      // 4. Upload to Supabase Storage bucket 'post-media'
      const { error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(fileName, arrayBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Media upload failed: ${uploadError.message}`);
      }

      // 5. Get the permanent public URL of the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('post-media')
        .getPublicUrl(fileName);

      mediaUrl = publicUrl;
    } catch (uploadErr) {
      console.error('Error during media upload:', uploadErr);
      throw uploadErr;
    }
  }

  // 6. Insert new post row into the 'posts' table
  const { data: postData, error: postError } = await supabase
    .from('posts')
    .insert([
      {
        user_id: userId,
        task_title: taskTitle,
        journal_entry: journalEntry,
        media_url: mediaUrl,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (postError) {
    throw new Error(`Failed to create post record: ${postError.message}`);
  }

  return postData;
}

/**
 * Fetches feed posts created by the logged-in user or their accepted friends.
 * 
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<Array>} List of posts with profile information, ordered newest first
 */
export async function fetchFeedPosts(userId) {
  // 1. Fetch accepted friendships where the logged-in user is either user_id or friend_id
  const { data: friendships, error: friendError } = await supabase
    .from('friendships')
    .select('user_id, friend_id')
    .eq('status', 'accepted')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  if (friendError) {
    throw new Error(`Failed to fetch friendships: ${friendError.message}`);
  }

  // 2. Extract friend user IDs
  const friendIds = friendships.map(f => 
    f.user_id === userId ? f.friend_id : f.user_id
  );

  // 3. Combine logged-in user ID and friend IDs to query posts
  const targetUserIds = [userId, ...friendIds];

  // 4. Fetch posts created by anyone in the targetUserIds list, sorted by created_at descending
  // We also join the profiles table to pull details (e.g. username, avatar_url) for each post author
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select(`
      *,
      profiles:user_id (
        username,
        avatar_url
      )
    `)
    .in('user_id', targetUserIds)
    .order('created_at', { ascending: false });

  if (postsError) {
    throw new Error(`Failed to fetch feed posts: ${postsError.message}`);
  }

  return posts;
}

