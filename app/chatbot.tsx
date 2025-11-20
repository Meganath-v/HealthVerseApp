// screens/HealthVerseBot.tsx - Real-Time AI Health Chatbot with OpenRouter
import { FontAwesome5 } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import * as Animatable from 'react-native-animatable';

import { getAuth } from 'firebase/auth';
import {
    addDoc,
    collection,
    getFirestore,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    where
} from 'firebase/firestore';

/* ───────────── Types ───────────── */
interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: any;
  userId: string;
  messageType?: 'text' | 'streaming';
}

interface HealthTopic {
  id: string;
  title: string;
  icon: string;
  description: string;
  category: 'general' | 'exercise' | 'nutrition' | 'mental' | 'emergency';
}

const HEALTH_TOPICS: HealthTopic[] = [
  {
    id: '1',
    title: 'Exercise Routines',
    icon: '🏃‍♂️',
    description: 'Get personalized workout plans and fitness tips',
    category: 'exercise'
  },
  {
    id: '2',
    title: 'Nutrition Guide',
    icon: '🥗',
    description: 'Healthy meal plans and dietary advice',
    category: 'nutrition'
  },
  {
    id: '3',
    title: 'Mental Wellness',
    icon: '🧘‍♀️',
    description: 'Stress management and mindfulness tips',
    category: 'mental'
  },
  {
    id: '4',
    title: 'General Health',
    icon: '💊',
    description: 'Common health questions and symptoms',
    category: 'general'
  },
  {
    id: '5',
    title: 'Emergency Info',
    icon: '🚨',
    description: 'First aid and emergency responses',
    category: 'emergency'
  },
];

// OpenRouter API Configuration - Free DeepSeek Access
const OPENROUTER_API_KEY = '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'; // Your OpenRouter API Key
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const FREE_DEEPSEEK_MODEL = 'deepseek/deepseek-r1:free';

// Health-focused system prompt for DeepSeek
const HEALTH_SYSTEM_PROMPT = `You are HealthVerse Bot, an AI health and wellness assistant powered by DeepSeek. You provide helpful, accurate, and supportive information about:

- Exercise routines and fitness tips
- Nutrition and healthy eating habits
- Mental wellness and stress management
- General health information and common symptoms
- Sleep improvement and wellness routines
- Preventive healthcare advice

Guidelines:
- Always include appropriate medical disclaimers when discussing health issues
- Provide practical, actionable advice
- Be encouraging and supportive
- Keep responses informative but not overly technical
- For serious symptoms or concerns, always recommend consulting healthcare professionals
- Focus on evidence-based health information
- Be conversational and friendly
- Use emojis appropriately to make responses engaging
- Format responses with clear sections and bullet points when helpful

Remember: You are not a replacement for professional medical advice, diagnosis, or treatment. Always encourage users to consult healthcare professionals for serious concerns.`;

// OpenRouter DeepSeek API Integration
const getOpenRouterDeepSeekResponse = async (userMessage: string) => {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://healthverse.app',
      'X-Title': 'HealthVerse Bot',
    },
    body: JSON.stringify({
      model: FREE_DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: HEALTH_SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter Error Response:', errorText);
    throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('OpenRouter Success Response:', data);
  
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  } else {
    throw new Error('Invalid response format from OpenRouter API');
  }
};

// Main AI Response Function
const getDeepSeekResponse = async (userMessage: string) => {
  try {
    console.log('Sending request to OpenRouter DeepSeek...');
    return await getOpenRouterDeepSeekResponse(userMessage);
  } catch (error) {
    console.error('DeepSeek API Error:', error);
    
    // Provide specific error messages
    if (error.message.includes('401')) {
      return "⚠️ **API Authentication Error**: There's an issue with the OpenRouter API key. Please check the configuration.\n\nI can still provide basic health guidance while this is being resolved! 🤖💙";
    } else if (error.message.includes('429')) {
      return "⚠️ **Rate Limit Reached**: Too many requests to the AI service. Please wait a moment and try again.\n\nI'm here to help with your health questions! 🤖💙";
    } else if (error.message.includes('402')) {
      return "⚠️ **Credit Limit**: The free usage limit has been reached. Please wait for the limit to reset or upgrade your plan.\n\nI can still help with basic health topics! 🤖💙";
    } else {
      return "I'm having trouble connecting to my AI services right now. Please try again in a moment, or feel free to ask me about general health topics! 🤖💙";
    }
  }
};

