import React, { useEffect, useState } from "react";
import axios from "axios";
import WeatherCard from "./WeatherCard";
import WeatherSafety from './WeatherSafety';
import ChatBox from './ChatBox';
import { debounce } from 'lodash'; // Add this import at the top
import SunriseSunset from './Sunrisesunset';

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const defaultCities = ["Hyderabad", "Mumbai", "Delhi", "Bangalore"];

// Add this utility function after the imports
const formatLocationName = (suggestion) => {
  const parts = suggestion.display_name.split(', ');
  const city = parts[0];
  const country = parts[parts.length - 1];
  const state = parts[parts.length - 2];
  return {
    cityName: city,
    fullName: `${city}, ${state}, ${country}`
  };
};

const Hero = () => {
  const [weatherData, setWeatherData] = useState([]);
  const [location, setLocation] = useState("");
  const [searchWeather, setSearchWeather] = useState(null);
  const [error, setError] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLocation, setSearchLocation] = useState("");

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const promises = defaultCities.map((city) =>
          axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
          )
        );

        const responses = await Promise.all(promises);
        const data = responses.map((res) => ({
          name: res.data.name,
          temp: Math.round(res.data.main.temp),
          condition: res.data.weather[0].main,
        }));

        setWeatherData(data);
      } catch (error) {
        console.error("Error fetching weather data:", error);
      }
    };

    fetchWeather();
  }, []);

  const handleSearch = async (searchLocation = location) => {
    if (!searchLocation) {
        setError("Please enter a location");
        return;
    }
    try {
        setError("");
        if (!API_KEY) {
            throw new Error("API key not configured");
        }
        const res = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${searchLocation}&appid=${API_KEY}&units=metric`
        );
        
        if (!res.data) {
            throw new Error("No data received from weather API");
        }

        const weatherInfo = {
            city: res.data.name,
            temp: Math.round(res.data.main.temp),
            condition: res.data.weather[0].main,
            humidity: res.data.main.humidity,
            wind: res.data.wind.speed,
            description: res.data.weather[0].description,
            icon: res.data.weather[0].icon
        };
        
        setSearchWeather(weatherInfo);
        setSearchLocation(res.data.name);
    } catch (error) {
        console.error("Search error:", error);
        setError(
            error.response?.status === 404 
                ? "Location not found. Please check the city name and try again."
                : "Error fetching weather data.Please try again later."
        );
    }
};

  // Replace the existing fetchSuggestions with this improved version
  const fetchSuggestions = async (input) => {
    if (input.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await axios.get(
        'https://nominatim.openstreetmap.org/search', {
          params: {
            format: 'json',
            q: input,
            limit: 5,
            addressdetails: 1,
            featuretype: 'city',
            'accept-language': 'en'
          }
        }
      );

      // Filter and format suggestions
      const formattedSuggestions = response.data
        .filter(item => item.type === 'city' || item.type === 'administrative')
        .map(item => ({
          ...item,
          formattedName: formatLocationName(item)
        }));

      setSuggestions(formattedSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    }
  };

  // Add debounced version of fetchSuggestions
  const debouncedFetchSuggestions = debounce(fetchSuggestions, 300);

  // Update handleLocationChange
  const handleLocationChange = (e) => {
    const value = e.target.value;
    setLocation(value);
    debouncedFetchSuggestions(value);
  };

  // Update handleSelectSuggestion
  const handleSelectSuggestion = (suggestion) => {
    const locationName = suggestion.formattedName.cityName;
    setLocation(locationName);
    setSuggestions([]);
    setShowSuggestions(false);
    handleSearch(locationName);
  };

  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 bg-gray-100">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
          Get Real-Time Weather Alerts
        </h2>
        <p className="text-xl text-gray-700 mb-12">
          Stay updated on rain and climate changes in real-time
        </p>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-16">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="Enter location..."
              value={location}
              onChange={handleLocationChange}
              onFocus={() => setShowSuggestions(true)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                  setShowSuggestions(false);
                }
              }}
              className="w-full px-5 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
            <button
              onClick={() => {
                handleSearch(location);
                setShowSuggestions(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-lg transition-all"
            >
              🔍
            </button>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors 
                     first:rounded-t-lg last:rounded-b-lg border-b last:border-b-0 border-gray-200"
                  >
                    <div className="text-gray-900 font-medium">
                      {suggestion.formattedName.cityName}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {suggestion.formattedName.fullName}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              handleSearch(location);
              setShowSuggestions(false);
            }}
            className="w-full md:w-auto px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Search Weather
          </button>
        </div>
        {error && (
          <div className="text-red-500 mb-4">
            {error}
          </div>
        )}

        {searchWeather && (
          <>
            <div className="bg-white p-6 rounded-xl border border-gray-300 shadow-lg mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{searchWeather.city}</h3>
              <p className="text-3xl font-bold text-gray-900">{searchWeather.temp}°C</p>
              <p className="text-gray-700 mt-2">{searchWeather.condition}</p>
              <p className="text-gray-700 mt-2">Humidity: {searchWeather.humidity}%</p>
              <p className="text-gray-700 mt-2">Wind: {searchWeather.wind} m/s</p>
            </div>

          </>
        )}
<WeatherSafety searchLocation={searchWeather ? searchWeather.city : "Hyderabad"} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {weatherData.length > 0 ? (
            weatherData.map((city, index) => (
              <WeatherCard key={index} weather={city} />
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <div className="animate-pulse text-gray-500">Loading weather data...</div>
            </div>
          )}
        </div>

        <SunriseSunset location={searchWeather ? searchWeather.city : "Hyderabad"} />
      </div>

      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed right-6 bottom-6 p-4 bg-green-500 text-white rounded-full shadow-lg 
                 hover:bg-green-600 transition-all duration-300 transform hover:scale-110
                 focus:outline-none focus:ring-2 focus:ring-green-500/50 z-40"
        aria-label="Open chat"
      >
        <div className="flex items-center">
          <span className="text-xl mr-2">🌦</span>
          <span className="hidden md:inline">Ask Nimbus</span>
        </div>
      </button>

      {isChatOpen && <ChatBox onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};

export default Hero;
