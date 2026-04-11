import { BorderRotate } from "./animated-gradient-border";
import { Star, Zap, Shield, Heart, Download, Play, Settings, User, Mail, Phone } from "lucide-react";

function Default() {
  return (
    <BorderRotate className="w-96 h-64">
      <div className="w-full h-full flex items-center justify-center text-content-tertiary font-mono text-xs italic">
        Basic Placeholder
      </div>
    </BorderRotate>
  );
}

function CustomColor() {
  return (
    <BorderRotate
      gradientColors={{
        primary: '#0f172a',
        secondary: '#1e40af', 
        accent: '#60a5fa'
      }}
      backgroundColor="#1e1b4b"
      className="p-6"
    >
      <div className="text-white text-center space-y-4">
        <div className="flex justify-center mb-4">
          <Zap className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2 italic">Lightning Fast</h3>
        <p className="text-gray-300 mb-4 text-xs font-mono">Blue gradient theme with high contrast</p>
        <div className="flex gap-2 justify-center items-center">
          <Play className="w-5 h-5" />
          <button className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-all transform hover:scale-105">
            Launch Now
          </button>
          <Settings className="w-5 h-5 ml-2 cursor-pointer hover:rotate-90 transition-transform" />
        </div>
      </div>
    </BorderRotate>
  );
}

function FastAnimation() {
  return (
    <BorderRotate
      animationSpeed={1}
      gradientColors={{
        primary: '#7f1d1d',
        secondary: '#dc2626',
        accent: '#f87171'
      }}
      backgroundColor="#1a0505"
      className="p-6"
    >
      <div className="text-white text-center space-y-4">
        <div className="flex justify-center mb-4">
          <Shield className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2 italic">Security First</h3>
        <p className="text-gray-300 mb-4 text-xs font-mono">1s rotation speed with vivid red theme</p>
        <div className="grid grid-cols-2 gap-3">
          <button className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded-sm transition-colors text-[10px] font-bold uppercase tracking-widest">
            <Shield className="w-4 h-4 inline mr-1" />
            Secure
          </button>
          <button className="px-3 py-2 border border-red-400 hover:border-red-300 rounded-sm transition-colors text-[10px] font-bold uppercase tracking-widest">
            <Download className="w-4 h-4 inline mr-1" />
            Install
          </button>
        </div>
      </div>
    </BorderRotate>
  );
}

function HoverToRotate() {
  return (
    <BorderRotate
      animationMode="rotate-on-hover"
      gradientColors={{
        primary: '#064e3b',
        secondary: '#059669',
        accent: '#34d399'
      }}
      backgroundColor="#062016"
      className="p-6"
    >
      <div className="text-white text-center space-y-4">
        <div className="flex justify-center mb-4">
          <Heart className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2 italic">Eco Movement</h3>
        <p className="text-gray-300 mb-4 text-xs font-mono">Animation starts on hover - green theme</p>
        <div className="flex flex-col gap-2">
          <button className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-sm transition-all text-[10px] font-bold uppercase tracking-widest">
            <Heart className="w-4 h-4 inline mr-2" />
            Join Now
          </button>
          <div className="flex gap-2 justify-center">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
          </div>
        </div>
      </div>
    </BorderRotate>
  );
}

function StopOnHover() {
  return (
    <BorderRotate
      animationMode="stop-rotate-on-hover"
      gradientColors={{
        primary: '#581c87',
        secondary: '#7c3aed',
        accent: '#a855f7'
      }}
      backgroundColor="#1a0b2e"
      className="p-6"
    >
      <div className="text-white text-center space-y-4">
        <div className="flex justify-center mb-4">
          <User className="w-8 h-8 text-purple-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2 italic">User Identity</h3>
        <p className="text-gray-300 mb-4 text-xs font-mono">Animation pauses on hover - purple theme</p>
        <div className="space-y-3">
          <div className="flex gap-2 justify-center">
            <button className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-sm transition-colors text-[10px] font-bold uppercase tracking-widest">
              <Mail className="w-4 h-4 inline mr-1" />
              Message
            </button>
            <button className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-sm transition-colors text-[10px] font-bold uppercase tracking-widest">
              <Phone className="w-4 h-4 inline mr-1" />
              Call
            </button>
          </div>
          <div className="text-[10px] font-mono text-purple-300 tracking-wider">
            PREMIUM MEMBER — 2026
          </div>
        </div>
      </div>
    </BorderRotate>
  );
}

export {
  Default,
  CustomColor,
  FastAnimation,
  HoverToRotate,
  StopOnHover
};