export default function HealthVerseBot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initializeChat();
    loadChatHistory();
  }, []);

  const initializeChat = () => {
    const welcomeMessage: ChatMessage = {
      id: '1',
      text: "👋 Hello! I'm HealthVerse Bot, your AI-powered health and wellness assistant powered by DeepSeek via OpenRouter!\n\nI can help you with personalized advice about:\n🏃‍♂️ Exercise and fitness routines\n🥗 Nutrition and meal planning\n🧘‍♀️ Mental wellness and stress management\n💊 General health questions\n😴 Sleep improvement tips\n🩺 Understanding symptoms (with medical disclaimers)\n\nWhat would you like to know about your health and wellness today?",
      isBot: true,
      timestamp: new Date(),
      userId: 'bot',
      messageType: 'text'
    };

    setMessages([welcomeMessage]);
  };

  const loadChatHistory = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) return;

      const firestore = getFirestore();
      const chatRef = collection(firestore, 'healthbot_chats');
      const q = query(
        chatRef, 
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const chatHistory: ChatMessage[] = [];
        querySnapshot.forEach((doc) => {
          chatHistory.push({ id: doc.id, ...doc.data() } as ChatMessage);
        });
        
        if (chatHistory.length > 0) {
          setMessages(prev => [...prev, ...chatHistory.reverse()]);
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const saveChatMessage = async (message: Omit<ChatMessage, 'id'>) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.log('No authenticated user found');
        return;
      }

      const firestore = getFirestore();
      const chatRef = collection(firestore, 'healthbot_chats');
      
      await addDoc(chatRef, {
        ...message,
        timestamp: serverTimestamp()
      });
      
      console.log('Chat message saved successfully');
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isBot: false,
      timestamp: new Date(),
      userId: 'user',
      messageType: 'text'
    };

    // Add user message
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setIsTyping(true);

    // Save user message
    await saveChatMessage(userMessage);

    try {
      // Get response from DeepSeek AI via OpenRouter
      const botResponse = await getDeepSeekResponse(currentInput);
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        isBot: true,
        timestamp: new Date(),
        userId: 'bot',
        messageType: 'text'
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);

      // Save bot message
      await saveChatMessage(botMessage);

      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('Error getting AI response:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm experiencing some technical difficulties with my AI services. Please try again in a moment! 🤖💙\n\nThe issue might be:\n• Temporary network connectivity\n• API service overload\n• Rate limit reached\n\nPlease wait a moment and try asking your health question again!",
        isBot: true,
        timestamp: new Date(),
        userId: 'bot',
        messageType: 'text'
      };

      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    }
  };

  const handleTopicPress = (topic: HealthTopic) => {
    let topicMessage = '';
    
    switch (topic.category) {
      case 'exercise':
        topicMessage = 'Can you create a personalized exercise routine for me based on my fitness level?';
        break;
      case 'nutrition':
        topicMessage = 'What are some healthy meal ideas and nutrition tips for my lifestyle?';
        break;
      case 'mental':
        topicMessage = 'How can I better manage stress and improve my mental wellness?';
        break;
      case 'general':
        topicMessage = 'I have some general health questions about symptoms and wellness';
        break;
      case 'emergency':
        topicMessage = 'What should I know about basic first aid and emergency responses?';
        break;
    }
    
    setInputText(topicMessage);
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => (
    <Animatable.View
      animation={item.isBot ? "slideInLeft" : "slideInRight"}
      delay={index * 100}
      style={[
        styles.messageContainer,
        item.isBot ? styles.botMessageContainer : styles.userMessageContainer
      ]}
    >
      {item.isBot && (
        <View style={styles.botAvatar}>
          <Text style={styles.botAvatarText}>🤖</Text>
        </View>
      )}
      
      <View style={[
        styles.messageBubble,
        item.isBot ? styles.botMessage : styles.userMessage
      ]}>
        <Text style={[
          styles.messageText,
          item.isBot ? styles.botMessageText : styles.userMessageText
        ]}>
          {item.text}
        </Text>
        <Text style={[
          styles.timestamp,
          item.isBot ? styles.botTimestamp : styles.userTimestamp
        ]}>
          {new Date(item.timestamp?.toDate?.() || item.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    </Animatable.View>
  );

  const renderTopicCard = ({ item }: { item: HealthTopic }) => (
    <TouchableOpacity
      style={styles.topicCard}
      onPress={() => handleTopicPress(item)}
      activeOpacity={0.8}
    >
      <Text style={styles.topicIcon}>{item.icon}</Text>
      <Text style={styles.topicTitle}>{item.title}</Text>
      <Text style={styles.topicDescription}>{item.description}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 50 : 60 }]}>
        <View style={styles.headerRow}>
          <View style={[styles.userImg, styles.userImgPlaceholder]}>
            <FontAwesome5 name="robot" size={32} color="#ffffff" />
          </View>

          <View style={styles.greeting}>
            <Text style={styles.greetingLine}>HealthVerse Bot</Text>
            <Text style={styles.userName}>Health Assistant</Text>
          </View>

          <View style={styles.statusIndicator}>
            <View style={styles.onlineIndicator} />
            <Text style={styles.statusText}>AI Online</Text>
          </View>
        </View>
      </View>

      {/* Health Topics */}
      <View style={styles.topicsContainer}>
        <Text style={styles.topicsTitle}>Quick Health Topics</Text>
        <FlatList
          data={HEALTH_TOPICS}
          renderItem={renderTopicCard}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topicsList}
        />
      </View>

      {/* Chat Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Typing Indicator */}
      {isTyping && (
        <Animatable.View 
          animation="fadeIn" 
          style={styles.typingContainer}
        >
          <View style={styles.botAvatar}>
            <Text style={styles.botAvatarText}>🤖</Text>
          </View>
          <View style={styles.typingBubble}>
            <Text style={styles.typingText}>HealthVerse Bot is thinking</Text>
            <ActivityIndicator size="small" color="#2563EB" style={styles.typingIndicator} />
          </View>
        </Animatable.View>
      )}

      {/* Input Section */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything about health and wellness..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={1000}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isTyping}
            activeOpacity={0.8}
          >
            <FontAwesome5 
              name="paper-plane" 
              size={16} 
              color={inputText.trim() ? "#ffffff" : "#9CA3AF"} 
            />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.disclaimer}>
          ⚠️ AI-powered health guidance by DeepSeek via OpenRouter. Always consult healthcare professionals for medical advice.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Header styles
  header: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#667eea',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 10,
  },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  userImg: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: 'rgba(255,255,255,0.2)' 
  },
  userImgPlaceholder: { 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  greeting: { 
    marginLeft: 15, 
    flex: 1 
  },
  greetingLine: { 
    fontSize: 16, 
    color: 'rgba(255,255,255,0.9)', 
    marginBottom: 4 
  },
  userName: { 
    fontSize: 22, 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  statusIndicator: {
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    marginBottom: 4,
  },
  statusText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },

  // Topics section
  topicsContainer: {
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  topicsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  topicsList: {
    paddingHorizontal: 15,
  },
  topicCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 5,
    width: 140,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  topicIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  topicTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  topicDescription: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 14,
  },

  // Chat container
  chatContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  chatContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },

  // Message styles
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
    flexDirection: 'row-reverse',
  },
  botAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  botAvatarText: {
    fontSize: 16,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  botMessage: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 8,
  },
  userMessage: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 8,
    marginLeft: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  botMessageText: {
    color: '#1F2937',
  },
  userMessageText: {
    color: '#ffffff',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
  },
  botTimestamp: {
    color: '#9CA3AF',
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },

  // Typing indicator
  typingContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  typingBubble: {
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    color: '#6B7280',
    fontSize: 14,
    fontStyle: 'italic',
  },
  typingIndicator: {
    marginLeft: 8,
  },

  // Input section
  inputContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: '#2563EB',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  disclaimer: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
