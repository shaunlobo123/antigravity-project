import { supabase } from '../utils/supabase';

/**
 * Sends a friend request to a user by their username.
 * Looks up the receiver's user ID, validates the request, and inserts a 'pending' friendship record.
 * 
 * @param {string} receiverUsername - The username of the user to send a request to
 * @returns {Promise<object>} The created friendship record
 */
export async function sendFriendRequest(receiverUsername) {
  // 1. Get the current logged-in user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('You must be logged in to send a friend request.');
  }

  const senderId = user.id;

  // 2. Look up the receiver's profile ID by their username
  const { data: receiverProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', receiverUsername.trim())
    .maybeSingle(); // Use maybeSingle to handle 'not found' gracefully

  if (profileError) {
    throw new Error(`Error searching for username: ${profileError.message}`);
  }

  if (!receiverProfile) {
    throw new Error(`User with username "${receiverUsername}" does not exist.`);
  }

  const receiverId = receiverProfile.id;

  // 3. Validation: Prevent sending a request to oneself
  if (senderId === receiverId) {
    throw new Error('You cannot send a friend request to yourself.');
  }

  // 4. Validation: Check if a friendship record already exists
  const { data: existingFriendship, error: existingError } = await supabase
    .from('friendships')
    .select('status')
    .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingFriendship) {
    if (existingFriendship.status === 'accepted') {
      throw new Error(`You are already friends with ${receiverUsername}.`);
    } else {
      throw new Error(`A friend request is already pending or requested with ${receiverUsername}.`);
    }
  }

  // 5. Insert the pending friendship row
  const { data: friendship, error: friendshipError } = await supabase
    .from('friendships')
    .insert([
      {
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (friendshipError) {
    throw new Error(`Failed to send friend request: ${friendshipError.message}`);
  }

  return friendship;
}

/**
 * Accepts a pending friend request by updating its status to 'accepted'.
 * 
 * @param {string|number} friendshipId - The ID of the friendship record to update
 * @returns {Promise<object>} The updated friendship record
 */
export async function acceptFriendRequest(friendshipId) {
  const { data: friendship, error: friendshipError } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .select()
    .single();

  if (friendshipError) {
    throw new Error(`Failed to accept friend request: ${friendshipError.message}`);
  }

  return friendship;
}
