// src/pages/Login.jsx or src/components/Login.jsx

import React, { useState } from "react";
import "./index.css"; // Ensure you have Tailwind CSS set up
import { MagicCard } from "./MagicCard";
import axios from "axios"; // Ensure you have axios installed for API calls
import { useNavigate } from "react-router-dom";
import './App.css'; // Ensure you have your CSS file for styles

const Login = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  // Example using a hypothetical AuthContext
  // const { login } = useAuth();
  // ---------------------------------------------------------------------------

  const handleLogin = async (event) => {
    event.preventDefault(); // Prevent default form submission (page reload)
    setError(null); // Clear previous errors
    setIsLoading(true);
    // --- !! THIS IS WHERE YOU CALL YOUR BACKEND API !!! ---
    try {
      console.log("Attempting login with:", { name, password });

      // **Simulate API Call** (Replace with actual fetch/axios call)

      const responce = await axios.post("http://100.68.6.110:3001/api/login", {
        password: password,
      }); // Simulate network delay
      const token = responce.data.token; // Simulate token from response
      const userDate = responce.data.decodedToken; // Simulate token from response

      localStorage.setItem("authToken", token); // Replace with actual token
      localStorage.setItem("user", JSON.stringify(userDate)); // Replace with actual user data

      navigate("/ledger");
      // Redirect to home page after successful login
    } catch (err) {
      // Removed type annotation ': any'
      alert(err.message || "An unexpected error occurred. Please try again.");

      setPassword("");

      setError(
        err.message || "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsLoading(false); // Ensure loading state is turned off
    }
  };

  return (
    <div
      className="flex items-center flex-row h-lvh justify-center min-h-screen bg-gray-100 dark:bg-gray-900"
      // style={{ width: "15%" }}
    >
      <MagicCard className="w-1/3 h-1/2 max-w-md  rounded-[2rem] border-1 shadow-xl dark:bg-gray-800">
        <h2 className="text-2xl font-bold text-center p-8 mb-6 text-gray-800 dark:text-white">
          Login
        </h2>{" "}
        {/* Removed bg-pink-500 for better theme compatibility */}
        <form className="space-y-4 p-[1rem] flex items-center justify-center flex-col" onSubmit={handleLogin}>
          <div>
            <input
              id="password"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full h-[2rem] rounded-md border-1 outline-0 border-gray-300 dark:border-gray-600 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={isLoading} // Disable input while loading
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            className={`w-1/4 rounded-[6px] mt-[1rem] text-center h-[2rem] py-2 text-white transition ${
              isLoading
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
            disabled={isLoading} // Disable button while loading
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </MagicCard>
    </div>
  );
};

export default Login;
