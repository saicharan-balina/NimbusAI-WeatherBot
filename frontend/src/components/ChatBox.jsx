import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Constants for configuration
const DEFAULT_LOCATION = 'Hyderabad';
const GENERAL_RESPONSES = {
  "hi": "Hello! 👋 Ask me about the weather in any city!",
  "hello": "Hi there! 🌞 How can I help you with weather today?",
  "hey": "Hey! ⛅ Need a weather update?",
  "what is your name": "I'm Nimbus AI! 👋 Your personal weather assistant!",
  "help": "You can ask me about weather, temperature, or activities in any city! 🌍",
  "who are you": "I'm Nimbus AI, your friendly weather assistant! 🌦️",
  "what can you do": "I can help you with weather updates, activity suggestions, and clothing recommendations based on weather! Just ask about any city. 🌍"
};

// Add model configuration
const MODEL_CONFIG = {
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.7,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
  ]
};

// Add these weather-related keywords at the top
const WEATHER_KEYWORDS = [
  "weather", "temperature", "rain", "sunny", "cloudy",
  "hot", "cold", "humid", "wind", "forecast"
];

const ChatBox = ({ onClose }) => {
  // Add ref for input and messages container
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  const [messages, setMessages] = useState([
    { text: "👋 Hello! I'm Nimbus AI, your intelligent weather assistant. How may I assist you today? ", sender: 'bot', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userName, setUserName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  // Add this new state for suggestions UI
  const [isSuggestionsMinimized, setIsSuggestionsMinimized] = useState(false);

  const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  const fetchWeather = async (location) => {
    try {
      const formattedLocation = encodeURIComponent(location);
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${formattedLocation}&appid=${OPENWEATHER_API_KEY}&units=metric`);
      const data = await res.json();
      if (data.cod !== 200) throw new Error(data.message);
      return data;
    } catch (error) {
      return { error: `Unable to fetch weather for ${location}. Please check the location and try again.` };
    }
  };

  // Update the extractLocation function
  const extractLocation = (query) => {
    const queryLower = query.toLowerCase();
    
    // Check if query contains weather-related keywords
    const hasWeatherKeyword = WEATHER_KEYWORDS.some(keyword => queryLower.includes(keyword));
    
    // Direct city mentions with improved detection
    const cities = {
      'mumbai': 'Mumbai',
      'delhi': 'Delhi',
      'hyderabad': 'Hyderabad',
      'bangalore': 'Bangalore',
      'bengaluru': 'Bangalore'
    };
  
    for (const [key, value] of Object.entries(cities)) {
      if (queryLower.includes(key)) return value;
    }
    
    // Enhanced regex patterns
    const patterns = [
      /(?:in|at|for)\s+([a-zA-Z\s]+?)(?:\?|\s|$)/i,
      /^([a-zA-Z\s]+?)(?:\?|\s|$)/i,
      /(?:weather|temperature|rain|wear|clothing)\s+(?:.*?)\s+(?:in|at)\s+([a-zA-Z\s]+?)(?:\?|\s|$)/i,
      /([a-zA-Z\s]+?)\s+(?:weather|temperature)/i
    ];
  
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const location = match[1].trim();
        if (location.length > 1 && !WEATHER_KEYWORDS.includes(location.toLowerCase())) {
          return location;
        }
      }
    }
  
    return hasWeatherKeyword ? localStorage.getItem('lastLocation') : null;
  };

  const generateGeminiResponse = async (query, weatherData = null) => {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      });

      const prompt = {
        contents: [{
          parts: [{
            text: `As Nimbus AI, provide a friendly weather response for: "${query}"
            Current weather in ${weatherData.name}:
            Temperature: ${Math.round(weatherData.main.temp)}°C
            Conditions: ${weatherData.weather[0].description}
            Wind: ${weatherData.wind.speed} m/s
            Humidity: ${weatherData.main.humidity}%

            Response Requirements:
            - Start with an emoji and friendly greeting
            - Keep response brief (2-3 sentences)
            - For outdoor activities: Consider temperature, wind, and conditions
            - For clothing: Suggest based on temperature and conditions
            - For rain questions: Check weather description
            - Always include one practical tip
            - End with a relevant emoji`
          }]
        }]
      };

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error('AI Response Error:', error);
      return "I'm having trouble analyzing the weather right now. Please try again! 🤔";
    }
  };

  // Update handleSend function to better handle weather queries
  const handleSend = async (e, suggestedPrompt = null) => {
    e.preventDefault();
    const textToSend = suggestedPrompt || input;
    if (!textToSend.trim() || isTyping) return;
  
    setIsTyping(true);
    setMessages(prev => [...prev, { 
      text: textToSend, 
      sender: 'user', 
      timestamp: new Date() 
    }]);
    setInput('');
  
    try {
      const queryLower = textToSend.toLowerCase();
      
      // Handle general queries first
      for (const key in GENERAL_RESPONSES) {
        if (queryLower.includes(key) && !WEATHER_KEYWORDS.some(word => queryLower.includes(word))) {
          setMessages(prev => [...prev, { 
            text: GENERAL_RESPONSES[key], 
            sender: 'bot', 
            timestamp: new Date() 
          }]);
          setIsTyping(false);
          return;
        }
      }
  
      // Handle weather queries
      const location = extractLocation(textToSend);
      if (!location && !localStorage.getItem('lastLocation')) {
        setMessages(prev => [...prev, { 
          text: "Could you please specify a city name? For example: 'Weather in Mumbai' or 'Delhi temperature' 🌍", 
          sender: 'bot', 
          timestamp: new Date() 
        }]);
        setIsTyping(false);
        return;
      }
  
      const weatherData = await fetchWeather(location || localStorage.getItem('lastLocation') || DEFAULT_LOCATION);
      if (weatherData.error) {
        throw new Error(weatherData.error);
      }
  
      const response = await generateGeminiResponse(textToSend, weatherData);
      localStorage.setItem('lastLocation', location || localStorage.getItem('lastLocation') || DEFAULT_LOCATION);
      
      setMessages(prev => [...prev, { 
        text: response, 
        sender: 'bot', 
        timestamp: new Date() 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        text: `⚠️ ${error.message || "I couldn't get the weather information. Please try another city."}`, 
        sender: 'bot', 
        timestamp: new Date(),
        isError: true 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Update the suggestedPrompts array
  const suggestedPrompts = [
    "What's the weather like in New York?",
    "Should I carry an umbrella in Bangalore today?",
    "How's the temperature in Mumbai right now?",
    "Was there rain in last 10 days in Hyderabad?",
    "Was there any storm in last 5 days in Kerala?",
    " outdoor activities in Hyderabad?"
  ];

  const handleSuggestedPrompt = async (prompt) => {
    if (isTyping) return;
    const syntheticEvent = { preventDefault: () => {} };
    await handleSend(syntheticEvent, prompt);
  };

  // Add useEffect for auto-focus and scroll
  useEffect(() => {
    inputRef.current?.focus();
    scrollToBottom();
    // Hide suggestions when there are more than 2 messages
    setShowSuggestions(messages.length <= 2);
  }, [messages]);

  // Update the scrollToBottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    });
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-lg shadow-2xl flex flex-col z-50 animate-fade-in">
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-white text-2xl">🌦️</span>
          <h3 className="text-white text-lg font-medium">Nimbus AI</h3>
        </div>
        <button 
          onClick={onClose} 
          className="text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-200"
        >
          ✕
        </button>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 p-4 overflow-y-auto scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    msg.sender === 'user'
                      ? 'bg-green-500 text-white rounded-br-none'
                      : 'bg-gray-100 rounded-bl-none'
                  } ${msg.isError ? 'bg-red-100 text-red-600' : ''}`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="animate-bounce">•</div>
                <div className="animate-bounce delay-100">•</div>
                <div className="animate-bounce delay-200">•</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Suggestions in a collapsible section */}
        {showSuggestions && (
          <div className={`suggestions-container transition-all duration-300 ${isSuggestionsMinimized ? 'h-12' : 'h-auto'}`}>
            <div className="sticky top-0 p-3 bg-gray-50 border-t border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">💡</span>
                <p className="text-gray-600 text-sm font-medium">Suggested Questions</p>
              </div>
              <button 
                onClick={() => setIsSuggestionsMinimized(!isSuggestionsMinimized)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                {isSuggestionsMinimized ? '↑' : '↓'}
              </button>
            </div>
            
            {!isSuggestionsMinimized && (
              <div className="p-3 bg-gray-50 suggestions-grid">
                {suggestedPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      handleSuggestedPrompt(prompt);
                      // Don't hide suggestions immediately, just minimize them
                      setIsSuggestionsMinimized(true);
                    }}
                    className="suggestion-button"
                  >
                    <span className="text-green-500 mr-2">•</span>
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleSend} className="p-4 border-t border-gray-100">
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about weather..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent disabled:opacity-50 placeholder-gray-400"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="px-6 py-3 bg-green-500 text-white rounded-lg transition-all duration-200 hover:bg-green-600 hover:shadow-lg disabled:opacity-50 disabled:hover:bg-green-500 flex items-center justify-center min-w-[80px]"
            >
              {isTyping ? (
                <span className="animate-spin">↻</span>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatBox;
