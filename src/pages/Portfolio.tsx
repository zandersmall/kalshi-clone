import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { User } from "@supabase/supabase-js";

interface Position {
  id: string;
  market_title: string;
  outcome: string;
  quantity: number;
  price_per_share: number;
  total_cost: number;
  created_at: string;
}

const Portfolio = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchPortfolio();
    }
  }, [user]);

  const fetchPortfolio = async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", user.id)
      .maybeSingle();

    if (profileData) {
      setBalance(parseFloat(profileData.balance.toString()));
    }

    const { data: positionsData } = await supabase
      .from("positions")
      .select(`
        id,
        outcome,
        quantity,
        price_per_share,
        total_cost,
        created_at,
        markets!inner(title)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (positionsData) {
      const formattedPositions = positionsData.map((p: any) => ({
        id: p.id,
        market_title: p.markets.title,
        outcome: p.outcome,
        quantity: p.quantity,
        price_per_share: parseFloat(p.price_per_share),
        total_cost: parseFloat(p.total_cost),
        created_at: p.created_at,
      }));
      setPositions(formattedPositions);
    }

    setLoading(false);
  };

  const totalInvested = positions.reduce((sum, p) => sum + p.total_cost, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">My Portfolio</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Cash Balance</div>
            <div className="text-3xl font-bold text-primary">
              ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Total Invested</div>
            <div className="text-3xl font-bold">
              ${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Total Positions</div>
            <div className="text-3xl font-bold">{positions.length}</div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Active Positions</h2>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : positions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No positions yet. Start trading to see your portfolio!
            </div>
          ) : (
            <div className="space-y-4">
              {positions.map((position) => (
                <div
                  key={position.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-semibold">{position.market_title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {position.quantity} shares @ ${position.price_per_share.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${
                      position.outcome === 'Yes' ? 'text-yes' : 'text-no'
                    }`}>
                      {position.outcome}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${position.total_cost.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default Portfolio;
