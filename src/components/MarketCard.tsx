import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";

interface MarketCardProps {
  id: string;
  title: string;
  icon: string;
  category: string;
  yesProb?: number;
  noProb?: number;
  options?: Array<{ title: string; current_probability: number }>;
}

const MarketCard = ({ id, title, icon, category, yesProb, noProb, options }: MarketCardProps) => {
  // Determine display mode: Binary (Yes/No) or Multi-Outcome
  const isBinary = yesProb !== undefined && noProb !== undefined && (!options || options.length <= 2);

  return (
    <Link to={`/market/${id}`}>
      <Card className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-border bg-card h-full flex flex-col">
        <div className="flex items-start gap-4 mb-auto">
          <div className="text-4xl">{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground mb-1">{category}</div>
            <h3 className="font-semibold text-foreground mb-3 line-clamp-2">{title}</h3>
          </div>
        </div>
            
        <div className="mt-4">
          {isBinary ? (
            <div className="flex gap-2">
              <div className="flex-1 bg-yes/10 border border-yes/20 rounded-lg px-3 py-2 text-center">
                <div className="text-xs text-yes mb-1">Yes</div>
                <div className="font-bold text-yes">{yesProb}¢</div>
              </div>
              <div className="flex-1 bg-no/10 border border-no/20 rounded-lg px-3 py-2 text-center">
                <div className="text-xs text-no mb-1">No</div>
                <div className="font-bold text-no">{noProb}¢</div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {options?.slice(0, 2).map((opt, idx) => (
                <div key={idx} className="flex justify-between items-center bg-muted/30 p-2 rounded text-sm">
                  <span className="truncate flex-1 mr-2">{opt.title}</span>
                  <span className="font-bold">{opt.current_probability}%</span>
                </div>
              ))}
              {(options?.length || 0) > 2 && (
                <div className="text-xs text-muted-foreground text-center">
                  + {(options?.length || 0) - 2} more options
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
};

export default MarketCard;
