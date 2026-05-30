const Footer = () => {
    return (
      <footer className="bg-gray-900 text-gray-300 py-6 mt-10 text-center">
        <p className="text-lg">&copy; {new Date().getFullYear()} Weather Alert System. All rights reserved.</p>
        <p className="text-sm">Powered by OpenWeather API </p>
        <div className="flex justify-center space-x-6 mt-4">
          <a href="#" className="hover:text-white">Privacy Policy</a>
          <a href="#" className="hover:text-white">Terms of Service</a>
          <a href="#" className="hover:text-white">Contact Us</a>
        </div>
      </footer>
    );
  };
  
  export default Footer;
  
