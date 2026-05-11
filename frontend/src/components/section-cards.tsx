import { TrendingUpIcon, TrendingDownIcon, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  description: string;
  value: string | number;
  actionLabel?: string;
  isUp?: boolean;
  footerLabel: string;
  footerDescription: string;
  icon?: LucideIcon;
}

interface SectionCardsProps {
  cards: StatCardProps[];
}

export function SectionCards({ cards }: SectionCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div 
          key={index} 
          className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900/40 backdrop-blur-xl p-8 text-white shadow-2xl transition-all border border-white/5 group hover:bg-zinc-800/40"
        >
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{card.description}</span>
            <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
              card.actionLabel === 'Healthy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              card.actionLabel === 'Synced' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
              card.actionLabel === 'Active' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
              'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}>
              <div className="size-1 rounded-full bg-current animate-pulse" />
              {card.actionLabel}
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-5xl font-black tracking-tightest text-[#ff7800]">
              {card.value}
            </h3>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              {card.footerLabel}
              <TrendingUpIcon className={`size-3 text-[#ff7800]`} />
            </div>
            <p className="text-[11px] font-bold text-zinc-600 leading-relaxed uppercase tracking-widest">
              {card.footerDescription}
            </p>
          </div>
          
          {/* Subtle orange glow at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#ff7800]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -right-4 -bottom-4 size-32 bg-[#ff7800]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#ff7800]/10 transition-colors" />
        </div>
      ))}
    </div>
  )
}
