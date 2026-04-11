import { MenuItem, MenuContainer } from "./fluid-menu"
import { Menu as MenuIcon, X, Home, Mail, User, Settings, Calculator, Activity } from "lucide-react"

// A fluid circular menu that elegantly expands to reveal navigation items with smooth icon transitions
export function MenuDemo() {
  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-sans font-bold text-white uppercase italic tracking-tight">Fluid Navigation</h2>
        <p className="text-xs font-mono text-content-tertiary uppercase tracking-widest">Experimental Pulse Menu</p>
      </div>
      
      <div className="relative mt-4">
        <div className="absolute inset-0 bg-brand-indigo/5 blur-3xl -z-10 rounded-full" />
        <MenuContainer>
          <MenuItem 
            className="rounded-full !h-full"
            icon={
              <div className="relative w-6 h-6">
                <div className="absolute inset-0 transition-all duration-300 ease-in-out origin-center opacity-100 scale-100 rotate-0 [div[data-expanded=true]_&]:opacity-0 [div[data-expanded=true]_&]:scale-0 [div[data-expanded=true]_&]:rotate-180 flex items-center justify-center">
                  <MenuIcon size={24} strokeWidth={1.5} className="text-brand-indigo" />
                </div>
                <div className="absolute inset-0 transition-all duration-300 ease-in-out origin-center opacity-0 scale-0 -rotate-180 [div[data-expanded=true]_&]:opacity-100 [div[data-expanded=true]_&]:scale-100 [div[data-expanded=true]_&]:rotate-0 flex items-center justify-center">
                  <X size={24} strokeWidth={1.5} className="text-content-tertiary" />
                </div>
              </div>
            } 
          />
          <MenuItem className="rounded-full !h-full" icon={<Home size={22} strokeWidth={1.5} />} />
          <MenuItem className="rounded-full !h-full" icon={<Calculator size={22} strokeWidth={1.5} />} />
          <MenuItem className="rounded-full !h-full" icon={<Activity size={22} strokeWidth={1.5} />} />
          <MenuItem className="rounded-full !h-full" icon={<Settings size={22} strokeWidth={1.5} />} />
        </MenuContainer>
      </div>
    </div>
  )
}
