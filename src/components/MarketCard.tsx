import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";

interface MarketCardProps {
  id: string;
  title: string;
  icon: string;
  category: string;
  yesProb: number;
  noProb: number;
}

const MarketCard = ({ id, title, icon, category, yesProb, noProb }: MarketCardProps) => {
  return (
    <Link to={`/market/${id}`}>
      <Card className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-border bg-card">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground mb-1">{category}</div>
            <h3 className="font-semibold text-foreground mb-3 line-clamp-2">{title}</h3>
            
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
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default MarketCard;
