import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import MarketCard from "@/components/MarketCard";

interface Market {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  options: Array<{
    id: string;
    title: string;
    current_probability: number;
  }>;
}

const Index = () => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", "Politics", "Crypto", "Tech & Science", "Culture", "Climate"];

  useEffect(() => {
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    const { data: marketsData } = await supabase
      .from("markets")
      .select(`
        id,
        title,
        description,
        category,
        icon,
        market_options (
          id,
          title,
          current_probability
        )
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (marketsData) {
      const formattedMarkets = marketsData.map((m: any) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        category: m.category,
        icon: m.icon,
        options: m.market_options,
      }));
      setMarkets(formattedMarkets);
    }
  };

  const filteredMarkets = selectedCategory === "All"
    ? markets
    : markets.filter(m => m.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Paper Trading Markets</h1>
          <p className="text-muted-foreground">
            Trade on real-world events with fake money. Track your performance risk-free.
          </p>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMarkets.map((market) => {
            const yesOption = market.options.find(o => o.title === "Yes");
            const noOption = market.options.find(o => o.title === "No");
            
            return (
              <MarketCard
                key={market.id}
                id={market.id}
                title={market.title}
                icon={market.icon}
                category={market.category}
                yesProb={yesOption?.current_probability || 50}
                noProb={noOption?.current_probability || 50}
              />
            );
          })}
        </div>

        {filteredMarkets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No markets found in this category</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
