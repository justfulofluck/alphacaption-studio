import { TrendingUpIcon, TrendingDownIcon, LucideIcon } from "lucide-react"

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
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 px-4 lg:px-8">
      {cards.map((card, index) => (
        <div 
          key={index} 
          className="relative overflow-hidden rounded-[2rem] bg-zinc-900 p-8 text-white shadow-2xl transition-all hover:scale-[1.02] hover:bg-zinc-800"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{card.description}</span>
            <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black tracking-tighter ${card.isUp ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {card.isUp ? <TrendingUpIcon className="size-3" /> : <TrendingDownIcon className="size-3" />}
              {card.actionLabel}
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-4xl font-black tracking-tightest">
              {card.value}
            </h3>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-100 uppercase tracking-wide">
              {card.footerLabel}
              <TrendingUpIcon className={`size-3 ${card.isUp ? 'text-emerald-400' : 'text-red-400 rotate-180'}`} />
            </div>
            <p className="text-[11px] font-medium text-zinc-500 leading-relaxed">
              {card.footerDescription}
            </p>
          </div>
          
          {/* Subtle decoration */}
          <div className="absolute -right-4 -bottom-4 size-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        </div>
      ))}
    </div>
  )
}
