import { supabase } from './supabase';

// ============ AUTH FUNCTIONS ============

export const registerUser = async (email, password, username) => {
  try {
    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    // Create user profile in users table
    const { error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          username,
          email,
        }
      ]);

    if (profileError) throw profileError;

    return { success: true, user: authData.user };
  } catch (error) {
    console.error('Register error:', error);
    return { success: false, error: error.message };
  }
};

export const loginUser = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Get user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) throw profileError;

    return { success: true, user: data.user, profile };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
};

export const logoutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) throw error;

    return { ...session.user, username: profile.username };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

export const updateUserProfile = async (userId, username) => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ username })
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Update profile error:', error);
    return { success: false, error: error.message };
  }
};

export const updateUserPassword = async (currentPassword, newPassword) => {
  try {
    // Verify current password by attempting to sign in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: currentPassword,
    });

    if (signInError) throw new Error('Password saat ini salah');

    // Update to new password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Update password error:', error);
    return { success: false, error: error.message };
  }
};

export const getUserById = async (userId) => {
  try {
    // Try to get username from users table
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Get user by ID error:', error);
      return null;
    }
    
    return data ? data.username : null;
  } catch (error) {
    console.error('Get user by ID error:', error);
    return null;
  }
};

// ============ ITEMS FUNCTIONS ============

export const fetchItems = async (limit = null) => {
  try {
    let query = supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Add limit if specified for faster initial load
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Convert snake_case to camelCase for frontend
    return data.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      priceUnit: item.price_unit,
      location: item.location,
      image: item.image,
      ownerId: item.owner_id,
      ownerName: item.owner_name,
      status: item.status,
      createdAt: item.created_at
    }));
  } catch (error) {
    console.error('Fetch items error:', error);
    return [];
  }
};

