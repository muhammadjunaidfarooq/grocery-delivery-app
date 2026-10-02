import React from "react";
import Link from "next/link";
import { ShieldAlert, Home } from "lucide-react";

const Unauthorized = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
        {/* Icon Section */}
        <div className="flex justify-center">
          <div className="bg-red-50 p-4 rounded-full">
            <ShieldAlert className="w-16 h-16 text-red-500" />
          </div>
        </div>

        {/* Text Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Access Denied
          </h1>
          <p className="text-gray-500 text-lg">
            Sorry, you don&apos;t have the required permissions to view this page.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 text-white bg-gray-900 hover:bg-gray-800 font-medium rounded-xl transition-all duration-200 shadow-lg shadow-gray-200"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        {/* Support Link */}
        <p className="text-sm text-gray-400 pt-2">
          If you think this is a mistake, please contact your administrator.
        </p>
      </div>
    </div>
  );
};

export default Unauthorized;
