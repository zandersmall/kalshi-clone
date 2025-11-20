import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Market {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
}

interface MarketOption {
  id: string;
  title: string;
  current_probability: number;
}

const Market = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [market, setMarket] = useState<Market | null>(null);
  const [options, setOptions] = useState<MarketOption[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<"Yes" | "No">("Yes");
  const [quantity, setQuantity] = useState<string>("10");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchMarket();
  }, [id]);

  const fetchMarket = async () => {
    const { data: marketData } = await supabase
      .from("markets")
      .select("*")
      .eq("id", id)
      .single();

    if (marketData) {
      setMarket(marketData);
    }

    const { data: optionsData } = await supabase
      .from("market_options")
      .select("*")
      .eq("market_id", id);

    if (optionsData) {
      setOptions(optionsData);
    }
  };

  const handleTrade = async () => {
    if (!user) {
      toast.error("Please sign in to trade");
      navigate("/auth");
      return;
    }

    const shares = parseInt(quantity);
    if (isNaN(shares) || shares <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setLoading(true);

    try {
      const option = options.find(o => o.title === selectedOutcome);
      if (!option) return;

      const pricePerShare = parseFloat(option.current_probability.toString()) / 100;
      const totalCost = shares * pricePerShare;

      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        toast.error("Profile not found");
        return;
      }

      const currentBalance = parseFloat(profile.balance.toString());
      if (currentBalance < totalCost) {
        toast.error("Insufficient balance");
        return;
      }

      const { error: positionError } = await supabase
        .from("positions")
        .insert({
          user_id: user.id,
          market_id: market!.id,
          option_id: option.id,
          outcome: selectedOutcome,
          quantity: shares,
          price_per_share: pricePerShare,
          total_cost: totalCost,
        });

      if (positionError) throw positionError;

      const { error: balanceError } = await supabase
        .from("profiles")
        .update({ balance: currentBalance - totalCost })
        .eq("id", user.id);

      if (balanceError) throw balanceError;

      toast.success(`Successfully bought ${shares} ${selectedOutcome} shares!`);
      setQuantity("10");
    } catch (error) {
      toast.error("Failed to complete trade");
    } finally {
      setLoading(false);
    }
  };

  if (!market) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  const yesOption = options.find(o => o.title === "Yes");
  const noOption = options.find(o => o.title === "No");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-6xl">{market.icon}</div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">{market.category}</div>
                <h1 className="text-3xl font-bold">{market.title}</h1>
              </div>
            </div>

            <Card className="p-6 mb-6">
              <h2 className="font-semibold mb-4">About this market</h2>
              <p className="text-muted-foreground">{market.description}</p>
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold mb-4">Probability Chart</h2>
              <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                <div className="text-center text-muted-foreground">
                  <div className="mb-2">Current Odds</div>
                  <div className="flex gap-8">
                    <div>
                      <div className="text-4xl font-bold text-yes">{yesOption?.current_probability}%</div>
                      <div className="text-sm">Yes</div>
                    </div>
                    <div>
                      <div className="text-4xl font-bold text-no">{noOption?.current_probability}%</div>
                      <div className="text-sm">No</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div>
            <Card className="p-6 sticky top-24">
              <h2 className="font-semibold mb-4">Trade</h2>
              
              <Tabs value={selectedOutcome} onValueChange={(v) => setSelectedOutcome(v as "Yes" | "No")} className="mb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="Yes" className="data-[state=active]:bg-yes data-[state=active]:text-white">
                    Yes {yesOption?.current_probability}¢
                  </TabsTrigger>
                  <TabsTrigger value="No" className="data-[state=active]:bg-no data-[state=active]:text-white">
                    No {noOption?.current_probability}¢
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Shares</label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="1"
                    placeholder="Enter quantity"
                  />
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price per share</span>
                    <span className="font-semibold">
                      ${selectedOutcome === "Yes" 
                        ? (yesOption!.current_probability / 100).toFixed(2)
                        : (noOption!.current_probability / 100).toFixed(2)
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total cost</span>
                    <span className="font-semibold">
                      ${((parseInt(quantity) || 0) * 
                        (selectedOutcome === "Yes" 
                          ? yesOption!.current_probability / 100
                          : noOption!.current_probability / 100
                        )).toFixed(2)
                      }
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleTrade}
                  disabled={loading || !user}
                  className={`w-full ${
                    selectedOutcome === "Yes"
                      ? "bg-yes hover:bg-yes/90"
                      : "bg-no hover:bg-no/90"
                  }`}
                >
                  {loading ? "Processing..." : user ? `Buy ${selectedOutcome}` : "Sign in to trade"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Market;
