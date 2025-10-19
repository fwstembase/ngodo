'use client';

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Menu, X, Search, Package, MessageSquare, Heart, User, Home, LogOut, Camera, MapPin, DollarSign, Send, Trash2, Edit, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { supabase } from '@/lib/supabase';
import { Spinner, LoadingOverlay, ButtonSpinner } from '@/components/ui/spinner';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateUserProfile,
  updateUserPassword,
  getUserById,
  fetchItems,
  addItem,
  updateItem,
  deleteItem,
  toggleItemStatus,
  fetchWishlist,
  addToWishlist,
  removeFromWishlist,
  fetchChats,
  createChat,
  fetchMessages,
  sendMessage
} from '@/lib/supabaseHelpers';

// CACHE HELPER FUNCTIONS - Safe localStorage operations
const cacheHelpers = {
  set: (key, value) => {
    try {
      // Limit cache to 30 most recent items to avoid quota issues
      let dataToCache = value;
      if (Array.isArray(value) && value.length > 30) {
        dataToCache = value.slice(0, 30);
        console.log(`⚠️ Cache limited to 30 items (original: ${value.length})`);
      }
      const jsonString = JSON.stringify(dataToCache);
      localStorage.setItem(key, jsonString);
      localStorage.setItem(`${key}_time`, Date.now().toString());
      console.log(`✅ Cache set: ${key} (${dataToCache.length} items)`);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('⚠️ LocalStorage quota exceeded, clearing old cache');
        // Clear old caches
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_time`);
      }
      return false;
    }
  },
  get: (key, maxAge = 300000) => { // Default 5 minutes
    try {
      const cached = localStorage.getItem(key);
      const cacheTime = localStorage.getItem(`${key}_time`);
      
      if (!cached || !cacheTime) return null;
      
      const age = Date.now() - parseInt(cacheTime);
      if (age > maxAge) {
        console.log(`⚠️ Cache expired: ${key}`);
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_time`);
        return null;
      }
      
      console.log(`✅ Cache hit: ${key}`);
      return JSON.parse(cached);
    } catch (error) {
      console.warn('Error reading cache:', error);
      return null;
    }
  },
  clear: (key) => {
    try {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_time`);
      console.log(`✅ Cache cleared: ${key}`);
    } catch (error) {
      console.warn('Error clearing cache:', error);
    }
  }
};

// ⚡ PRE-LOAD CACHE BEFORE RENDER - For instant initial state
const getInitialItemsFromCache = () => {
  try {
    return cacheHelpers.get('pinjamaja_items_cache', 300000) || [];
  } catch (error) {
    console.warn('Failed to load initial cache:', error);
    return [];
  }
};

export default function PinjamAja() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  
  // ⚡ INSTANT INITIAL STATE - Load from cache immediately before first render
  const [items, setItems] = useState(getInitialItemsFromCache());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatParticipantNames, setChatParticipantNames] = useState({});
  const [unreadChats, setUnreadChats] = useState(new Set());
  const [showChatNotification, setShowChatNotification] = useState(false);
  const [latestNotification, setLatestNotification] = useState(null);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [featureModalContent, setFeatureModalContent] = useState({});
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [showEditItemForm, setShowEditItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [openMenuItemId, setOpenMenuItemId] = useState(null);
  const [showManageItemModal, setShowManageItemModal] = useState(false);
  const [managingItem, setManagingItem] = useState(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [previousPage, setPreviousPage] = useState('home'); // Track previous page for back navigation
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null); // Track where to redirect after login
  
  // Filter and Sort States
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance', 'price', 'location'
  const [locationFilter, setLocationFilter] = useState('');
  
  // Loading states - START WITH FALSE FOR INSTANT UI
  const [isInitialLoading, setIsInitialLoading] = useState(false); // ⚡ Changed to false for instant display
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [pageTransition, setPageTransition] = useState(false);

  // 🔧 USE REF TO TRACK CHATS WITHOUT RE-RENDER - Fix for stable Realtime subscription
  const chatsRef = useRef([]);
  const selectedChatRef = useRef(null);
  const itemsRef = useRef([]);
  
  // Update refs whenever state changes
  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);
  
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);
  
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Get current page from route
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path === '/cari-barang') return 'cari-barang';
    if (path === '/item-detail') return 'item-detail';
    if (path === '/sewakan-barang') return 'sewakan-barang';
    if (path === '/chat') return 'chat';
    if (path === '/wishlist') return 'wishlist';
    if (path === '/profil') return 'profil';
    return 'home';
  };

  const currentPage = getCurrentPage();

  // Scroll to top when page changes (especially for item-detail)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // Form states
  const [authForm, setAuthForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  const [itemForm, setItemForm] = useState({
    title: '',
    description: '',
    price: '',
    priceUnit: 'hari',
    location: '',
    image: ''
  });

  const [chatMessage, setChatMessage] = useState('');
  const [profileForm, setProfileForm] = useState({ username: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  
  // Ref untuk autoscroll chat
  const chatMessagesEndRef = useRef(null);

  // Autoscroll ke pesan terbaru saat ada pesan baru
  useEffect(() => {
    if (selectedChat && chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedChat?.messages]);

  // Load data from Supabase on mount - ZERO DELAY, INSTANT UI
  useEffect(() => {
    const loadData = async () => {
      try {
        // Items already loaded from cache in initial state - UI shows immediately!
        // Just fetch fresh data in background now
        
        const currentUser = await getCurrentUser();
        
        // 🔄 BACKGROUND REFRESH: Fetch fresh items silently (non-blocking)
        fetchItems(50).then(freshItems => {
          if (freshItems.length > 0) {
            setItems(freshItems);
            cacheHelpers.set('pinjamaja_items_cache', freshItems);
            console.log('🔄 UPDATED: Fresh data loaded in background');
          } else {
            // Only use demo items if no fresh data from database
            const demoItems = [
              {
                id: '1',
                title: 'Kamera DSLR Canon EOS 80D',
                description: 'Kamera DSLR profesional dalam kondisi sangat baik, lengkap dengan lensa 18-55mm',
                price: 150000,
                priceUnit: 'hari',
                location: 'Jakarta Selatan',
                image: 'https://images.unsplash.com/photo-1606980875396-c78bf46e4e43?w=400',
                ownerId: 'demo-user',
                ownerName: 'Sari Indah',
                status: 'tersedia',
                createdAt: new Date().toISOString()
              },
              {
                id: '2',
                title: 'Tenda Camping 4 Orang',
                description: 'Tenda camping untuk 4 orang, tahan air dan mudah dipasang',
                price: 100000,
                priceUnit: 'hari',
                location: 'Bandung',
                image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400',
                ownerId: 'demo-user-2',
                ownerName: 'Ahmad Rizki',
                status: 'tersedia',
                createdAt: new Date().toISOString()
              },
              {
                id: '3',
                title: 'Proyektor Epson EB-X41',
                description: 'Proyektor untuk presentasi atau nonton film, resolusi tinggi',
                price: 200000,
                priceUnit: 'hari',
                location: 'Jakarta Pusat',
                image: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400',
                ownerId: 'demo-user-3',
                ownerName: 'Budi Santoso',
                status: 'tersedia',
                createdAt: new Date().toISOString()
              },
              {
                id: '4',
                title: 'Sepeda Gunung Polygon',
                description: 'Sepeda gunung 27.5 inch, kondisi prima, cocok untuk trail',
                price: 75000,
                priceUnit: 'hari',
                location: 'Bogor',
                image: 'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=400',
                ownerId: 'demo-user-4',
                ownerName: 'Dimas Pratama',
                status: 'tersedia',
                createdAt: new Date().toISOString()
              },
              {
                id: '5',
                title: 'Mesin Bor Listrik Bosch',
                description: 'Bor listrik profesional untuk renovasi dan pertukangan',
                price: 50000,
                priceUnit: 'hari',
                location: 'Tangerang',
                image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400',
                ownerId: 'demo-user-5',
                ownerName: 'Eko Prasetyo',
                status: 'tersedia',
                createdAt: new Date().toISOString()
              },
              {
                id: '6',
                title: 'PlayStation 5',
                description: 'PS5 lengkap dengan 2 controller dan beberapa game',
                price: 250000,
                priceUnit: 'hari',
                location: 'Jakarta Barat',
                image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400',
                ownerId: 'demo-user-6',
                ownerName: 'Rudi Gaming',
                status: 'tersedia',
                createdAt: new Date().toISOString()
              }
            ];
            setItems(demoItems);
          }
        }).catch(err => console.error('Error loading items:', err));
        
        // Load user-specific data in background (only if logged in)
        if (currentUser) {
          setUser(currentUser);
          setProfileForm({ username: currentUser.username });
          
          // Load user data in parallel (non-blocking)
          Promise.all([
            fetchWishlist(currentUser.id),
            fetchChats(currentUser.id)
          ]).then(async ([wishlistData, chatsData]) => {
            setWishlist(wishlistData);
            
            // Load messages for each chat in parallel
            const chatsWithMessages = await Promise.all(
              chatsData.map(async (chat) => {
                const messages = await fetchMessages(chat.id);
                return { ...chat, messages };
              })
            );
            setChats(chatsWithMessages);
            
            // Extract participant usernames from messages
            const namesMap = {};
            chatsWithMessages.forEach(chat => {
              if (chat.messages) {
                chat.messages.forEach(msg => {
                  if (msg.senderId !== currentUser.id && msg.senderName) {
                    namesMap[msg.senderId] = msg.senderName;
                  }
                });
              }
            });
            
            // Fetch remaining usernames in parallel
            const participantIds = [...new Set(chatsData.flatMap(chat => chat.participants))];
            await Promise.all(
              participantIds.map(async (userId) => {
                if (userId !== currentUser.id && !namesMap[userId]) {
                  const username = await getUserById(userId);
                  if (username) {
                    namesMap[userId] = username;
                  }
                }
              })
            );
            setChatParticipantNames(namesMap);
          }).catch(err => console.error('Error loading user data:', err));
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadData();
  }, []);

  // 🚀 IMPROVED: Setup Realtime subscription for new messages with STABLE dependencies
  useEffect(() => {
    if (!user) return;

    console.log('🔌 Setting up STABLE Realtime subscription for user:', user.id);

    // Subscribe to messages table for real-time updates
    const messagesChannel = supabase
      .channel('messages_realtime_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          console.log('📨 NEW MESSAGE RECEIVED (Real-time):', payload);
          
          const newMessage = {
            id: payload.new.id,
            chatId: payload.new.chat_id,
            senderId: payload.new.sender_id,
            senderName: payload.new.sender_name,
            text: payload.new.text,
            timestamp: payload.new.created_at
          };

          // 🔧 USE REF instead of state to avoid re-subscription
          const currentChats = chatsRef.current;
          const currentSelectedChat = selectedChatRef.current;
          const currentItems = itemsRef.current;

          // Check if message is for current user's chats
          const relevantChat = currentChats.find(c => c.id === newMessage.chatId);
          
          console.log('🔍 Relevant chat found:', relevantChat ? 'Yes' : 'No');
          console.log('👤 Message from other user:', newMessage.senderId !== user.id);
          
          if (relevantChat) {
            console.log('✅ Processing new message - INSTANT UPDATE');
            
            // Update chat with new message
            const updatedChat = {
              ...relevantChat,
              messages: [...(relevantChat.messages || []), newMessage],
              lastMessage: newMessage.text,
              lastUpdated: newMessage.timestamp
            };

            // 🚀 FUNCTIONAL UPDATE - prevents race conditions
            setChats(prevChats => {
              return prevChats.map(c => 
                c.id === newMessage.chatId ? updatedChat : c
              );
            });

            // Update selected chat if it's open
            if (currentSelectedChat && currentSelectedChat.id === newMessage.chatId) {
              console.log('💬 Updating selected chat - INSTANT');
              setSelectedChat(updatedChat);
            } else if (newMessage.senderId !== user.id) {
              console.log('🔴 Marking chat as unread');
              // Mark as unread if chat is not open and message is from other user
              setUnreadChats(prev => new Set([...prev, newMessage.chatId]));
            }

            // Show notification only for messages from other users
            if (newMessage.senderId !== user.id) {
              // Get item and sender info for notification
              const chatItem = currentItems.find(item => item.id === relevantChat.itemId);
              
              // Show notification
              setLatestNotification({
                senderName: newMessage.senderName,
                message: newMessage.text,
                itemTitle: chatItem?.title || 'Barang',
                chatId: newMessage.chatId,
                timestamp: Date.now()
              });
              setShowChatNotification(true);

              // Play notification sound
              playNotificationSound();

              // Show toast notification
              toast.info(`${newMessage.senderName}: ${newMessage.text}`, {
                description: chatItem?.title,
                duration: 5000,
              });

              // Auto-hide chat bubble after 5 seconds
              setTimeout(() => {
                setShowChatNotification(false);
              }, 5000);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time messages');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime subscription error');
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('🔌 Cleaning up Realtime subscription');
      supabase.removeChannel(messagesChannel);
    };
  }, [user]);

  // 🚀 REAL-TIME: Subscribe to items table untuk detect barang baru/update/hapus
  useEffect(() => {
    console.log('🔌 Setting up real-time subscription for items table');

    const itemsChannel = supabase
      .channel('items_realtime_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'items'
        },
        async (payload) => {
          console.log('🆕 New item added (Real-time):', payload.new);
          
          const newItem = {
            id: payload.new.id,
            title: payload.new.title,
            description: payload.new.description,
            price: payload.new.price,
            priceUnit: payload.new.price_unit,
            location: payload.new.location,
            image: payload.new.image,
            ownerId: payload.new.owner_id,
            ownerName: payload.new.owner_name,
            status: payload.new.status,
            createdAt: payload.new.created_at
          };
          
          // Add new item to the list
          setItems(prevItems => {
            // Check if item already exists
            if (prevItems.find(item => item.id === newItem.id)) {
              return prevItems;
            }
            const updatedItems = [newItem, ...prevItems];
            cacheHelpers.set('pinjamaja_items_cache', updatedItems);
            
            // Show notification for new items from other users
            if (user && newItem.ownerId !== user.id) {
              toast.info(`Barang baru tersedia: ${newItem.title}`, {
                description: `Oleh ${newItem.ownerName} - Rp ${newItem.price.toLocaleString('id-ID')}`,
                duration: 4000,
              });
            }
            
            return updatedItems;
          });
          
          console.log('✅ New item added to list');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'items'
        },
        async (payload) => {
          console.log('📝 Item updated (Real-time):', payload.new);
          
          const updatedItem = {
            id: payload.new.id,
            title: payload.new.title,
            description: payload.new.description,
            price: payload.new.price,
            priceUnit: payload.new.price_unit,
            location: payload.new.location,
            image: payload.new.image,
            ownerId: payload.new.owner_id,
            ownerName: payload.new.owner_name,
            status: payload.new.status,
            createdAt: payload.new.created_at
          };
          
          // Update item in the list
          setItems(prevItems => {
            const updatedItems = prevItems.map(item => 
              item.id === updatedItem.id ? updatedItem : item
            );
            cacheHelpers.set('pinjamaja_items_cache', updatedItems);
            return updatedItems;
          });
          
          // Update selected item if it's currently being viewed
          setSelectedItem(prev => {
            if (prev && prev.id === updatedItem.id) {
              return updatedItem;
            }
            return prev;
          });
          
          console.log('✅ Item updated in list');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'items'
        },
        async (payload) => {
          console.log('🗑️ Item deleted (Real-time):', payload.old);
          
          // Remove item from the list
          setItems(prevItems => {
            const updatedItems = prevItems.filter(item => item.id !== payload.old.id);
            cacheHelpers.set('pinjamaja_items_cache', updatedItems);
            return updatedItems;
          });
          
          console.log('✅ Item removed from list');
        }
      )
      .subscribe((status) => {
        console.log('📡 Items subscription status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up items subscription');
      supabase.removeChannel(itemsChannel);
    };
  }, [user]);

  // 🚀 REAL-TIME: Subscribe to wishlist table untuk detect wishlist baru/hapus
  useEffect(() => {
    if (!user) return;

    console.log('🔌 Setting up real-time subscription for wishlist table');

    const wishlistChannel = supabase
      .channel('wishlist_realtime_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wishlist'
        },
        async (payload) => {
          console.log('💖 New wishlist item added (Real-time):', payload.new);
          
          // Only update if it's for current user
          if (payload.new.user_id === user.id) {
            const newWishlistItem = {
              id: payload.new.id,
              userId: payload.new.user_id,
              itemId: payload.new.item_id,
              addedAt: payload.new.added_at
            };
            
            setWishlist(prevWishlist => {
              // Check if already exists
              if (prevWishlist.find(w => w.id === newWishlistItem.id)) {
                return prevWishlist;
              }
              return [...prevWishlist, newWishlistItem];
            });
            
            console.log('✅ Wishlist item added');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'wishlist'
        },
        async (payload) => {
          console.log('💔 Wishlist item removed (Real-time):', payload.old);
          
          // Only update if it's for current user
          if (payload.old.user_id === user.id) {
            setWishlist(prevWishlist => 
              prevWishlist.filter(w => w.id !== payload.old.id)
            );
            
            console.log('✅ Wishlist item removed');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Wishlist subscription status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up wishlist subscription');
      supabase.removeChannel(wishlistChannel);
    };
  }, [user]);

  // 🔄 FALLBACK: Polling setiap 1 detik untuk memastikan data selalu sinkron (backup jika Realtime gagal)
  useEffect(() => {
    if (!user) return;
    
    console.log('🔄 Setting up fallback polling (1 second interval)');
    
    const pollInterval = setInterval(async () => {
      try {
        // Silently refresh items in background
        const freshItems = await fetchItems(50);
        if (freshItems && freshItems.length > 0) {
          setItems(prevItems => {
            // Only update if there are actual changes to avoid unnecessary re-renders
            if (JSON.stringify(prevItems) !== JSON.stringify(freshItems)) {
              cacheHelpers.set('pinjamaja_items_cache', freshItems);
              return freshItems;
            }
            return prevItems;
          });
        }
        
        // Silently refresh wishlist
        const freshWishlist = await fetchWishlist(user.id);
        if (freshWishlist) {
          setWishlist(prevWishlist => {
            // Only update if there are actual changes
            if (JSON.stringify(prevWishlist) !== JSON.stringify(freshWishlist)) {
              return freshWishlist;
            }
            return prevWishlist;
          });
        }
      } catch (error) {
        // Silent fail - Realtime will handle updates
        console.debug('Polling update skipped:', error.message);
      }
    }, 1000); // 1 second interval
    
    return () => {
      console.log('🛑 Stopping fallback polling');
      clearInterval(pollInterval);
    };
  }, [user]);

  // 🚀 NEW: Subscribe to chats table untuk detect chat baru
  useEffect(() => {
    if (!user) return;

    console.log('🔌 Setting up new chats detection subscription');

    const newChatsChannel = supabase
      .channel('new_chats_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats'
        },
        async (payload) => {
          console.log('🆕 New chat created:', payload);
          
          const newChatData = payload.new;
          
          // Check if this chat involves current user
          if (newChatData.participants && newChatData.participants.includes(user.id)) {
            console.log('✅ New chat involves current user');
            
            // Create chat object
            const newChat = {
              id: newChatData.id,
              participants: newChatData.participants,
              itemId: newChatData.item_id,
              itemTitle: newChatData.item_title,
              lastMessage: newChatData.last_message,
              lastUpdated: newChatData.last_updated,
              createdAt: newChatData.created_at,
              messages: []
            };
            
            // Add to chats list
            setChats(prevChats => {
              // Check if chat already exists
              if (prevChats.find(c => c.id === newChat.id)) {
                return prevChats;
              }
              return [newChat, ...prevChats];
            });
            
            console.log('✅ New chat added to list');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 New chats subscription status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up new chats subscription');
      supabase.removeChannel(newChatsChannel);
    };
  }, [user]);

  // 🚀 NEW: Subscribe to chats table untuk update chat metadata (last_message, last_updated)
  useEffect(() => {
    if (!user) return;

    console.log('🔌 Setting up chats table subscription');

    const chatsChannel = supabase
      .channel('chats_realtime_channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chats'
        },
        async (payload) => {
          console.log('📝 Chat metadata updated:', payload);
          
          const updatedChatData = payload.new;
          
          // Update chat in the list with functional update
          setChats(prevChats => {
            return prevChats.map(chat => {
              if (chat.id === updatedChatData.id) {
                return {
                  ...chat,
                  lastMessage: updatedChatData.last_message,
                  lastUpdated: updatedChatData.last_updated
                };
              }
              return chat;
            });
          });
          
          console.log('✅ Chat metadata updated in list');
        }
      )
      .subscribe((status) => {
        console.log('📡 Chats subscription status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up chats subscription');
      supabase.removeChannel(chatsChannel);
    };
  }, [user]);

  // Function to play notification sound
  const playNotificationSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltryxnMpBSl+zPLaizsIGGS57OihUBELTKXh8bllHAU2jtHz0H4vBSF1xe/glEILElyx6O+rWBUIQ5zi8r9pJAUuhM/y24I4Bx1rwO7mnEYPDlOq5O+2YBoFPJPY88p5LQUme8rx3I4+CRZiturqpFITC0mi4PK8aB8FM4nU8teCMwYebsDv45lIDQ9WrOfvsF0YCD6W2vLGcykFKX7M8tqLOwgYZLns6KFQEQtMpeHxuWUcBTaO0fPQfi8FIXXF7+CUQgsRXLHo76tYFQhDnOLyv2kkBS6Ez/LbgjgHHWvA7uacRg8OU6rk77ZgGgU8k9jzynktBSZ7yvHcjj4JFmK26uqkUhMLSaLg8rxoHwUzidTy14IzBh5uwO/jmUgND1as5++wXRgIPpba8sZzKQUpfszy2os7CBhkuezooVARC0yl4fG5ZRwFNo7R89B+LwUhdcXv4JRCC');
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Cannot play sound:', e));
  };

  // Helper function to require login
  const requireLogin = (callback, errorMessage = 'Silakan masuk akun untuk melanjutkan') => {
    if (!user) {
      // Save current page for redirect after login
      setRedirectAfterLogin(location.pathname);
      toast.error(errorMessage);
      setShowAuthModal(true);
      return false;
    }
    return true;
  };

  // Auth handlers
  const handleAuth = async (e) => {
    e.preventDefault();
    
    if (isAuthLoading) return; // Prevent spam clicks
    
    setIsAuthLoading(true);
    
    if (authMode === 'register') {
      if (!authForm.email || !authForm.username || !authForm.password || !authForm.confirmPassword) {
        toast.error('Semua field harus diisi');
        setIsAuthLoading(false);
        return;
      }
      if (authForm.password !== authForm.confirmPassword) {
        toast.error('Password dan konfirmasi password tidak cocok');
        setIsAuthLoading(false);
        return;
      }

      const result = await registerUser(authForm.email, authForm.password, authForm.username);
      
      if (result.success) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        setProfileForm({ username: currentUser.username });
        setShowAuthModal(false);
        
        // Redirect to saved page or default to home
        const targetPage = redirectAfterLogin || '/';
        navigate(targetPage);
        setRedirectAfterLogin(null);
        
        toast.success('Registrasi berhasil!');
        
        // Load user data and refresh items cache
        const [wishlistData, chatsData, itemsData] = await Promise.all([
          fetchWishlist(currentUser.id),
          fetchChats(currentUser.id),
          fetchItems()
        ]);
        setWishlist(wishlistData);
        setChats(chatsData);
        
        // Refresh items and cache after login
        if (itemsData.length > 0) {
          setItems(itemsData);
          cacheHelpers.set('pinjamaja_items_cache', itemsData);
        }
      } else {
        toast.error(result.error || 'Registrasi gagal');
      }
    } else {
      if (!authForm.email || !authForm.password) {
        toast.error('Email dan password harus diisi');
        setIsAuthLoading(false);
        return;
      }

      const result = await loginUser(authForm.email, authForm.password);
      
      if (result.success) {
        const userData = {
          id: result.user.id,
          email: result.user.email,
          username: result.profile.username
        };
        setUser(userData);
        setProfileForm({ username: userData.username });
        setShowAuthModal(false);
        
        // Redirect to saved page or default to home
        const targetPage = redirectAfterLogin || '/';
        navigate(targetPage);
        setRedirectAfterLogin(null);
        
        toast.success('Login berhasil!');
        
        // Load user data and refresh items cache
        const [wishlistData, chatsData, itemsData] = await Promise.all([
          fetchWishlist(userData.id),
          fetchChats(userData.id),
          fetchItems()
        ]);
        setWishlist(wishlistData);
        
        // Load messages for each chat
        const chatsWithMessages = await Promise.all(
          chatsData.map(async (chat) => {
            const messages = await fetchMessages(chat.id);
            return { ...chat, messages };
          })
        );
        setChats(chatsWithMessages);
        
        // Refresh items and cache after login
        if (itemsData.length > 0) {
          setItems(itemsData);
          cacheHelpers.set('pinjamaja_items_cache', itemsData);
        }
      } else {
        toast.error('Email atau password salah');
      }
    }

    setAuthForm({ email: '', username: '', password: '', confirmPassword: '' });
    setIsAuthLoading(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setWishlist([]);
    setChats([]);
    setShowLogoutDialog(false);
    
    // Clear cache on logout
    cacheHelpers.clear('pinjamaja_items_cache');
    
    navigate('/');
    toast.success('Berhasil logout');
  };

  // Item handlers
  const handleAddItem = async (e) => {
    e.preventDefault();
    
    if (isAddingItem) return; // Prevent spam clicks
    
    if (!itemForm.title || !itemForm.description || !itemForm.price || !itemForm.location) {
      toast.error('Semua field harus diisi');
      return;
    }

    setIsAddingItem(true);
    
    // Perform actual API call FIRST (no optimistic update)
    const result = await addItem(itemForm, user.id, user.username);
    
    if (result.success) {
      // Add item to list
      const newItem = result.item;
      const updatedItems = [...items, newItem];
      setItems(updatedItems);
      
      // Update cache
      cacheHelpers.set('pinjamaja_items_cache', updatedItems);
      
      // Close modal and reset form ONLY AFTER success
      setShowAddItemForm(false);
      setShowFeatureModal(false);
      setItemForm({
        title: '',
        description: '',
        price: '',
        priceUnit: 'hari',
        location: '',
        image: ''
      });
      
      // Navigate after success
      navigateTo('sewakan-barang');
      
      toast.success('Barang berhasil ditambahkan!');
    } else {
      // Show error but keep form open so user can retry
      toast.error(result.error || 'Gagal menambahkan barang');
    }
    
    setIsAddingItem(false);
  };

  const handleCancelAddItem = () => {
    // Clear form
    setItemForm({
      title: '',
      description: '',
      price: '',
      priceUnit: 'hari',
      location: '',
      image: ''
    });
    
    // Hide the add item form
    setShowAddItemForm(false);
  };

  // Helper function to navigate with history tracking and animations
  const navigateTo = (page) => {
    // Check if page requires login
    const protectedPages = {
      'sewakan-barang': 'Mohon login untuk menyewakan barang',
      'chat': 'Mohon login untuk melihat chat Anda',
      'wishlist': 'Mohon login untuk melihat wishlist Anda',
      'profil': 'Mohon login untuk melihat profil Anda'
    };
    
    if (protectedPages[page] && !user) {
      requireLogin(null, protectedPages[page]);
      return;
    }
    
    // Save current page before navigating (except for item-detail)
    if (currentPage !== 'item-detail') {
      setPreviousPage(currentPage);
    }
    
    // Scroll to top immediately when navigating
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setPageTransition(true);
    setTimeout(() => {
      let path = '/';
      switch(page) {
        case 'home': path = '/'; break;
        case 'cari-barang': path = '/cari-barang'; break;
        case 'item-detail': path = '/item-detail'; break;
        case 'sewakan-barang': path = '/sewakan-barang'; break;
        case 'chat': path = '/chat'; break;
        case 'wishlist': path = '/wishlist'; break;
        case 'profil': path = '/profil'; break;
        default: path = '/';
      }
      navigate(path);
      setPageTransition(false);
    }, 150);
  };

  const getUserItems = () => {
    if (!user) return [];
    return items.filter(item => item.ownerId === user.id);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar');
        return;
      }
      
      // Resize and compress image for faster loading
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate new dimensions (max 800px width/height)
          let width = img.width;
          let height = img.height;
          const maxSize = 800;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          // Set canvas size and draw resized image
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to compressed base64 (quality 0.7 for good balance)
          const compressedImage = canvas.toDataURL('image/jpeg', 0.7);
          
          // Calculate size reduction (log only, no notification)
          const originalSize = (file.size / 1024).toFixed(2);
          const compressedSize = ((compressedImage.length * 0.75) / 1024).toFixed(2);
          
          console.log(`📦 Image compressed: ${originalSize}KB → ${compressedSize}KB`);
          
          setItemForm({ ...itemForm, image: compressedImage });
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Search handler
  const handleSearch = () => {
    navigateTo('cari-barang');
  };

  const getFilteredItems = () => {
    let filteredItems = [...items];
    
    // Apply search filter
    if (searchQuery) {
      filteredItems = filteredItems.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply location filter
    if (locationFilter) {
      filteredItems = filteredItems.filter(item => 
        item.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }
    
    return filteredItems;
  };

  // Wishlist handlers
  const handleAddToWishlist = async (itemId) => {
    if (!user) {
      toast.error('Silakan login terlebih dahulu');
      return;
    }

    const exists = wishlist.find(w => w.userId === user.id && w.itemId === itemId);
    if (exists) {
      toast.warning('Barang sudah ada di wishlist');
      return;
    }

    // Save to database via Supabase
    const result = await addToWishlist(user.id, itemId);
    if (result.success) {
      const newWishlist = [...wishlist, result.wishlistItem];
      setWishlist(newWishlist);
      toast.success('Berhasil ditambahkan ke wishlist');
    } else {
      toast.error(result.error || 'Gagal menambahkan ke wishlist');
    }
  };

  const handleToggleWishlist = async (itemId) => {
    if (!requireLogin(null, 'Mohon login untuk menambahkan barang ke wishlist')) {
      return;
    }

    const existingWishlistItem = wishlist.find(w => w.userId === user.id && w.itemId === itemId);
    
    if (existingWishlistItem) {
      // Remove from wishlist
      const result = await removeFromWishlist(user.id, itemId);
      if (result.success) {
        const newWishlist = wishlist.filter(w => !(w.userId === user.id && w.itemId === itemId));
        setWishlist(newWishlist);
        toast.success('Dihapus dari wishlist');
      } else {
        toast.error(result.error || 'Gagal menghapus dari wishlist');
      }
    } else {
      // Add to wishlist
      const result = await addToWishlist(user.id, itemId);
      if (result.success) {
        const newWishlist = [...wishlist, result.wishlistItem];
        setWishlist(newWishlist);
        toast.success('Ditambahkan ke wishlist');
      } else {
        toast.error(result.error || 'Gagal menambahkan ke wishlist');
      }
    }
  };

  const handleRemoveFromWishlist = async (itemId) => {
    const result = await removeFromWishlist(user.id, itemId);
    if (result.success) {
      const newWishlist = wishlist.filter(w => !(w.userId === user.id && w.itemId === itemId));
      setWishlist(newWishlist);
      toast.success('Dihapus dari wishlist');
    } else {
      toast.error(result.error || 'Gagal menghapus dari wishlist');
    }
  };

  const getUserWishlistItems = () => {
    if (!user) return [];
    const userWishlistIds = wishlist.filter(w => w.userId === user.id).map(w => w.itemId);
    return items.filter(item => userWishlistIds.includes(item.id));
  };

  // Chat handlers
  const handleStartChat = async (item) => {
    if (!requireLogin(null, 'Mohon login untuk memulai chat dengan pemilik barang')) {
      return;
    }

    if (item.ownerId === user.id) {
      toast.error('Tidak bisa chat dengan barang sendiri');
      return;
    }

    // Check if chat already exists
    const existingChat = chats.find(c => 
      c.itemId === item.id && 
      c.participants.includes(user.id) && 
      c.participants.includes(item.ownerId)
    );

    if (existingChat) {
      // Load messages for existing chat
      const messages = await fetchMessages(existingChat.id);
      setSelectedChat({ ...existingChat, messages });
      navigateTo('chat');
      return;
    }

    // Create new chat
    const result = await createChat([user.id, item.ownerId], item.id, item.title);
    
    if (result.success) {
      const updatedChats = [...chats, result.chat];
      setChats(updatedChats);
      setSelectedChat(result.chat);
      navigateTo('chat');
      
      // Fetch and store owner's username
      if (!chatParticipantNames[item.ownerId]) {
        const ownerUsername = await getUserById(item.ownerId);
        setChatParticipantNames(prev => ({
          ...prev,
          [item.ownerId]: ownerUsername
        }));
      }
    } else {
      toast.error(result.error || 'Gagal membuat chat');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!chatMessage.trim() || !selectedChat || isSendingMessage) return;

    setIsSendingMessage(true);

    const result = await sendMessage(selectedChat.id, user.id, user.username, chatMessage);
    
    if (result.success) {
      const updatedChat = {
        ...selectedChat,
        messages: [...(selectedChat.messages || []), result.message],
        lastMessage: chatMessage,
        lastUpdated: new Date().toISOString()
      };

      const updatedChats = chats.map(c => c.id === selectedChat.id ? updatedChat : c);
      setChats(updatedChats);
      setSelectedChat(updatedChat);
      setChatMessage('');
      
      // Cache current user's username
      if (!chatParticipantNames[user.id]) {
        setChatParticipantNames(prev => ({
          ...prev,
          [user.id]: user.username
        }));
      }
    } else {
      toast.error(result.error || 'Gagal mengirim pesan');
    }
    
    setIsSendingMessage(false);
  };

  const getUserChats = () => {
    if (!user) return [];
    return chats.filter(c => c.participants.includes(user.id))
      .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
  };

  // Helper function to get correct display name for chat
  const getChatDisplayName = (chat) => {
    if (!user) return 'User';
    
    const chatItem = items.find(item => item.id === chat.itemId);
    if (!chatItem) return 'User';
    
    // Check if current user is the owner
    const isOwner = chatItem.ownerId === user.id;
    
    if (isOwner) {
      // If owner, show borrower's name
      const borrowerId = chat.participants.find(id => id !== user.id);
      
      // Try to get from cached participant names
      if (chatParticipantNames[borrowerId]) {
        return chatParticipantNames[borrowerId];
      }
      
      // Try to get from messages (sender_name)
      if (chat.messages && chat.messages.length > 0) {
        const borrowerMessage = chat.messages.find(msg => msg.senderId === borrowerId);
        if (borrowerMessage && borrowerMessage.senderName) {
          return borrowerMessage.senderName;
        }
      }
      
      return 'Peminjam';
    } else {
      // If borrower, show owner's name
      return chatItem.ownerName;
    }
  };

  // Mark chat as read
  const markChatAsRead = (chatId) => {
    setUnreadChats(prev => {
      const newSet = new Set(prev);
      newSet.delete(chatId);
      return newSet;
    });
  };

  // Profile handlers
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (isUpdatingProfile) return; // Prevent spam clicks
    
    if (!profileForm.username.trim()) {
      toast.error('Username tidak boleh kosong');
      return;
    }

    setIsUpdatingProfile(true);

    const result = await updateUserProfile(user.id, profileForm.username);
    
    if (result.success) {
      const updatedUser = { ...user, username: profileForm.username };
      setUser(updatedUser);
      setShowEditProfile(false);
      toast.success('Profil berhasil diupdate');
    } else {
      toast.error(result.error || 'Gagal update profil');
    }
    
    setIsUpdatingProfile(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    
    if (isUpdatingPassword) return; // Prevent spam clicks
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Semua field harus diisi');
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Password baru dan konfirmasi tidak cocok');
      return;
    }

    setIsUpdatingPassword(true);

    const result = await updateUserPassword(passwordForm.currentPassword, passwordForm.newPassword);
    
    if (result.success) {
      setShowEditPassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password berhasil diubah');
    } else {
      toast.error(result.error || 'Gagal mengubah password');
    }
    
    setIsUpdatingPassword(false);
  };

  // Feature modal handler
  const showFeature = (title, description) => {
    setFeatureModalContent({ title, description });
    setShowFeatureModal(true);
  };

  const getUserItemCount = () => {
    if (!user) return 0;
    return items.filter(item => item.ownerId === user.id).length;
  };

  // Navigation
  const navItems = [
    { id: 'home', label: 'Beranda', icon: Home },
    { id: 'cari-barang', label: 'Cari', icon: Search },
    { id: 'sewakan-barang', label: 'Sewakan', icon: Package },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'profil', label: 'Profil', icon: User }
  ];

  const renderNavbar = () => {
    return (
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="PinjamAja Logo" className="h-9 w-9" />
              <div className="text-2xl font-bold" style={{ color: '#245EDE' }}>PinjamAja</div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden xl:flex items-center space-x-6">
              {navItems.map(item => {
                const Icon = item.icon;
                const showBadge = item.id === 'chat' && unreadChats.size > 0;
                
                // Show "Masuk" button if user is not logged in and this is the "profil" item
                if (!user && item.id === 'profil') {
                  return (
                    <Button 
                      key={item.id}
                      onClick={() => setShowAuthModal(true)} 
                      style={{ backgroundColor: '#245EDE' }} 
                      className="text-white btn-ripple hover-scale transition-all-smooth"
                    >
                      Masuk
                    </Button>
                  );
                }
                
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
                    className={`flex items-center space-x-2 transition-all-smooth hover:scale-105 relative group ${currentPage === item.id ? 'font-semibold' : ''}`}
                    style={{ color: currentPage === item.id ? '#245EDE' : '#666' }}
                  >
                    <div className="relative">
                      <Icon size={20} className="transition-transform duration-300 group-hover:rotate-12" />
                      {showBadge && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
                          {unreadChats.size}
                        </span>
                      )}
                    </div>
                    <span className="group-hover:translate-x-0.5 transition-transform duration-300">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile & Tablet Menu Button with Hamburger Animation */}
            <button
              className={`xl:hidden w-8 h-8 flex flex-col justify-center items-center space-y-1.5 ${isMobileMenuOpen ? 'hamburger-open' : ''}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{ color: '#245EDE' }}
              aria-label="Toggle menu"
            >
              <span className="hamburger-line block w-6 h-0.5 bg-current"></span>
              <span className="hamburger-line block w-6 h-0.5 bg-current"></span>
              <span className="hamburger-line block w-6 h-0.5 bg-current"></span>
            </button>
          </div>

          {/* Mobile & Tablet Navigation with Smooth Slide Animation */}
          {isMobileMenuOpen && (
            <div className="xl:hidden py-4 border-t animate-slide-in-top">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const showBadge = item.id === 'chat' && unreadChats.size > 0;
                
                // Show "Masuk" button if user is not logged in and this is the "profil" item
                if (!user && item.id === 'profil') {
                  return (
                    <div key={item.id} className="px-4 py-3">
                      <Button 
                        onClick={() => {
                          setShowAuthModal(true);
                          setIsMobileMenuOpen(false);
                        }} 
                        style={{ backgroundColor: '#245EDE' }} 
                        className="text-white btn-ripple hover-scale transition-all-smooth w-full"
                      >
                        Masuk
                      </Button>
                    </div>
                  );
                }
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigateTo(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center space-x-3 w-full py-3 px-4 transition-all-smooth hover:bg-gray-50 hover:translate-x-1 relative stagger-item ${currentPage === item.id ? 'font-semibold bg-blue-50' : ''}`}
                    style={{ 
                      color: currentPage === item.id ? '#245EDE' : '#666',
                      animationDelay: `${index * 0.1}s`
                    }}
                  >
                    <div className="relative">
                      <Icon size={20} className="transition-transform duration-300 group-hover:scale-110" />
                      {showBadge && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
                          {unreadChats.size}
                        </span>
                      )}
                    </div>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    );
  };

  const renderLandingPage = () => (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-24 md:py-32 overflow-hidden" style={{ background: 'linear-gradient(135deg, #245EDE 0%, #1a4ab8 100%)' }}>
        <div className="container mx-auto px-4 text-center text-white">
          <motion.h1 
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-bold mb-6"
          >
            PinjamAja
          </motion.h1>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-2xl md:text-3xl font-semibold mb-4"
          >
            Solusi Cerdas untuk Pinjam & Sewakan Barang
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="text-lg md:text-xl mb-10 max-w-3xl mx-auto leading-relaxed"
          >
            Temukan barang yang kamu butuhkan tanpa beli baru, atau hasilkan uang dari barang yang tidak terpakai.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={() => navigateTo('cari-barang')} 
                size="lg" 
                className="bg-white hover:bg-gray-100 btn-ripple text-base md:text-lg px-8 py-6 shadow-lg" 
                style={{ color: '#245EDE' }}
              >
                Mulai Pinjam Barang
              </Button>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={() => navigateTo('sewakan-barang')} 
                size="lg" 
                className="bg-transparent border-2 border-white hover:bg-white/20 text-white text-base md:text-lg px-8 py-6" 
              >
                Mulai Sewakan Barang
              </Button>
            </motion.div>
          </motion.div>
          
          <motion.button 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => {
              const element = document.getElementById('tentang-section');
              if (element) element.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-white/90 hover:text-white underline text-sm md:text-base transition-all"
          >
            Pelajari Selengkapnya
          </motion.button>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-20 bg-white overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-center mb-4 text-gray-900"
          >
            Mengapa Memilih PinjamAja
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {[
              { emoji: '💸', title: 'Lebih Hemat', desc: 'Pinjam barang sesuai kebutuhan tanpa perlu beli. Praktis, efisien, dan ramah lingkungan.', delay: 0.1 },
              { emoji: '💰', title: 'Ubah Barang Nganggur Jadi Uang', desc: 'Sewakan barang tak terpakai dan dapatkan penghasilan tambahan dengan mudah.', delay: 0.2 },
              { emoji: '✅', title: 'Gratis & Terpercaya', desc: '100% gratis digunakan, mudah diakses, dan didukung sistem verifikasi yang menjamin keamanan pengguna.', delay: 0.3 }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: item.delay }}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
              >
                <Card className="transition-all duration-300 text-center border-none shadow-lg h-full hover:shadow-xl">
                  <CardContent className="pt-10 pb-8 px-6">
                    <motion.div 
                      className="text-5xl mb-4"
                      animate={{ 
                        y: [0, -8, 0],
                        rotate: [-2, 2, -2]
                      }}
                      transition={{ 
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: idx * 0.5
                      }}
                      whileHover={{ scale: 1.2, rotate: 10 }}
                    >
                      {item.emoji}
                    </motion.div>
                    <h3 className="text-2xl font-bold mb-3" style={{ color: '#245EDE' }}>{item.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="tentang-section" className="py-20 bg-gray-50 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl font-bold text-center mb-6 text-gray-900"
            >
              Tentang PinjamAja
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-gray-700 text-center mb-8 leading-relaxed"
            >
              PinjamAja adalah platform digital yang mempertemukan peminjam dan penyewa barang secara aman dan menguntungkan.
              Peminjam bisa hemat tanpa harus beli, dan pemilik barang bisa menghasilkan uang dari aset tak terpakai.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              className="bg-white rounded-xl p-8 shadow-lg mb-8"
            >
              <h3 className="text-2xl font-bold mb-4 text-center" style={{ color: '#245EDE' }}>Keunggulan PinjamAja:</h3>
              <ul className="space-y-3 text-gray-700">
                {[
                  'Platform pinjam & sewa barang pertama di Indonesia',
                  'Proses cepat, mudah, dan terjamin',
                  'Hemat biaya tanpa beli baru',
                  'Dapat penghasilan tambahan',
                  'Aman & transparan berkat sistem verifikasi'
                ].map((item, idx) => (
                  <motion.li 
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.4 + idx * 0.1 }}
                    className="flex items-start"
                  >
                    <motion.span 
                      className="text-xl mr-3"
                      animate={{ 
                        scale: [1, 1.15, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ 
                        duration: 3.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: idx * 0.3
                      }}
                      whileHover={{ scale: 1.4, rotate: 360 }}
                    >
                      ✓
                    </motion.span>
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              {[
                { emoji: '📦', number: '1.000+', label: 'Barang', delay: 0.1 },
                { emoji: '👥', number: '750+', label: 'Pengguna Aktif', delay: 0.2 },
                { emoji: '💼', number: '500+', label: 'Transaksi Berhasil', delay: 0.3 }
              ].map((stat, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: stat.delay }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="bg-white rounded-xl p-6 shadow-md cursor-pointer"
                >
                  <motion.div 
                    className="text-4xl mb-2"
                    animate={{ 
                      y: [0, -6, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 3.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: idx * 0.7
                    }}
                  >
                    {stat.emoji}
                  </motion.div>
                  <div className="text-3xl font-bold mb-1" style={{ color: '#245EDE' }}>{stat.number}</div>
                  <div className="text-gray-600">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-center mb-12 text-gray-900"
          >
            Manfaat PinjamAja
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                img: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=300&fit=crop',
                emoji: '💸',
                title: 'Hemat & Efisien',
                desc: 'Pinjam sesuai kebutuhan, kurangi pengeluaran dan penumpukan barang.',
                delay: 0.1
              },
              { 
                img: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop',
                emoji: '💰',
                title: 'Tambah Penghasilan',
                desc: 'Sewakan barang tak terpakai dan ubah jadi sumber pemasukan.',
                delay: 0.2
              },
              { 
                img: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&h=300&fit=crop',
                emoji: '🔄',
                title: 'Barang Jadi Berguna Lagi',
                desc: 'Barang nganggur bisa membantu orang lain yang membutuhkan.',
                delay: 0.3
              }
            ].map((benefit, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: benefit.delay }}
                className="flex flex-col items-center text-center"
              >
                <motion.div 
                  className="w-full h-48 rounded-xl overflow-hidden mb-6 shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <img 
                    src={benefit.img}
                    alt={benefit.title}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
                <motion.div 
                  className="text-4xl mb-4"
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [-3, 3, -3]
                  }}
                  transition={{ 
                    duration: 4.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: idx * 0.6
                  }}
                  whileHover={{ scale: 1.2, rotate: 10 }}
                >
                  {benefit.emoji}
                </motion.div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: '#245EDE' }}>{benefit.title}</h3>
                <p className="text-gray-600 leading-relaxed">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50 overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-center mb-12 text-gray-900"
          >
            Apa Kata Pengguna Kami
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { 
                name: 'Rina', 
                role: 'Mahasiswi',
                text: 'Prosesnya cepat dan mudah! Sekarang setiap butuh alat kuliah, aku pakai PinjamAja.',
                avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
                delay: 0.1
              },
              { 
                name: 'Dimas', 
                role: 'Freelancer Desain',
                text: 'Barang desainku disewakan di PinjamAja, lumayan banget buat nambah uang jajan.',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
                delay: 0.2
              },
              { 
                name: 'Nanda', 
                role: 'Ibu Rumah Tangga',
                text: 'Hemat banget! Bisa pinjam alat masak tanpa harus beli.',
                avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
                delay: 0.3
              },
              { 
                name: 'Bagas', 
                role: 'Fotografer',
                text: 'Butuh lensa tambahan mendadak, langsung dapat lewat PinjamAja. Aman dan cepat.',
                avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
                delay: 0.1
              },
              { 
                name: 'Sari', 
                role: 'Karyawan',
                text: 'Sewakan barang-barangku di sini, sistemnya jelas dan pembayaran aman.',
                avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
                delay: 0.2
              }
            ].map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: testimonial.delay }}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
              >
                <Card className="hover:shadow-2xl transition-all duration-300 border-none h-full">
                  <CardContent className="pt-8 pb-6 px-6">
                    <motion.div 
                      className="flex items-center mb-4"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: testimonial.delay + 0.2 }}
                    >
                      <motion.img 
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        className="w-14 h-14 rounded-full object-cover mr-4 border-2 border-blue-500"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      />
                      <div>
                        <p className="font-bold text-lg">{testimonial.name}</p>
                        <p className="text-sm text-gray-500">{testimonial.role}</p>
                      </div>
                    </motion.div>
                    <div className="flex mb-3">
                      {[...Array(5)].map((_, i) => (
                        <motion.span 
                          key={i}
                          initial={{ opacity: 0, scale: 0 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: testimonial.delay + 0.3 + i * 0.1 }}
                          className="text-yellow-400 text-lg"
                        >
                          ⭐
                        </motion.span>
                      ))}
                    </div>
                    <p className="text-gray-700 italic leading-relaxed">"{testimonial.text}"</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Use */}
      <section className="py-20 bg-white overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-center mb-4 text-gray-900"
          >
            Cara Menggunakan PinjamAja
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center text-gray-600 mb-16 text-lg"
          >
            Mudah dan cepat, hanya beberapa langkah!
          </motion.p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Pinjam Barang */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 shadow-lg"
            >
              <h3 className="text-3xl font-bold mb-6 text-center" style={{ color: '#245EDE' }}>1. Pinjam Barang</h3>
              <div className="space-y-4">
                {[
                  'Login ke akun',
                  'Cari barang yang dibutuhkan',
                  'Hubungi pemilik',
                  'Lakukan pembayaran dan ambil barang'
                ].map((step, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.4 + idx * 0.1 }}
                    className="flex items-start"
                  >
                    <motion.div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-4 flex-shrink-0" 
                      style={{ backgroundColor: '#245EDE' }}
                      whileHover={{ scale: 1.3, rotate: 360 }}
                    >
                      {idx + 1}
                    </motion.div>
                    <p className="text-gray-700">{step}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Sewakan Barang */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 shadow-lg"
            >
              <h3 className="text-3xl font-bold mb-6 text-center" style={{ color: '#245EDE' }}>2. Sewakan Barang</h3>
              <div className="space-y-4">
                {[
                  'Login ke akun',
                  'Buka menu Sewakan Barang',
                  'Isi detail dan unggah foto',
                  'Barang siap disewakan dan kamu mulai dapat penghasilan'
                ].map((step, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.4 + idx * 0.1 }}
                    className="flex items-start"
                  >
                    <motion.div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-4 flex-shrink-0" 
                      style={{ backgroundColor: '#245EDE' }}
                      whileHover={{ scale: 1.3, rotate: 360 }}
                    >
                      {idx + 1}
                    </motion.div>
                    <p className="text-gray-700">{step}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-gray-900">Pertanyaan Umum</h2>
          <div className="max-w-3xl mx-auto mt-12">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1" className="bg-white rounded-lg px-6 shadow-sm">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  Apakah PinjamAja gratis?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Ya, pendaftaran dan penggunaan 100% gratis.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-2" className="bg-white rounded-lg px-6 shadow-sm">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  Bagaimana sistem pembayarannya?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Pembayaran dilakukan langsung antara peminjam dan pemilik barang.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-3" className="bg-white rounded-lg px-6 shadow-sm">
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  Apakah aman?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Kami menyarankan pertemuan di tempat umum dan verifikasi identitas pengguna.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <div className="text-center mt-10">
              <p className="text-gray-600 mb-4">Masih punya pertanyaan?</p>

            <Button
              onClick={() => window.open('https://api.whatsapp.com/send/?phone=6281285377443&text&type=phone_number&app_absent=0', '_blank')}
              style={{ backgroundColor: '#245EDE' }}
              className="text-white hover:opacity-90"
            >
              👉 Hubungi Kami
            </Button>

            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Only show when user is not logged in */}
      {!user && (
        <section className="py-24" style={{ background: 'linear-gradient(135deg, #245EDE 0%, #1a4ab8 100%)' }}>
          <div className="container mx-auto px-4 text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Siap Mulai dengan PinjamAja?</h2>
            <p className="text-xl mb-10 max-w-2xl mx-auto">
              Bergabunglah dengan ribuan pengguna yang sudah merasakan kemudahan pinjam-meminjam barang!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => setShowAuthModal(true)} 
                size="lg" 
                className="bg-white hover:bg-gray-100 text-lg px-10 py-6" 
                style={{ color: '#245EDE' }}
              >
                Daftar Sekarang - Gratis!
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#245EDE' }}>PinjamAja</h3>
              <p className="text-gray-400 leading-relaxed">
                Platform pinjam & sewakan barang terpercaya untuk berbagi, berhemat, dan saling membantu.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg">Fitur Utama</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => showFeature('Pinjam Barang', 'Temukan berbagai barang yang bisa Anda pinjam dari komunitas. Cukup cari barang yang Anda butuhkan, hubungi pemiliknya, dan atur jadwal pinjaman.')} className="hover:text-white transition-colors">• Pinjam Barang</button></li>
                <li><button onClick={() => showFeature('Sewakan Barang', 'Punya barang yang jarang dipakai? Sewakan dan dapatkan penghasilan tambahan. Upload foto, tentukan harga, dan tunggu permintaan masuk.')} className="hover:text-white transition-colors">• Sewakan Barang</button></li>
                <li><button onClick={() => showFeature('Chat Langsung', 'Komunikasi langsung dengan pemilik atau peminjam barang. Koordinasikan waktu, tempat, dan detail pinjaman dengan mudah melalui fitur chat kami.')} className="hover:text-white transition-colors">• Chat Langsung</button></li>
                <li><button onClick={() => showFeature('Wishlist', 'Simpan barang-barang yang menarik perhatian Anda ke wishlist. Akses kapan saja dan hubungi pemilik saat Anda siap untuk meminjam.')} className="hover:text-white transition-colors">• Wishlist</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg">Bantuan</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => showFeature('Cara Menggunakan', 'A. Pinjam Barang\n\n1. Login ke akun\n2. Cari barang yang dibutuhkan\n3. Hubungi pemilik\n4. Lakukan pembayaran dan ambil barang\n\nB. Sewakan Barang\n\n1. Login ke akun\n2. Buka menu Sewakan Barang\n3. Isi detail dan unggah foto\n4. Barang siap disewakan dan kamu mulai dapat penghasilan')} className="hover:text-white transition-colors">• Cara Menggunakan</button></li>
                <li><button onClick={() => showFeature('FAQ', 'Q: Apakah PinjamAja gratis?\nA: Ya, mendaftar dan menggunakan platform kami sepenuhnya gratis.\n\nQ: Bagaimana cara pembayaran?\nA: Pembayaran dilakukan langsung antara peminjam dan pemilik barang saat bertemu.\n\nQ: Apakah ada jaminan keamanan?\nA: Kami menyarankan bertemu di tempat umum dan memeriksa identitas kedua belah pihak.')} className="hover:text-white transition-colors">• FAQ</button></li>
                <li><button onClick={() => showFeature('Kebijakan Privasi', 'Kami sangat menghargai privasi Anda. Data pribadi Anda disimpan dengan aman dan tidak akan dibagikan kepada pihak ketiga tanpa izin Anda. Kami hanya menggunakan informasi Anda untuk meningkatkan layanan platform.')} className="hover:text-white transition-colors">• Kebijakan Privasi</button></li>
                <li><button onClick={() => showFeature('Syarat & Ketentuan', '1. Pengguna harus berusia minimal 17 tahun\n2. Informasi yang diberikan harus akurat dan benar\n3. Dilarang menyewakan barang ilegal atau berbahaya\n4. Transaksi dilakukan atas tanggung jawab masing-masing pihak\n5. PinjamAja tidak bertanggung jawab atas kerugian dalam transaksi')} className="hover:text-white transition-colors">• Syarat & Ketentuan</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>© 2025 PinjamAja. Semua hak dilindungi.</p>
          </div>
        </div>
      </footer>
    </div>
  );

  const renderCariBarang = () => (
    <div className="min-h-screen bg-gray-50 py-8 animate-fade-in">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-2 animate-slide-in-top">Cari Barang untuk Dipinjam</h1>
        <p className="text-gray-600 mb-6 animate-fade-in">Temukan berbagai barang yang bisa Anda pinjam dari komunitas PinjamAja</p>

        {/* Search Bar */}
        <div className="flex flex-col gap-4 mb-8 animate-slide-in-top">
          <div className="flex gap-2">
            <Input
              placeholder="Cari barang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 transition-all-smooth focus:ring-2 focus:ring-blue-400"
            />
            <Button onClick={handleSearch} style={{ backgroundColor: '#245EDE' }} className="text-white btn-ripple hover-scale">
              <Search size={20} className="mr-2" />
              Cari
            </Button>
          </div>
          
          {/* Filter Controls */}
          <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-lg shadow-sm animate-slide-in-bottom">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                <MapPin size={16} className="inline mr-1" />
                Filter Lokasi:
              </label>
              <Input
                placeholder="Masukkan lokasi..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="flex-1 transition-all-smooth focus:ring-2 focus:ring-blue-400"
              />
            </div>
            
            {locationFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLocationFilter('');
                }}
                className="transition-all-smooth hover-scale"
              >
                Reset Filter
              </Button>
            )}
          </div>
          
          {/* Active Filters Display */}
          {(searchQuery || locationFilter) && (
            <div className="flex flex-wrap gap-2 animate-fade-in">
              {searchQuery && (
                <Badge variant="secondary" className="px-3 py-1 transition-all-smooth">
                  Pencarian: "{searchQuery}"
                </Badge>
              )}
              {locationFilter && (
                <Badge variant="secondary" className="px-3 py-1 transition-all-smooth">
                  <MapPin size={14} className="inline mr-1" />
                  Lokasi: {locationFilter}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {getFilteredItems().map((item, index) => (
            <Card 
              key={item.id} 
              className={`hover-lift transition-all-smooth cursor-pointer card-entrance shadow-lg ${
                item.status === 'tidak tersedia' ? 'opacity-50' : ''
              }`}
              style={{ animationDelay: `${0.2 + index * 0.04}s` }}
              onClick={() => {
                setSelectedItem(item);
                navigateTo('item-detail');
              }}
            >
              <div className="aspect-square w-full overflow-hidden rounded-t-lg">
                <img 
                  src={item.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'} 
                  alt={item.title} 
                  className="w-full h-full object-cover transition-all-smooth hover:scale-110" 
                />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <Badge 
                  variant={item.status === 'tersedia' ? 'default' : 'secondary'}
                  className={`transition-all-smooth mb-2 ${
                    item.status === 'tersedia' 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-gray-400 hover:bg-gray-500'
                  }`}
                >
                  {item.status === 'tersedia' ? 'Tersedia' : 'Tidak Tersedia'}
                </Badge>
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <MapPin size={16} className="mr-1" />
                  <span>{item.location}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="font-bold transition-all-smooth" style={{ color: '#245EDE' }}>
                    Rp {item.price.toLocaleString('id-ID')} / {item.priceUnit}
                  </div>
                </div>
                <div className="text-sm text-gray-500 mt-2">Oleh: {item.ownerName}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {getFilteredItems().length === 0 && (
          <div className="text-center py-12 text-gray-500 animate-fade-in">
            <Package size={48} className="mx-auto mb-4 opacity-50 animate-pulse" />
            <p>Tidak ada barang ditemukan</p>
            <p className="text-sm mt-2">Coba ubah filter atau kata kunci pencarian Anda</p>
          </div>
        )}
      </div>
    </div>
  );

  const handleToggleStatus = async (itemId, currentStatus) => {
    // OPTIMISTIC UPDATE: Update UI immediately for instant feedback
    const newStatus = currentStatus === 'tersedia' ? 'tidak tersedia' : 'tersedia';
    const optimisticItems = items.map(item => 
      item.id === itemId ? { ...item, status: newStatus } : item
    );
    setItems(optimisticItems);
    
    // Update selectedItem immediately if viewing the item
    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem({ ...selectedItem, status: newStatus });
    }
    
    // Show instant feedback
    toast.success(`Status barang diubah menjadi ${newStatus}`);
    
    // Perform actual API call in background
    const result = await toggleItemStatus(itemId, currentStatus);
    
    if (result.success) {
      // Update with real data from server
      const updatedItems = items.map(item => 
        item.id === itemId ? result.item : item
      );
      setItems(updatedItems);
      
      if (selectedItem && selectedItem.id === itemId) {
        setSelectedItem(result.item);
      }
      
      // FORCE CACHE UPDATE to prevent stale data
      cacheHelpers.set('pinjamaja_items_cache', updatedItems);
    } else {
      // Revert optimistic update on error
      setItems(items);
      if (selectedItem && selectedItem.id === itemId) {
        setSelectedItem(items.find(item => item.id === itemId));
      }
      toast.error(result.error || 'Gagal mengubah status');
    }
  };

  const handleOpenEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      title: item.title,
      description: item.description,
      price: item.price.toString(),
      priceUnit: item.priceUnit,
      location: item.location,
      image: item.image || ''
    });
    setShowEditItemForm(true);
  };

  const handleEditItem = async (e) => {
    e.preventDefault();
    
    if (isEditingItem) return; // Prevent spam clicks
    
    if (!itemForm.title || !itemForm.description || !itemForm.price || !itemForm.location) {
      toast.error('Semua field harus diisi');
      return;
    }

    setIsEditingItem(true);

    // OPTIMISTIC UPDATE: Update UI immediately for instant feedback
    const optimisticItem = {
      ...editingItem,
      title: itemForm.title,
      description: itemForm.description,
      price: parseFloat(itemForm.price),
      priceUnit: itemForm.priceUnit,
      location: itemForm.location,
      image: itemForm.image
    };
    
    // Update items immediately
    const optimisticItems = items.map(item => 
      item.id === editingItem.id ? optimisticItem : item
    );
    setItems(optimisticItems);
    
    if (selectedItem && selectedItem.id === editingItem.id) {
      setSelectedItem(optimisticItem);
    }
    
    // Close modal immediately for better UX
    setShowEditItemForm(false);
    toast.success('Barang sedang diupdate...');

    // Perform actual API call in background
    const result = await updateItem(editingItem.id, itemForm);
    
    if (result.success) {
      // Update with real data from server
      const finalItems = items.map(item => 
        item.id === result.item.id ? result.item : item
      );
      setItems(finalItems);
      
      if (selectedItem && selectedItem.id === result.item.id) {
        setSelectedItem(result.item);
      }
      
      // FORCE CACHE UPDATE to prevent stale data
      cacheHelpers.set('pinjamaja_items_cache', finalItems);
      
      // Reset form after success
      setItemForm({
        title: '',
        description: '',
        price: '',
        priceUnit: 'hari',
        location: '',
        image: ''
      });
      setEditingItem(null);
      
      toast.success('Barang berhasil diupdate!');
    } else {
      // Revert optimistic update on error
      setItems(items);
      if (selectedItem && selectedItem.id === editingItem.id) {
        setSelectedItem(items.find(item => item.id === editingItem.id));
      }
      setShowEditItemForm(true); // Reopen form on error
      toast.error(result.error || 'Gagal update barang');
    }
    
    setIsEditingItem(false);
  };

  const handleOpenDeleteDialog = (item) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  };

  const handleDeleteItem = async () => {
    const result = await deleteItem(itemToDelete.id);
    
    if (result.success) {
      const updatedItems = items.filter(item => item.id !== itemToDelete.id);
      setItems(updatedItems);
      
      // FORCE CACHE UPDATE to prevent stale data
      cacheHelpers.set('pinjamaja_items_cache', updatedItems);
      
      toast.success('Barang berhasil dihapus!');
      
      setShowDeleteDialog(false);
      setItemToDelete(null);
      
      // Redirect ke halaman sewakan-barang setelah menghapus
      navigateTo('sewakan-barang');
    } else {
      toast.error(result.error || 'Gagal menghapus barang');
    }
  };

  const renderItemDetail = () => {
    if (!selectedItem) return null;

    // Check if item is in wishlist
    const isInWishlist = user && wishlist.some(w => w.userId === user.id && w.itemId === selectedItem.id);
    
    // Check if this is user's own item
    const isOwnItem = user && selectedItem.ownerId === user.id;

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto max-w-6xl px-4">
          <Button onClick={() => navigate(-1)} variant="outline" className="mb-6 hover-grow">
            ← Kembali
          </Button>

          <Card className="hover-shadow-lg transition-all-smooth">
            {/* Mobile Layout: Image on top, content below */}
            <div className="md:hidden">
              <div className="w-full aspect-square overflow-hidden rounded-t-lg bg-gray-100">
                <img src={selectedItem.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'} alt={selectedItem.title} className="w-full h-full object-cover hover-brighten transition-all-smooth" />
              </div>
              <CardContent className="p-6">
                <h1 className="text-3xl font-bold mb-3">{selectedItem.title}</h1>
                <Badge 
                  variant={selectedItem.status === 'tersedia' ? 'default' : 'secondary'}
                  className={`mb-4 ${
                    selectedItem.status === 'tersedia' 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-gray-400 hover:bg-gray-500'
                  }`}
                >
                  {selectedItem.status === 'tersedia' ? 'Tersedia' : 'Tidak Tersedia'}
                </Badge>
                
                <div className="flex items-center text-gray-600 mb-4">
                  <User size={20} className="mr-2" />
                  <span>Pemilik: <strong>{selectedItem.ownerName}</strong></span>
                </div>

                <div className="flex items-center text-2xl font-bold mb-4" style={{ color: '#245EDE' }}>
                  <DollarSign size={24} className="mr-2" />
                  Rp {selectedItem.price.toLocaleString('id-ID')} / {selectedItem.priceUnit}
                </div>

                <div className="mb-6">
                  <h2 className="font-semibold text-lg mb-2">Deskripsi</h2>
                  <p className="text-gray-700">{selectedItem.description}</p>
                </div>

                <div className="flex items-center text-gray-600 mb-6">
                  <MapPin size={20} className="mr-2" />
                  <span>{selectedItem.location}</span>
                </div>

                {isOwnItem ? (
                  <div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-blue-800 font-medium">Ini adalah barang Anda sendiri</p>
                    </div>
                    <Button 
                      className="w-full hover-lift"
                      style={{ backgroundColor: '#245EDE', color: 'white' }}
                      onClick={() => {
                        setManagingItem(selectedItem);
                        setShowManageItemModal(true);
                      }}
                    >
                      Kelola Barang
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={() => handleStartChat(selectedItem)} style={{ backgroundColor: '#245EDE' }} className="text-white flex-1 hover-lift btn-ripple">
                      <MessageSquare size={20} className="mr-2" />
                      Chat untuk Pinjam
                    </Button>
                    {isInWishlist ? (
                      <Button 
                        onClick={() => handleRemoveFromWishlist(selectedItem.id)} 
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white border-red-500 hover-grow btn-ripple"
                      >
                        <Heart size={20} className="mr-2 fill-current" />
                        Hapus dari Wishlist
                      </Button>
                    ) : (
                      <Button onClick={() => handleAddToWishlist(selectedItem.id)} variant="outline" className="flex-1 hover-lift">
                        <Heart size={20} className="mr-2" />
                        Tambah ke Wishlist
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </div>

            {/* Desktop/Tablet Layout: Image on left (50%), content on right (50%) */}
            <div className="hidden md:flex">
              <div className="w-1/2 aspect-square overflow-hidden rounded-l-lg flex items-center justify-center bg-gray-100">
                <img 
                  src={selectedItem.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'} 
                  alt={selectedItem.title} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <CardContent className="w-1/2 p-6">
                <h1 className="text-3xl font-bold mb-3">{selectedItem.title}</h1>
                <Badge 
                  variant={selectedItem.status === 'tersedia' ? 'default' : 'secondary'}
                  className={`mb-4 ${
                    selectedItem.status === 'tersedia' 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-gray-400 hover:bg-gray-500'
                  }`}
                >
                  {selectedItem.status === 'tersedia' ? 'Tersedia' : 'Tidak Tersedia'}
                </Badge>
                
                <div className="flex items-center text-gray-600 mb-4">
                  <User size={20} className="mr-2" />
                  <span>Pemilik: <strong>{selectedItem.ownerName}</strong></span>
                </div>

                <div className="flex items-center text-2xl font-bold mb-4" style={{ color: '#245EDE' }}>
                  <DollarSign size={24} className="mr-2" />
                  Rp {selectedItem.price.toLocaleString('id-ID')} / {selectedItem.priceUnit}
                </div>

                <div className="mb-6">
                  <h2 className="font-semibold text-lg mb-2">Deskripsi</h2>
                  <p className="text-gray-700">{selectedItem.description}</p>
                </div>

                <div className="flex items-center text-gray-600 mb-6">
                  <MapPin size={20} className="mr-2" />
                  <span>{selectedItem.location}</span>
                </div>

                {isOwnItem ? (
                  <div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-blue-800 font-medium">Ini adalah barang Anda sendiri</p>
                    </div>
                    <Button 
                      className="w-full"
                      style={{ backgroundColor: '#245EDE', color: 'white' }}
                      onClick={() => {
                        setManagingItem(selectedItem);
                        setShowManageItemModal(true);
                      }}
                    >
                      Kelola Barang
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={() => handleStartChat(selectedItem)} style={{ backgroundColor: '#245EDE' }} className="text-white flex-1">
                      <MessageSquare size={20} className="mr-2" />
                      Chat untuk Pinjam
                    </Button>
                    {isInWishlist ? (
                      <Button 
                        onClick={() => handleRemoveFromWishlist(selectedItem.id)} 
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white border-red-500"
                      >
                        <Heart size={20} className="mr-2 fill-current" />
                        Hapus dari Wishlist
                      </Button>
                    ) : (
                      <Button onClick={() => handleAddToWishlist(selectedItem.id)} variant="outline" className="flex-1">
                        <Heart size={20} className="mr-2" />
                        Tambah ke Wishlist
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderSewakanBarang = () => {
    const userItems = getUserItems();

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Sewakan Barang</h1>
            <p className="text-gray-600">Kelola barang yang Anda sewakan</p>
          </div>

          {/* Daftar Barang yang Sudah Diupload */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Barang Anda ({userItems.length})</h2>
              <Button 
                onClick={() => {
                  if (requireLogin(null, 'Mohon login untuk menambahkan barang yang ingin disewakan')) {
                    setShowAddItemForm(true);
                  }
                }} 
                style={{ backgroundColor: '#245EDE' }} 
                className="text-white"
              >
                Tambahkan Barang
              </Button>
            </div>
            
            {userItems.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {userItems.map(item => (
                  <Card 
                    key={item.id} 
                    className={`shadow-lg transition ${item.status === 'tidak tersedia' ? 'opacity-50' : ''}`}
                  >
                    <div 
                      className="aspect-square w-full overflow-hidden rounded-t-lg cursor-pointer" 
                      onClick={() => {
                        setSelectedItem(item);
                        navigateTo('item-detail');
                      }}
                    >
                      <img src={item.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg line-clamp-1 mb-2">{item.title}</h3>
                      <Badge 
                        variant={item.status === 'tersedia' ? 'default' : 'secondary'}
                        className={`mb-2 ${
                          item.status === 'tersedia' 
                            ? 'bg-green-500 hover:bg-green-600' 
                            : 'bg-gray-400 hover:bg-gray-500'
                        }`}
                      >
                        {item.status === 'tersedia' ? 'Tersedia' : 'Tidak Tersedia'}
                      </Badge>
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <MapPin size={16} className="mr-1" />
                        <span>{item.location}</span>
                      </div>
                      <div className="font-bold mb-3" style={{ color: '#245EDE' }}>
                        Rp {item.price.toLocaleString('id-ID')} / {item.priceUnit}
                      </div>
                      
                      {/* Action Buttons */}
                      <Button 
                        className="w-full"
                        style={{ backgroundColor: '#245EDE', color: 'white' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setManagingItem(item);
                          setShowManageItemModal(true);
                        }}
                      >
                        Kelola Barang
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Package size={48} className="mx-auto mb-4 opacity-50 text-gray-400" />
                  <p className="text-gray-500 text-lg mb-2">Belum ada barang yang disewakan</p>
                  <p className="text-gray-400 text-sm">Klik tombol "Tambahkan Barang" untuk mulai menambahkan barang</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderChat = () => {
    const userChats = getUserChats();

    if (selectedChat) {
      const otherUserId = selectedChat.participants?.find(id => id !== user?.id);
      
      // Get item and owner data
      const chatItem = items.find(item => item.id === selectedChat.itemId);
      const otherUserName = getChatDisplayName(selectedChat);
      
      // Ensure messages array exists
      const chatMessages = selectedChat.messages || [];

      return (
        <motion.div 
          className="fixed inset-0 bg-gray-50 flex flex-col z-50"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.3 }}
        >
          {/* Chat Header with Product Card - Fixed at top */}
          <div className="bg-white shadow-md py-3 flex-shrink-0 border-b z-10">
            <div className="container mx-auto px-4">
              <div className="flex items-start gap-3 mb-3">
                <Button 
                  onClick={() => {
                    setSelectedChat(null);
                    // Always navigate back to chat list page
                    navigateTo('chat');
                  }} 
                  variant="ghost" 
                  size="icon"
                  className="flex-shrink-0 mt-1 hover-grow transition-all-smooth"
                  style={{ fontSize: '24px' }}
                >
                  ←
                </Button>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-xl truncate" style={{ color: '#245EDE' }}>
                    {otherUserName}
                  </h2>
                  {chatItem && (
                    <p className="text-sm text-gray-600 truncate">Barang: {chatItem.title}</p>
                  )}
                </div>
              </div>
              
              {/* Product Card */}
              {chatItem && (
                <div 
                  onClick={() => {
                    setSelectedItem(chatItem);
                    navigateTo('item-detail');
                  }}
                  className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition hover-lift"
                >
                  <div className="w-14 h-14 flex-shrink-0 rounded-md overflow-hidden">
                    <img 
                      src={chatItem.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'} 
                      alt={chatItem.title}
                      className="w-full h-full object-cover hover-brighten transition-all-smooth"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{chatItem.title}</h3>
                    <p className="text-xs text-gray-500 flex items-center mt-0.5">
                      <MapPin size={11} className="mr-1 flex-shrink-0" />
                      <span className="truncate">{chatItem.location}</span>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold whitespace-nowrap" style={{ color: '#245EDE' }}>
                      Rp {chatItem.price.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-gray-400">/ {chatItem.priceUnit}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Messages - Scrollable area */}
          <div className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-4 py-3 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageSquare size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Belum ada pesan. Mulai percakapan!</p>
                </div>
              ) : (
                <>
                  {chatMessages.map((message, index) => (
                    <motion.div 
                      key={message.id} 
                      className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                      initial={{ opacity: 0, x: message.senderId === user?.id ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                    >
                      <div className={`max-w-xs md:max-w-md px-4 py-3 rounded-lg shadow-sm ${message.senderId === user?.id ? 'text-white' : 'bg-white border border-gray-200'}`}
                        style={message.senderId === user?.id ? { backgroundColor: '#245EDE' } : {}}>
                        <p className="text-base leading-relaxed">{message.text}</p>
                        <p className={`text-xs mt-1.5 ${message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'}`}>
                          {new Date(message.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  {/* Scroll target - invisible div at the end */}
                  <div ref={chatMessagesEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Message Input - Fixed at bottom */}
          <div className="bg-white border-t py-3 flex-shrink-0">
            <div className="container mx-auto px-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Ketik pesan..."
                  className="flex-1"
                  disabled={isSendingMessage}
                />
                <Button type="submit" disabled={isSendingMessage} style={{ backgroundColor: '#245EDE' }} className="text-white flex items-center justify-center">
                  {isSendingMessage ? <Spinner size="sm" className="text-white" /> : <Send size={20} />}
                </Button>
              </form>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div 
        className="min-h-screen bg-gray-50 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-3xl font-bold">Chat</h1>
          </div>

          {userChats.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-50 text-gray-400" />
                <p className="text-gray-500 mb-4">Belum ada percakapan</p>
                <p className="text-sm text-gray-400">Mulai chat dengan pemilik barang dari halaman detail barang</p>
              </CardContent>
            </Card>
          ) : (
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {userChats.map((chat, index) => {
                // Get item for this chat
                const chatItem = items.find(item => item.id === chat.itemId);
                const otherUserName = getChatDisplayName(chat);
                const isOwner = chatItem?.ownerId === user?.id;
                const roleLabel = isOwner ? 'Peminjam' : 'Pemilik';

                const hasUnread = unreadChats.has(chat.id);

                return (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card 
                      className={`cursor-pointer hover:shadow-md transition ${hasUnread ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => {
                        setSelectedChat(chat);
                        markChatAsRead(chat.id);
                      }}
                    >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                        <img
                          src={chatItem?.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'}
                          alt={chatItem?.title || 'Barang'}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-semibold ${hasUnread ? 'text-blue-600' : ''}`}>{otherUserName}</h3>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{roleLabel}</span>
                          {hasUnread && (
                            <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                              Baru
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-1">{chat.itemTitle}</p>
                        <p className={`text-sm ${hasUnread ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                          {chat.lastMessage || 'Belum ada pesan'}
                        </p>
                      </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(chat.lastUpdated).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    </div>
                  </CardContent>

                  </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  };

  const renderWishlist = () => {
    const wishlistItems = getUserWishlistItems();

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">
            <Heart size={32} className="inline mr-2" style={{ color: '#245EDE' }} />
            Wishlist Saya
          </h1>

          {wishlistItems.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Heart size={48} className="mx-auto mb-4 opacity-50 text-gray-400" />
                <p className="text-gray-500 mb-4">Wishlist Anda masih kosong</p>
                <p className="text-sm text-gray-400">Tambahkan barang favorit Anda dari halaman pencarian</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {wishlistItems.map((item, index) => (
                <Card key={item.id} className="shadow-lg transition hover-lift">
                  <div className="aspect-square w-full overflow-hidden rounded-t-lg cursor-pointer" onClick={() => {
                    setSelectedItem(item);
                    navigateTo('item-detail');
                  }}>
                    <img src={item.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'} alt={item.title} className="w-full h-full object-cover hover-brighten transition-all-smooth" />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <MapPin size={16} className="mr-1" />
                      <span>{item.location}</span>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-bold" style={{ color: '#245EDE' }}>
                        Rp {item.price.toLocaleString('id-ID')} / {item.priceUnit}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 mb-4">Oleh: {item.ownerName}</div>
                    <Button onClick={() => handleRemoveFromWishlist(item.id)} variant="outline" className="w-full hover-grow btn-ripple">
                      <Trash2 size={16} className="mr-2" />
                      Hapus
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProfil = () => (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-2xl px-4">
        <h1 className="text-3xl font-bold mb-6">
          <User size={32} className="inline mr-2" style={{ color: '#245EDE' }} />
          Profil Saya
        </h1>

        <Card className="mb-6 hover-shadow-lg transition-all-smooth">
          <CardContent className="p-6">
            <div className="flex items-center justify-center mb-6">
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold" style={{ backgroundColor: '#245EDE' }}>
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
                <p className="text-lg font-semibold">{user?.username}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                <p className="text-lg">{user?.email}</p>
              </div>

              <div 
                onClick={() => navigateTo('sewakan-barang')}
                className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors hover-lift"
              >
                <label className="block text-sm font-medium text-gray-600 mb-1 cursor-pointer">Jumlah Barang Disewakan</label>
                <p className="text-lg font-semibold cursor-pointer" style={{ color: '#245EDE' }}>{getUserItemCount()} Barang</p>
              </div>
            </div>

            <div className="space-y-3 mt-6">
              <Button onClick={() => setShowEditProfile(true)} variant="outline" className="w-full hover-grow btn-ripple">
                <Edit size={16} className="mr-2" />
                Edit Profil
              </Button>
              <Button onClick={() => setShowEditPassword(true)} variant="outline" className="w-full hover-grow btn-ripple">
                <Edit size={16} className="mr-2" />
                Edit Password
              </Button>
              <Button onClick={() => setShowLogoutDialog(true)} variant="outline" className="w-full text-red-600 border-red-600 hover:bg-red-50 hover-grow btn-ripple">
                <LogOut size={16} className="mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informasi Tambahan */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="cara-menggunakan" data-testid="cara-menggunakan-accordion">
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-semibold">Cara Menggunakan</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-gray-700 space-y-2 pt-2">
                    <p>1. Daftar akun gratis</p>
                    <p>2. Cari barang yang Anda butuhkan atau upload barang untuk disewakan</p>
                    <p>3. Chat dengan pemilik/peminjam untuk koordinasi</p>
                    <p>4. Atur waktu dan tempat pertemuan</p>
                    <p>5. Lakukan transaksi dengan aman</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq" data-testid="faq-accordion">
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-semibold">FAQ</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-gray-700 space-y-4 pt-2">
                    <div>
                      <p className="font-semibold">Q: Apakah PinjamAja gratis?</p>
                      <p>A: Ya, mendaftar dan menggunakan platform kami sepenuhnya gratis.</p>
                    </div>
                    <div>
                      <p className="font-semibold">Q: Bagaimana cara pembayaran?</p>
                      <p>A: Pembayaran dilakukan langsung antara peminjam dan pemilik barang saat bertemu.</p>
                    </div>
                    <div>
                      <p className="font-semibold">Q: Apakah ada jaminan keamanan?</p>
                      <p>A: Kami menyarankan bertemu di tempat umum dan memeriksa identitas kedua belah pihak.</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="kebijakan-privasi" data-testid="kebijakan-privasi-accordion">
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-semibold">Kebijakan Privasi</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-gray-700 pt-2">
                    <p>Kami sangat menghargai privasi Anda. Data pribadi Anda disimpan dengan aman dan tidak akan dibagikan kepada pihak ketiga tanpa izin Anda. Kami hanya menggunakan informasi Anda untuk meningkatkan layanan platform.</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="syarat-ketentuan" data-testid="syarat-ketentuan-accordion">
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-semibold">Syarat & Ketentuan</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-gray-700 space-y-2 pt-2">
                    <p>1. Pengguna harus berusia minimal 17 tahun</p>
                    <p>2. Informasi yang diberikan harus akurat dan benar</p>
                    <p>3. Dilarang menyewakan barang ilegal atau berbahaya</p>
                    <p>4. Transaksi dilakukan atas tanggung jawab masing-masing pihak</p>
                    <p>5. PinjamAja tidak bertanggung jawab atas kerugian dalam transaksi</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const currentRoute = () => {
    const pathname = location.pathname;
    if (pathname === '/') return renderLandingPage();
    if (pathname === '/cari-barang') return renderCariBarang();
    if (pathname === '/item-detail') return renderItemDetail();
    if (pathname === '/sewakan-barang') return renderSewakanBarang();
    if (pathname === '/chat') return renderChat();
    if (pathname === '/wishlist') return renderWishlist();
    if (pathname === '/profil') return renderProfil();
    return renderLandingPage();
  };

  return (
    <div className="min-h-screen">
      {renderNavbar()}

      {isInitialLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <LoadingOverlay message="Memuat data..." />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ 
              duration: 0.2, 
              ease: [0.4, 0.0, 0.2, 1],
              opacity: { duration: 0.2 },
              y: { duration: 0.2 }
            }}
          >
            {currentRoute()}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Auth Modal with Framer Motion Animation */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
            className="fixed inset-0 bg-black flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
            onClick={() => {
              setShowAuthModal(false);
              setAuthForm({ email: '', username: '', password: '', confirmPassword: '' });
            }}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.4, 0.0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="space-y-1 pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-2xl font-bold">{authMode === 'login' ? 'Masuk' : 'Daftar Akun'}</CardTitle>
                    <button 
                      onClick={() => {
                        setShowAuthModal(false);
                        setAuthForm({ email: '', username: '', password: '', confirmPassword: '' });
                      }}
                      className="hover:bg-gray-100 rounded-full p-1 transition-colors"
                    >
                      <X size={20} className="text-gray-500" />
                    </button>
                  </div>
                  <CardDescription className="text-sm text-gray-600">
                    {authMode === 'login' 
                      ? 'Masukkan email dan password Anda untuk melanjutkan' 
                      : 'Buat akun baru untuk memulai menggunakan PinjamAja'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <form onSubmit={handleAuth} className="space-y-4">
                    {/* Email Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <Input
                        type="email"
                        placeholder="nama@email.com"
                        value={authForm.email}
                        onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                        required
                        className="w-full h-11"
                      />
                    </div>

                    {/* Username Field (Register only) */}
                    {authMode === 'register' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Username</label>
                        <Input
                          placeholder="username_anda"
                          value={authForm.username}
                          onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                          required
                          className="w-full h-11"
                        />
                      </div>
                    )}

                    {/* Password Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Password</label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={authForm.password}
                        onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                        required
                        className="w-full h-11"
                      />
                    </div>

                    {/* Confirm Password Field (Register only) */}
                    {authMode === 'register' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Konfirmasi Password</label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={authForm.confirmPassword}
                          onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                          required
                          className="w-full h-11"
                        />
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2">
                      <Button 
                        type="submit" 
                        disabled={isAuthLoading} 
                        style={{ backgroundColor: '#245EDE' }} 
                        className="text-white w-full h-11 text-base font-semibold hover:opacity-90 transition-opacity"
                      >
                        {isAuthLoading && <ButtonSpinner />}
                        {authMode === 'login' ? 'Masuk' : 'Daftar'}
                      </Button>
                    </div>

                    {/* Toggle between Login/Register */}
                    <div className="text-center text-sm pt-2 border-t border-gray-200 mt-4 pt-4">
                      {authMode === 'login' ? (
                        <p className="text-gray-600">
                          Belum punya akun?{' '}
                          <button 
                            type="button" 
                            onClick={() => setAuthMode('register')} 
                            style={{ color: '#245EDE' }} 
                            className="font-semibold hover:underline transition-all"
                          >
                            Daftar sekarang
                          </button>
                        </p>
                      ) : (
                        <p className="text-gray-600">
                          Sudah punya akun?{' '}
                          <button 
                            type="button" 
                            onClick={() => setAuthMode('login')} 
                            style={{ color: '#245EDE' }} 
                            className="font-semibold hover:underline transition-all"
                          >
                            Masuk
                          </button>
                        </p>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feature Modal with Framer Motion */}
      <AnimatePresence>
        {showFeatureModal && (
          <motion.div 
            className="fixed inset-0 bg-black flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
            onClick={() => setShowFeatureModal(false)}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.4, 0.0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-full max-w-2xl">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{featureModalContent.title}</CardTitle>
                    <button onClick={() => setShowFeatureModal(false)}>
                      <X size={24} />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-gray-700">{featureModalContent.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal with Framer Motion */}
      <AnimatePresence>
        {showEditProfile && (
          <motion.div 
            className="fixed inset-0 bg-black flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
            onClick={() => setShowEditProfile(false)}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.4, 0.0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-full max-w-md">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Edit Profil</CardTitle>
                    <button onClick={() => setShowEditProfile(false)}>
                      <X size={24} />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="px-8 py-6">
                  <form onSubmit={handleUpdateProfile} className="space-y-5 max-w-full">
                    <div>
                      <label className="block text-sm font-medium mb-2">Username</label>
                      <Input
                        value={profileForm.username}
                        onChange={(e) => setProfileForm({ username: e.target.value })}
                        required
                        className="w-full"
                      />
                    </div>
                    <Button type="submit" disabled={isUpdatingProfile} style={{ backgroundColor: '#245EDE' }} className="text-white w-full flex items-center justify-center">
                      {isUpdatingProfile && <ButtonSpinner />}
                      Simpan Perubahan
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Password Modal with Framer Motion */}
      <AnimatePresence>
        {showEditPassword && (
          <motion.div 
            className="fixed inset-0 bg-black flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
            onClick={() => setShowEditPassword(false)}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.4, 0.0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-full max-w-md">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Edit Password</CardTitle>
                    <button onClick={() => setShowEditPassword(false)}>
                      <X size={24} />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="px-8 py-6">
                  <form onSubmit={handleUpdatePassword} className="space-y-5 max-w-full">
                    <div>
                      <label className="block text-sm font-medium mb-2">Password Lama</label>
                      <Input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        required
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Password Baru</label>
                      <Input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        required
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Konfirmasi Password Baru</label>
                      <Input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        required
                        className="w-full"
                      />
                    </div>
                    <Button type="submit" disabled={isUpdatingPassword} style={{ backgroundColor: '#245EDE' }} className="text-white w-full flex items-center justify-center">
                      {isUpdatingPassword && <ButtonSpinner />}
                      Ubah Password
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Item Modal with Framer Motion Animation */}
      <AnimatePresence>
        {showAddItemForm && (
          <motion.div 
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
            onClick={() => setShowAddItemForm(false)}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.4, 0.0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl"
            >
              <Card className="w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Tambah Barang Baru</CardTitle>
                <button onClick={() => setShowAddItemForm(false)}>
                  <X size={24} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddItem} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Foto Barang</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    {itemForm.image ? (
                      <div className="relative">
                        <img src={itemForm.image} alt="Preview" className="max-h-64 mx-auto rounded" />
                        <Button type="button" onClick={() => setItemForm({ ...itemForm, image: '' })} variant="outline" className="mt-4">
                          Ganti Foto
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <Camera size={48} className="mx-auto mb-4 text-gray-400" />
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="max-w-xs mx-auto"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Judul Barang *</label>
                  <Input
                    value={itemForm.title}
                    onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                    placeholder="Contoh: Kamera DSLR Canon EOS 80D"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Deskripsi *</label>
                  <Textarea
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    placeholder="Jelaskan kondisi dan spesifikasi barang Anda"
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Harga Sewa (Rp) *</label>
                    <Input
                      type="number"
                      value={itemForm.price}
                      onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                      placeholder="50000"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Per *</label>
                    <select
                      value={itemForm.priceUnit}
                      onChange={(e) => setItemForm({ ...itemForm, priceUnit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="menit">Menit</option>
                      <option value="jam">Jam</option>
                      <option value="hari">Hari</option>
                      <option value="minggu">Minggu</option>
                      <option value="bulan">Bulan</option>
                      <option value="tahun">Tahun</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Lokasi *</label>
                  <Input
                    value={itemForm.location}
                    onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })}
                    placeholder="Contoh: Jakarta Selatan"
                    required
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={handleCancelAddItem}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={isAddingItem} style={{ backgroundColor: '#245EDE' }} className="text-white flex-1 flex items-center justify-center">
                    {isAddingItem && <ButtonSpinner />}
                    Upload Barang
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Item Modal with Framer Motion Animation */}
      <AnimatePresence>
        {showEditItemForm && (
          <motion.div 
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
            onClick={() => {
              if (!isEditingItem) {
                setShowEditItemForm(false);
                setEditingItem(null);
              }
            }}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.4, 0.0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl"
            >
              <Card className="w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Edit Barang</CardTitle>
                <button 
                  onClick={() => {
                    if (!isEditingItem) {
                      setShowEditItemForm(false);
                      setEditingItem(null);
                    }
                  }}
                  disabled={isEditingItem}
                  className={isEditingItem ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  <X size={24} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEditItem} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Foto Barang</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    {itemForm.image ? (
                      <div className="relative">
                        <img src={itemForm.image} alt="Preview" className="max-h-64 mx-auto rounded" />
                        <Button type="button" onClick={() => setItemForm({ ...itemForm, image: '' })} variant="outline" className="mt-4">
                          Ganti Foto
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <Camera size={48} className="mx-auto mb-4 text-gray-400" />
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="max-w-xs mx-auto"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Judul Barang *</label>
                  <Input
                    value={itemForm.title}
                    onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                    placeholder="Contoh: Kamera DSLR Canon EOS 80D"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Deskripsi *</label>
                  <Textarea
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    placeholder="Jelaskan kondisi dan spesifikasi barang Anda"
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Harga Sewa (Rp) *</label>
                    <Input
                      type="number"
                      value={itemForm.price}
                      onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                      placeholder="50000"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Per *</label>
                    <select
                      value={itemForm.priceUnit}
                      onChange={(e) => setItemForm({ ...itemForm, priceUnit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="menit">Menit</option>
                      <option value="jam">Jam</option>
                      <option value="hari">Hari</option>
                      <option value="minggu">Minggu</option>
                      <option value="bulan">Bulan</option>
                      <option value="tahun">Tahun</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Lokasi *</label>
                  <Input
                    value={itemForm.location}
                    onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })}
                    placeholder="Contoh: Jakarta Selatan"
                    required
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => {
                      if (!isEditingItem) {
                        setShowEditItemForm(false);
                        setEditingItem(null);
                      }
                    }}
                    disabled={isEditingItem}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={isEditingItem} style={{ backgroundColor: '#245EDE' }} className="text-white flex-1 flex items-center justify-center gap-2">
                    {isEditingItem && <ButtonSpinner />}
                    {isEditingItem ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manage Item Modal */}
      <AnimatePresence>
        {showManageItemModal && managingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowManageItemModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-lg shadow-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-gray-200 p-6 relative">
                <button
                  onClick={() => setShowManageItemModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
                <h2 className="text-xl font-semibold text-gray-800 pr-8 text-center">
                  Kelola barang {managingItem.title} ?
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="p-6 space-y-3">
                {/* Toggle Status Button */}
                <Button
                  onClick={() => {
                    handleToggleStatus(managingItem.id, managingItem.status);
                    setShowManageItemModal(false);
                  }}
                  variant="outline"
                  className="w-full justify-center hover:bg-gray-50 border-gray-300 transition-all duration-200"
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${
                      managingItem.status === 'tersedia' ? 'bg-gray-100' : 'bg-green-100'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        managingItem.status === 'tersedia' ? 'bg-gray-600' : 'bg-green-600'
                      }`}></div>
                    </div>
                    <span className="font-medium text-gray-700">
                      {managingItem.status === 'tersedia' ? 'Tandai Tidak Tersedia' : 'Tandai Tersedia'}
                    </span>
                  </div>
                </Button>

                {/* Edit Button */}
                <Button
                  onClick={() => {
                    handleOpenEditItem(managingItem);
                    setShowManageItemModal(false);
                  }}
                  variant="outline"
                  className="w-full justify-center hover:bg-gray-50 border-gray-300 transition-all duration-200"
                >
                  <Edit size={18} className="mr-3 text-gray-600" />
                  <span className="font-medium text-gray-700">Edit Barang</span>
                </Button>

                {/* Delete Button */}
                <Button
                  onClick={() => {
                    handleOpenDeleteDialog(managingItem);
                    setShowManageItemModal(false);
                  }}
                  className="w-full justify-center bg-red-500 hover:bg-red-600 text-white border-none transition-all duration-200"
                >
                  <Trash2 size={18} className="mr-3" />
                  <span className="font-medium">Hapus Barang</span>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Barang "{itemToDelete?.title}" akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteItem} 
              style={{ backgroundColor: '#dc2626' }}
              className="hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin keluar dari akun Anda?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tidak</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogout} 
              style={{ backgroundColor: '#245EDE' }}
              className="hover:opacity-90"
            >
              Ya, Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Chat Bubble Notification */}
      {showChatNotification && latestNotification && currentPage !== 'chat' && (
        <div 
          className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300"
          onClick={() => {
            // Navigate to the chat
            const chat = chats.find(c => c.id === latestNotification.chatId);
            if (chat) {
              setSelectedChat(chat);
              navigateTo('chat');
              markChatAsRead(chat.id);
            }
            setShowChatNotification(false);
          }}
        >
          <Card className="w-80 cursor-pointer hover:shadow-2xl transition-all border-2 shadow-xl" style={{ borderColor: '#245EDE' }}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#245EDE' }}>
                  <MessageSquare size={24} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-sm truncate" style={{ color: '#245EDE' }}>
                      {latestNotification.senderName}
                    </p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowChatNotification(false);
                      }}
                      className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-2 truncate">{latestNotification.itemTitle}</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{latestNotification.message}</p>
                  <p className="text-xs text-gray-400 mt-2">Klik untuk lihat</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toast Notifications */}
      <Toaster 
        position="top-center" 
        richColors 
        theme="light" 
        closeButton={false}
        duration={3000}
      />
    </div>
  );
}