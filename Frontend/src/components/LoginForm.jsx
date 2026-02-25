import { Eye } from "lucide-react";

const LoginForm = () => {
  return (
    <div className="max-w-md w-full">
      <h2 className="text-[28px] font-semibold text-gray-800">
        Log In
      </h2>
      <p className="text-[14px] text-gray-500 mt-2">
        Enter your details to access your workspace.
      </p>

      <div className="mt-10 space-y-6">
        {/* Username */}
        <div>
          <label className="text-[14px] text-gray-600">
            Username or Email
          </label>
          <input
            type="text"
            placeholder="Enter your username"
            className="mt-2 w-full h-[50px] px-4 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Password */}
        <div>
          <label className="text-[14px] text-gray-600">
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            className="mt-2 w-full h-[50px] px-4 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Remember + Forgot */}
        <div className="flex justify-between items-center text-[14px] mt-2">
          <label className="flex items-center gap-2 text-gray-600">
            <input type="checkbox" />
            Remember me
          </label>

          <a href="#" className="text-blue-600 font-medium">
            Forgot Password?
          </a>
        </div>

        {/* Button */}
        <button className="w-full h-[52px] mt-4 bg-blue-600 text-white rounded-lg font-medium shadow-md hover:bg-blue-700 transition">
          Log In →
        </button>
      </div>
    </div>
  );
};

export default LoginForm;