export const addItem = async (itemData, userId, username) => {
  try {
    const { data, error } = await supabase
      .from('items')
      .insert([
        {
          title: itemData.title,
          description: itemData.description,
          price: parseFloat(itemData.price),
          price_unit: itemData.priceUnit,
          location: itemData.location,
          image: itemData.image,
          owner_id: userId,
          owner_name: username,
          status: 'tersedia'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Convert to camelCase
    return {
      success: true,
      item: {
        id: data.id,
        title: data.title,
        description: data.description,
        price: data.price,
        priceUnit: data.price_unit,
        location: data.location,
        image: data.image,
        ownerId: data.owner_id,
        ownerName: data.owner_name,
        status: data.status,
        createdAt: data.created_at
      }
    };
  } catch (error) {
    console.error('Add item error:', error);
    return { success: false, error: error.message };
  }
};

export const updateItem = async (itemId, itemData) => {
  try {
    const { data, error } = await supabase
      .from('items')
      .update({
        title: itemData.title,
        description: itemData.description,
        price: parseFloat(itemData.price),
        price_unit: itemData.priceUnit,
        location: itemData.location,
        image: itemData.image
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      item: {
        id: data.id,
        title: data.title,
        description: data.description,
        price: data.price,
        priceUnit: data.price_unit,
        location: data.location,
        image: data.image,
        ownerId: data.owner_id,
        ownerName: data.owner_name,
        status: data.status,
        createdAt: data.created_at
      }
    };
  } catch (error) {
    console.error('Update item error:', error);
    return { success: false, error: error.message };
  }
};

export const deleteItem = async (itemId) => {
  try {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Delete item error:', error);
    return { success: false, error: error.message };
  }
};

export const toggleItemStatus = async (itemId, currentStatus) => {
  try {
    const newStatus = currentStatus === 'tersedia' ? 'tidak tersedia' : 'tersedia';
    
    const { data, error } = await supabase
      .from('items')
      .update({ status: newStatus })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      item: {
        id: data.id,
        title: data.title,
        description: data.description,
        price: data.price,
        priceUnit: data.price_unit,
        location: data.location,
        image: data.image,
        ownerId: data.owner_id,
        ownerName: data.owner_name,
        status: data.status,
        createdAt: data.created_at
      }
    };
  } catch (error) {
    console.error('Toggle item status error:', error);
    return { success: false, error: error.message };
  }
};

// ============ WISHLIST FUNCTIONS ============

export const fetchWishlist = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('wishlist')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    return data.map(w => ({
      id: w.id,
      userId: w.user_id,
      itemId: w.item_id,
      createdAt: w.created_at
    }));
  } catch (error) {
    console.error('Fetch wishlist error:', error);
    return [];
  }
};

export const addToWishlist = async (userId, itemId) => {
  try {
    const { data, error } = await supabase
      .from('wishlist')
      .insert([
        {
          user_id: userId,
          item_id: itemId
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      wishlistItem: {
        id: data.id,
        userId: data.user_id,
        itemId: data.item_id,
        createdAt: data.created_at
      }
    };
  } catch (error) {
    console.error('Add to wishlist error:', error);
    return { success: false, error: error.message };
  }
};

export const removeFromWishlist = async (userId, itemId) => {
  try {
    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', itemId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    return { success: false, error: error.message };
  }
};

// ============ CHAT FUNCTIONS ============

export const fetchChats = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .contains('participants', [userId])
      .order('last_updated', { ascending: false });

    if (error) throw error;

    return data.map(chat => ({
      id: chat.id,
      participants: chat.participants,
      itemId: chat.item_id,
      itemTitle: chat.item_title,
      lastMessage: chat.last_message,
      lastUpdated: chat.last_updated,
      createdAt: chat.created_at
    }));
  } catch (error) {
    console.error('Fetch chats error:', error);
    return [];
  }
};

export const createChat = async (participants, itemId, itemTitle) => {
  try {
    // Check if chat already exists
    const { data: existingChats, error: checkError } = await supabase
      .from('chats')
      .select('*')
      .contains('participants', participants)
      .eq('item_id', itemId);

    if (checkError) throw checkError;

    if (existingChats && existingChats.length > 0) {
      // Return existing chat
      const chat = existingChats[0];
      return {
        success: true,
        chat: {
          id: chat.id,
          participants: chat.participants,
          itemId: chat.item_id,
          itemTitle: chat.item_title,
          lastMessage: chat.last_message,
          lastUpdated: chat.last_updated,
          createdAt: chat.created_at,
          messages: []
        }
      };
    }

    // Create new chat
    const { data, error } = await supabase
      .from('chats')
      .insert([
        {
          participants,
          item_id: itemId,
          item_title: itemTitle,
          last_message: '',
          last_updated: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      chat: {
        id: data.id,
        participants: data.participants,
        itemId: data.item_id,
        itemTitle: data.item_title,
        lastMessage: data.last_message,
        lastUpdated: data.last_updated,
        createdAt: data.created_at,
        messages: []
      }
    };
  } catch (error) {
    console.error('Create chat error:', error);
    return { success: false, error: error.message };
  }
};

export const fetchMessages = async (chatId) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data.map(msg => ({
      id: msg.id,
      chatId: msg.chat_id,
      senderId: msg.sender_id,
      senderName: msg.sender_name,
      text: msg.text,
      timestamp: msg.created_at
    }));
  } catch (error) {
    console.error('Fetch messages error:', error);
    return [];
  }
};

export const sendMessage = async (chatId, senderId, senderName, text) => {
  try {
    // Insert message
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert([
        {
          chat_id: chatId,
          sender_id: senderId,
          sender_name: senderName,
          text
        }
      ])
      .select()
      .single();

    if (messageError) throw messageError;

    // Update chat last_message and last_updated
    const { error: updateError } = await supabase
      .from('chats')
      .update({
        last_message: text,
        last_updated: new Date().toISOString()
      })
      .eq('id', chatId);

    if (updateError) throw updateError;

    return {
      success: true,
      message: {
        id: messageData.id,
        chatId: messageData.chat_id,
        senderId: messageData.sender_id,
        senderName: messageData.sender_name,
        text: messageData.text,
        timestamp: messageData.created_at
      }
    };
  } catch (error) {
    console.error('Send message error:', error);
    return { success: false, error: error.message };
  }
};
